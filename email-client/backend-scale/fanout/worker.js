// FANOUT WORKER — the brain.
//
// Consumes `notif.events`, applies the spam shield + coalesce + presence
// lookup, then either:
//   (a) the user is online   → publish to that user's gateway topic
//   (b) the user is offline  → append to durable `notif.inbox` topic
//
// Scales horizontally: more pods = more partitions consumed in parallel.
// Stateless — all hot-path state lives in Redis. Crashes are safe because
// Kafka tracks our consumer-group offset; on restart we resume.

const { makeConsumer, getProducer } = require('../shared/kafka');
const { redis } = require('../shared/redis');
const { evaluate } = require('../shared/shield');

const SOURCE_TOPIC = 'notif.events';
const INBOX_TOPIC  = 'notif.inbox';
const GROUP_ID = 'fanout-workers';
const COALESCE_WINDOW_S = 5;

const consumer = makeConsumer(GROUP_ID);

async function main() {
  const producer = await getProducer();
  await consumer.connect();
  await consumer.subscribe({ topic: SOURCE_TOPIC, fromBeginning: false });

  let processed = 0, dropped = 0, online = 0, offline = 0;
  setInterval(() => {
    if (processed) console.log(`[fanout] processed=${processed} dropped=${dropped} online=${online} offline=${offline}`);
  }, 5000);

  await consumer.run({
    eachBatchAutoResolve: true,
    eachBatch: async ({ batch, heartbeat, resolveOffset }) => {
      for (const m of batch.messages) {
        const evt = JSON.parse(m.value.toString());
        processed++;

        // ── 1. Spam shield (mute / dedupe / rate-limit, all Redis-backed) ──
        const verdict = await evaluate(evt);
        if (verdict.action === 'drop') {
          dropped++;
          resolveOffset(m.offset);
          continue;
        }
        const out = verdict.action === 'downgrade' ? verdict.input : evt;

        // ── 2. Coalesce by groupKey ──────────────────────────────────────
        // First message wins; later ones in the window get folded into a
        // counter the gateway will read when it actually delivers.
        if (out.groupKey) {
          const ckey = `coalesce:${out.accountId}:${out.groupKey}`;
          const isFirst = await redis.set(ckey, out.id, 'NX', 'EX', COALESCE_WINDOW_S);
          if (!isFirst) {
            await redis.incr(`${ckey}:count`);
            await redis.expire(`${ckey}:count`, COALESCE_WINDOW_S);
            resolveOffset(m.offset);
            continue;
          }
        }

        // ── 3. Route by presence ────────────────────────────────────────
        const gatewayId = await redis.get(`presence:${out.accountId}`);
        if (gatewayId) {
          // Online: hand off to the exact gateway holding this user's socket.
          online++;
          await producer.send({
            topic: `notif.gateway.${gatewayId}`,
            messages: [{ key: out.accountId, value: JSON.stringify(out) }],
          });
        } else {
          // Offline: durable inbox. Gateway drains it on reconnect.
          // Topic is log-compacted + retained 30d. APNS/FCM would be fired
          // here in a real system (omitted for the demo).
          offline++;
          await producer.send({
            topic: INBOX_TOPIC,
            messages: [{ key: out.accountId, value: JSON.stringify(out) }],
          });
        }

        resolveOffset(m.offset);
        await heartbeat();
      }
    },
  });
}

main().catch((err) => { console.error('[fanout]', err); process.exit(1); });

process.on('SIGTERM', async () => { await consumer.disconnect(); process.exit(0); });
process.on('SIGINT',  async () => { await consumer.disconnect(); process.exit(0); });
