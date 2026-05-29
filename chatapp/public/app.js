// Local-first chat client.
// - IndexedDB stores messages + per-user sync cursor so history works offline.
// - WebSocket is the realtime path; an outbox queues sends while offline.
// - BroadcastChannel keeps multiple tabs of the same user in sync.

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------
const DB_NAME = 'chatapp';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // messages: keyed by composite local key "from|clientId" so optimistic
      // inserts can later be reconciled with the server-assigned serverId.
      const messages = db.createObjectStore('messages', { keyPath: 'localKey' });
      messages.createIndex('byPeer', ['owner', 'peer', 'createdAt']);
      messages.createIndex('byServerId', ['owner', 'serverId']);
      messages.createIndex('byOutbox', ['owner', 'status']); // status: 'pending' | 'sent' | 'delivered'
      db.createObjectStore('meta', { keyPath: 'key' }); // { key: `cursor:${owner}`, value }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise;
function db() { return dbPromise || (dbPromise = openDB()); }

function tx(store, mode = 'readonly') {
  return db().then((d) => d.transaction(store, mode).objectStore(store));
}
function reqP(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

async function putMessage(m) { return reqP((await tx('messages', 'readwrite')).put(m)); }
async function getMessageByServerId(owner, serverId) {
  const idx = (await tx('messages')).index('byServerId');
  return reqP(idx.get([owner, serverId]));
}
async function getMessageByLocalKey(localKey) { return reqP((await tx('messages')).get(localKey)); }
async function deleteMessage(localKey) { return reqP((await tx('messages', 'readwrite')).delete(localKey)); }

async function listConversation(owner, peer) {
  const idx = (await tx('messages')).index('byPeer');
  const range = IDBKeyRange.bound([owner, peer, -Infinity], [owner, peer, Infinity]);
  return reqP(idx.getAll(range));
}
async function listAllForOwner(owner) {
  const store = await tx('messages');
  return new Promise((res, rej) => {
    const out = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return res(out);
      if (cur.value.owner === owner) out.push(cur.value);
      cur.continue();
    };
    req.onerror = () => rej(req.error);
  });
}
async function listOutbox(owner) {
  const idx = (await tx('messages')).index('byOutbox');
  return reqP(idx.getAll(IDBKeyRange.only([owner, 'pending'])));
}
async function getCursor(owner) {
  const r = await reqP((await tx('meta')).get(`cursor:${owner}`));
  return r ? r.value : 0;
}
async function setCursor(owner, value) {
  return reqP((await tx('meta', 'readwrite')).put({ key: `cursor:${owner}`, value }));
}

// ---------------------------------------------------------------------------
// State + events
// ---------------------------------------------------------------------------
const state = {
  me: null,
  peer: null,
  ws: null,
  connected: false,
  reconnectDelay: 500,
  bc: null, // BroadcastChannel
};

const bus = new EventTarget();
function emit(type, detail) { bus.dispatchEvent(new CustomEvent(type, { detail })); }

