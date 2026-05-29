// Chat server: HTTP + WebSocket, SQLite persistence.
// Protocol (JSON over WS):
//   client -> server:
//     { type: 'hello', userId }
//     { type: 'send', clientId, to, body, createdAt }
//     { type: 'ack',  ids: [serverId, ...] }            // mark delivered/read
//     { type: 'sync', since }                            // fetch messages since cursor
//   server -> client:
//     { type: 'welcome', userId, serverTime }
//     { type: 'sent',    clientId, serverId, createdAt } // ack of own send
//     { type: 'message', id, from, to, body, createdAt } // inbound
//     { type: 'sync',    messages: [...] }               // result of sync
//     { type: 'error',   message }

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'chat.db');

// ---------- DB ----------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    from_user TEXT NOT NULL,
    to_user   TEXT NOT NULL,
    body      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(from_user, client_id)
  );
  CREATE INDEX IF NOT EXISTS idx_msg_to_id ON messages(to_user, id);
  CREATE INDEX IF NOT EXISTS idx_msg_pair  ON messages(from_user, to_user, id);
`);

const stmt = {
  upsertUser: db.prepare(`INSERT OR IGNORE INTO users(id) VALUES (?)`),
  insertMsg: db.prepare(`
    INSERT INTO messages (client_id, from_user, to_user, body, created_at)
    VALUES (@clientId, @from, @to, @body, @createdAt)
  `),
  findByClientId: db.prepare(`
    SELECT id, client_id AS clientId, from_user AS "from", to_user AS "to", body, created_at AS createdAt
    FROM messages WHERE from_user = ? AND client_id = ?
  `),
  messagesSince: db.prepare(`
    SELECT id, from_user AS "from", to_user AS "to", body, created_at AS createdAt
    FROM messages
    WHERE (to_user = @user OR from_user = @user) AND id > @since
    ORDER BY id ASC
    LIMIT 500
  `),
};

function saveMessage({ clientId, from, to, body, createdAt }) {
  stmt.upsertUser.run(from);
  stmt.upsertUser.run(to);
  // Idempotent on (from, clientId)
  if (clientId) {
    const existing = stmt.findByClientId.get(from, clientId);
    if (existing) return existing;
  }
  const info = stmt.insertMsg.run({ clientId, from, to, body, createdAt });
  return { id: info.lastInsertRowid, clientId, from, to, body, createdAt };
}

// ---------- HTTP ----------
const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server, path: '/ws' });

// userId -> Set<WebSocket>
const sockets = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}
function broadcastToUser(userId, msg) {
  const set = sockets.get(userId);
  if (!set) return;
  for (const ws of set) send(ws, msg);
}

wss.on('connection', (ws) => {
  ws.userId = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return send(ws, { type: 'error', message: 'bad json' }); }

    try {
      switch (msg.type) {
        case 'hello': {
          const userId = String(msg.userId || '').trim();
          if (!userId) return send(ws, { type: 'error', message: 'userId required' });
          ws.userId = userId;
          stmt.upsertUser.run(userId);
          if (!sockets.has(userId)) sockets.set(userId, new Set());
          sockets.get(userId).add(ws);
          send(ws, { type: 'welcome', userId, serverTime: Date.now() });
          break;
        }
        case 'send': {
          if (!ws.userId) return send(ws, { type: 'error', message: 'not authenticated' });
          const { clientId, to, body } = msg;
          if (!to || !body) return send(ws, { type: 'error', message: 'to and body required' });
          const createdAt = Number(msg.createdAt) || Date.now();
          const saved = saveMessage({ clientId, from: ws.userId, to: String(to), body: String(body), createdAt });
          // Ack to sender (all of sender's tabs)
          broadcastToUser(ws.userId, { type: 'sent', clientId, serverId: saved.id, createdAt: saved.createdAt, to: saved.to, body: saved.body });
          // Deliver to recipient
          broadcastToUser(String(to), {
            type: 'message',
            id: saved.id, from: ws.userId, to: String(to),
            body: saved.body, createdAt: saved.createdAt,
          });
          break;
        }
        case 'sync': {
          if (!ws.userId) return send(ws, { type: 'error', message: 'not authenticated' });
          const since = Number(msg.since) || 0;
          const rows = stmt.messagesSince.all({ user: ws.userId, since });
          send(ws, { type: 'sync', messages: rows });
          break;
        }
        default:
          send(ws, { type: 'error', message: `unknown type: ${msg.type}` });
      }
    } catch (err) {
      console.error('ws handler error:', err);
      send(ws, { type: 'error', message: 'server error' });
    }
  });

  ws.on('close', () => {
    if (ws.userId && sockets.has(ws.userId)) {
      sockets.get(ws.userId).delete(ws);
      if (sockets.get(ws.userId).size === 0) sockets.delete(ws.userId);
    }
  });
});

// Heartbeat: drop dead connections
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* noop */ }
  }
}, 30_000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`chat server listening on http://localhost:${PORT}`);
});
