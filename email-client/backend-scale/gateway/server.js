// GATEWAY — the WebSocket layer.
//
// Each gateway pod has an identity (GATEWAY_ID). It does three jobs:
//   1. Accept WS connections; on connect, write `presence:{uid} = GATEWAY_ID`
//      to Redis with a TTL so fanout knows where the user lives.
//   2. Consume `notif.gateway.{GATEWAY_ID}` from Kafka and push every event
//      to the matching socket(s) in this pod's local map.
//   3. On reconnect, drain `notif.inbox` from the user's last-seen offset so
//      they catch up on missed messages.
//
// Add more gateway pods → linear capacity. Each holds 50k–100k sockets.

const http = require('http');
const { WebSocketServer } = require('ws');
const { makeConsumer } = require('../shared/kafka');
const { redis } = require('../shared/redis');

const GATEWAY_ID = process.env.GATEWAY_ID || 'g1';
const PORT       = parseInt(process.env.PORT) || 4101;
const PRESENCE_TTL_S = 60;
const HEARTBEAT_MS = 20_000;

// Map<accountId, Set<WebSocket>>  — multiple tabs/devices per user is normal.
const connections = new Map();

// ─── HTTP + WS server ────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const accountId = url.searchParams.get('accountId');
  if (!accountId) { ws.close(1008, 'accountId required'); return; }

  // Track locally.
  if (!connections.has(accountId)) connections.set(accountId, new Set());
  connections.get(accountId).add(ws);

  // Announce presence to Redis.
  await redis.set(`presence:${accountId}`, GATEWAY_ID, 'EX', PRESENCE_TTL_S);

  // Drain any messages that landed while they were offline.
  await drainInbox(accountId, ws);

  // Heartbeat refresh on presence TTL.
  const beat = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    redis.expire(`presence:${accountId}`, PRESENCE_TTL_S).catch(() => {});
    ws.ping();
  }, HEARTBEAT_MS);

  ws.on('close', async () => {
    clearInterval(beat);
    const set = connections.get(accountId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        connections.delete(accountId);
        await redis.del(`presence:${accountId}`).catch(() => {});
      }
    }
  });

  ws.send(JSON.stringify({ type: 'hello', gateway: GATEWAY_ID, accountId }));
  console.log(`[gateway:${GATEWAY_ID}] connect ${accountId} (now ${connections.size} users)`);
});

// ─── Inbox drain — read this user's missed messages from compacted topic ─────
//
// In production you'd track per-user offsets (e.g. Redis: `inbox:offset:{uid}`),
// seek the consumer to that offset, replay, then commit. For the demo we use
// a lightweight Redis Stream instead — Kafka's per-key seek API is overkill
// at this scale and Streams have first-class XRANGE support.
async function drainInbox(accountId, ws) {
  const key = `inbox:${accountId}`;
  const items = await redis.xrange(key, '-', '+', 'COUNT', 50).catch(() => []);
  for (const [, fields] of items) {
    const i = fields.indexOf('payload');
    if (i >= 0 && ws.readyState === ws.OPEN) {
      ws.send(fields[i + 1]);
    }
  }
  if (items.length) {
    // Ack: trim everything we just sent.
    await redis.xtrim(key, 'MAXLEN', 0).catch(() => {});
    console.log(`[gateway:${GATEWAY_ID}] drained ${items.length} from inbox:${accountId}`);
  }
}

// ─── Kafka consumer — read events targeted at THIS gateway ───────────────────
const consumer = makeConsumer(`gateway-${GATEWAY_ID}`);

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: `notif.gateway.${GATEWAY_ID}`, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const evt = JSON.parse(message.value.toString());
      const sockets = connections.get(evt.accountId);
      if (!sockets || sockets.size === 0) {
        // User raced offline between fanout's presence read and now.
        // Persist to inbox so they get it on reconnect.
        await redis.xadd(
          `inbox:${evt.accountId}`, 'MAXLEN', '~', '1000',
          '*', 'payload', JSON.stringify(evt),
        );
        return;
      }
      const payload = JSON.stringify({ type: 'mail:new', ...evt });
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) ws.send(payload);
      }
    },
  });
  console.log(`[gateway:${GATEWAY_ID}] kafka consumer started → notif.gateway.${GATEWAY_ID}`);
}

server.listen(PORT, () => {
  console.log(`[gateway:${GATEWAY_ID}] listening ws://localhost:${PORT}/ws`);
  startConsumer().catch((e) => { console.error(e); process.exit(1); });
});

process.on('SIGTERM', async () => { await consumer.disconnect(); process.exit(0); });
process.on('SIGINT',  async () => { await consumer.disconnect(); process.exit(0); });