function localKey(owner, from, clientId) { return `${owner}|${from}|${clientId}`; }
function newClientId() {
  return (crypto.randomUUID?.() ?? `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

// ---------------------------------------------------------------------------
// WebSocket transport (with auto-reconnect)
// ---------------------------------------------------------------------------
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  state.ws = ws;

  ws.addEventListener('open', async () => {
    state.connected = true;
    state.reconnectDelay = 500;
    emit('status', { online: true });
    ws.send(JSON.stringify({ type: 'hello', userId: state.me }));
    const since = await getCursor(state.me);
    ws.send(JSON.stringify({ type: 'sync', since }));
    drainOutbox();
  });

  ws.addEventListener('message', (ev) => {
    let msg; try { msg = JSON.parse(ev.data); } catch { return; }
    handleServerMessage(msg).catch((e) => console.error('handle error', e));
  });

  ws.addEventListener('close', () => {
    state.connected = false;
    emit('status', { online: false });
    setTimeout(connect, state.reconnectDelay);
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 10_000);
  });
  ws.addEventListener('error', () => { try { ws.close(); } catch {} });
}

async function handleServerMessage(msg) {
  switch (msg.type) {
    case 'welcome': return;

    case 'sent': {
      // Reconcile optimistic local row with assigned serverId.
      const lk = localKey(state.me, state.me, msg.clientId);
      const existing = await getMessageByLocalKey(lk);
      if (existing) {
        existing.serverId = msg.serverId;
        existing.status = 'sent';
        existing.createdAt = msg.createdAt;
        await putMessage(existing);
        await bumpCursor(msg.serverId);
        emit('message:updated', existing);
        broadcast({ type: 'updated', message: existing });
      }
      return;
    }

    case 'message': {
      // Inbound (or echo of own send on another tab).
      await ingestServerMessage(msg);
      return;
    }

    case 'sync': {
      for (const m of msg.messages) await ingestServerMessage(m);
      return;
    }

    case 'error':
      console.warn('server error:', msg.message);
      return;
  }
}

async function ingestServerMessage(m) {
  // m: { id, from, to, body, createdAt }
  const owner = state.me;
  const peer = m.from === owner ? m.to : m.from;
  const existing = await getMessageByServerId(owner, m.id);
  const row = existing || {
    localKey: `${owner}|srv|${m.id}`,
    owner, peer,
    from: m.from, to: m.to,
    body: m.body, createdAt: m.createdAt,
    serverId: m.id, status: 'delivered',
  };
  if (existing) {
    row.body = m.body;
    row.createdAt = m.createdAt;
    row.status = 'delivered';
  }
  await putMessage(row);
  await bumpCursor(m.id);
  emit('message:received', row);
  broadcast({ type: 'received', message: row });
}

async function bumpCursor(serverId) {
  const cur = await getCursor(state.me);
  if (serverId > cur) await setCursor(state.me, serverId);
}

// ---------------------------------------------------------------------------
// Outbox
// ---------------------------------------------------------------------------
async function enqueueSend({ to, body }) {
  const clientId = newClientId();
  const createdAt = Date.now();
  const row = {
    localKey: localKey(state.me, state.me, clientId),
    owner: state.me, peer: to,
    from: state.me, to, body, createdAt,
    clientId, status: 'pending',
  };
  await putMessage(row);
  emit('message:received', row);
  broadcast({ type: 'received', message: row });
  drainOutbox();
  return row;
}

async function drainOutbox() {
  if (!state.connected || !state.me) return;
  const pending = await listOutbox(state.me);
  pending.sort((a, b) => a.createdAt - b.createdAt);
  for (const m of pending) {
    try {
      state.ws.send(JSON.stringify({
        type: 'send', clientId: m.clientId, to: m.to, body: m.body, createdAt: m.createdAt,
      }));
    } catch (e) {
      console.warn('send failed, will retry on reconnect:', e);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-tab sync
// ---------------------------------------------------------------------------
function setupBroadcast() {
  if (!('BroadcastChannel' in window)) return;
  state.bc = new BroadcastChannel(`chatapp:${state.me}`);
  state.bc.onmessage = (ev) => {
    const { type, message } = ev.data || {};
    if (type === 'received' || type === 'updated') emit('message:received', message);
  };
}
function broadcast(payload) { state.bc?.postMessage(payload); }

window.addEventListener('online',  () => { if (!state.connected) connect(); });
window.addEventListener('offline', () => emit('status', { online: false }));

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const loginEl = $('login');
const appEl = $('app');
const meInput = $('me');
const enterBtn = $('enter');
const meLabel = $('meLabel');
const statusEl = $('status');
const peerInput = $('peerInput');
const openPeerBtn = $('openPeer');
const convList = $('conversations');
const peerLabel = $('peerLabel');
const messagesEl = $('messages');
const bodyInput = $('body');
const sendBtn = $('sendBtn');
const composer = $('composer');

const LAST_USER_KEY = 'chatapp:lastUser';

enterBtn.addEventListener('click', () => {
  const v = meInput.value.trim().toLowerCase();
  if (!v) return;
  localStorage.setItem(LAST_USER_KEY, v);
  start(v);
});
meInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enterBtn.click(); });

openPeerBtn.addEventListener('click', () => {
  const p = peerInput.value.trim().toLowerCase();
  if (!p || p === state.me) return;
  peerInput.value = '';
  selectPeer(p);
  refreshConversations();
});
peerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPeerBtn.click(); });

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = bodyInput.value.trim();
  if (!body || !state.peer) return;
  bodyInput.value = '';
  await enqueueSend({ to: state.peer, body });
});

bus.addEventListener('status', (e) => {
  const online = e.detail.online;
  statusEl.textContent = online ? 'online' : 'offline';
  statusEl.classList.toggle('online', online);
  statusEl.classList.toggle('offline', !online);
});

bus.addEventListener('message:received', (e) => {
  const m = e.detail;
  if (m.owner !== state.me) return;
  if (m.peer === state.peer) appendMessage(m);
  refreshConversations();
});
bus.addEventListener('message:updated', () => refreshConversations());

function start(me) {
  state.me = me;
  loginEl.classList.add('hidden');
  appEl.classList.remove('hidden');
  meLabel.textContent = me;
  setupBroadcast();
  connect();
  refreshConversations();
}

async function refreshConversations() {
  const all = await listAllForOwner(state.me);
  // Group by peer, get latest preview.
  const byPeer = new Map();
  for (const m of all) {
    const prev = byPeer.get(m.peer);
    if (!prev || prev.createdAt < m.createdAt) byPeer.set(m.peer, m);
  }
  const items = [...byPeer.entries()].sort((a, b) => b[1].createdAt - a[1].createdAt);
  if (state.peer && !byPeer.has(state.peer)) items.unshift([state.peer, null]);

  convList.innerHTML = '';
  for (const [peer, last] of items) {
    const li = document.createElement('li');
    if (peer === state.peer) li.classList.add('active');
    const preview = last ? last.body : '(new conversation)';
    li.innerHTML = `<span class="peer"></span><span class="preview"></span>`;
    li.children[0].textContent = peer;
    li.children[1].textContent = preview;
    li.addEventListener('click', () => selectPeer(peer));
    convList.appendChild(li);
  }
}

async function selectPeer(peer) {
  state.peer = peer;
  peerLabel.textContent = peer;
  bodyInput.disabled = false;
  sendBtn.disabled = false;
  bodyInput.focus();
  await renderConversation();
  refreshConversations();
}

async function renderConversation() {
  messagesEl.innerHTML = '';
  const rows = await listConversation(state.me, state.peer);
  rows.sort((a, b) => a.createdAt - b.createdAt);
  for (const m of rows) appendMessage(m, /*scroll*/ false);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(m, scroll = true) {
  // De-dupe in DOM
  const id = `m_${m.localKey}`;
  let li = document.getElementById(id);
  if (!li) {
    li = document.createElement('li');
    li.id = id;
    messagesEl.appendChild(li);
  }
  li.className = m.from === state.me ? 'out' : 'in';
  if (m.status === 'pending') li.classList.add('pending');
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusLabel = m.from === state.me ? (m.status === 'pending' ? ' · sending' : ' · sent') : '';
  li.innerHTML = `<span class="body"></span><span class="meta"></span>`;
  li.children[0].textContent = m.body;
  li.children[1].textContent = `${time}${statusLabel}`;
  if (scroll) messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Auto-resume if a username was already chosen on this device.
const last = localStorage.getItem(LAST_USER_KEY);
if (last) { meInput.value = last; }
