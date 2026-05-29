/**
 * HTTP + WebSocket server.
 * - REST: create / list document metadata (in-memory map; swap for real DB in prod).
 * - WS:   /yjs/:roomname  — Yjs sync protocol relay with LevelDB persistence.
 */
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { setupWSConnection, setPersistence, docs } from './yjs-ws.js';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 1234;

// ---------- Persistence: LevelDB ----------
const ldb = new LeveldbPersistence(path.join(__dirname, '..', 'db'));

setPersistence({
  bindState: async (docName, ydoc) => {
    const persisted = await ldb.getYDoc(docName);
    const newUpdates = Y.encodeStateAsUpdate(ydoc);
    await ldb.storeUpdate(docName, newUpdates);
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted));
    ydoc.on('update', (update) => {
      ldb.storeUpdate(docName, update);
    });
  },
  writeState: async (_docName, _ydoc) => {
    // Periodic flush handled per-update above.
  }
});

// ---------- Document metadata store (swap for Postgres in prod) ----------
const documents = new Map(); // id -> { id, title, createdAt, updatedAt }

function createDoc(title = 'Untitled document') {
  const id = nanoid(10);
  const now = Date.now();
  const meta = { id, title, createdAt: now, updatedAt: now };
  documents.set(id, meta);
  return meta;
}

// ---------- HTTP ----------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openRooms: docs.size });
});

app.get('/api/documents', (_req, res) => {
  res.json(Array.from(documents.values()).sort((a, b) => b.updatedAt - a.updatedAt));
});

app.post('/api/documents', (req, res) => {
  const meta = createDoc(req.body?.title);
  res.status(201).json(meta);
});

app.get('/api/documents/:id', (req, res) => {
  let meta = documents.get(req.params.id);
  // Allow opening any id directly (e.g. shared link to a not-yet-listed doc).
  if (!meta) {
    meta = { id: req.params.id, title: 'Untitled document', createdAt: Date.now(), updatedAt: Date.now() };
    documents.set(meta.id, meta);
  }
  res.json(meta);
});

app.patch('/api/documents/:id', (req, res) => {
  const meta = documents.get(req.params.id);
  if (!meta) return res.status(404).json({ error: 'not found' });
  if (typeof req.body?.title === 'string') meta.title = req.body.title;
  meta.updatedAt = Date.now();
  res.json(meta);
});

// ---------- HTTP + WS server ----------
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (conn, req) => {
  // URL format: /yjs/<roomname>
  const url = new URL(req.url, 'http://localhost');
  const roomname = decodeURIComponent(url.pathname.replace(/^\/yjs\//, '')) || 'default';
  setupWSConnection(conn, req, { docName: roomname, gc: true });
});

server.on('upgrade', (request, socket, head) => {
  // TODO: auth here — verify token / cookie before accepting upgrade.
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => {
  console.log(`[server] HTTP + WS listening on http://localhost:${PORT}`);
});
