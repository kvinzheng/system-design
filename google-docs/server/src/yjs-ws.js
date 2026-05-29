/**
 * Yjs WebSocket sync handler.
 *
 * Adapted from the canonical `y-websocket/bin/utils.js` implementation.
 * Kept inline (rather than importing from y-websocket) so we have a stable
 * surface to extend with auth, rate limiting, metrics, etc.
 *
 * Protocol summary (binary frames):
 *  - messageSync (0): step1 (state vector) / step2 (diff update) / update broadcast
 *  - messageAwareness (1): ephemeral presence (cursors, names, colors)
 */
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';

const messageSync = 0;
const messageAwareness = 1;

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

const pingTimeout = 30000;

/** @type {Map<string, WSSharedDoc>} */
export const docs = new Map();

let persistence = null;
export const setPersistence = (p) => { persistence = p; };

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map(); // conn -> Set<clientID>
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated, removed);
      if (origin !== null) {
        const connControlledIDs = this.conns.get(origin);
        if (connControlledIDs !== undefined) {
          added.forEach((c) => connControlledIDs.add(c));
          removed.forEach((c) => connControlledIDs.delete(c));
        }
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => send(this, c, buff));
    });

    this.on('update', (update, _origin, doc) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      doc.conns.forEach((_, c) => send(doc, c, message));
    });
  }
}

function getYDoc(docname, gc = true) {
  return map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (persistence !== null) {
      persistence.bindState(docname, doc);
    }
    docs.set(docname, doc);
    return doc;
  });
}

function messageListener(conn, doc, message) {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness:
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
    }
  } catch (err) {
    console.error('[yjs] message error', err);
    doc.emit('error', [err]);
  }
}

function closeConn(doc, conn) {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    if (doc.conns.size === 0 && persistence !== null) {
      // Doc has no more connections — could persist + unload here.
      // For now we keep it in memory for fast re-join.
    }
  }
  try { conn.close(); } catch (_) {}
}

function send(doc, conn, m) {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => { if (err != null) closeConn(doc, conn); });
  } catch (_) {
    closeConn(doc, conn);
  }
}

export function setupWSConnection(conn, _req, { docName = 'default', gc = true } = {}) {
  conn.binaryType = 'arraybuffer';
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());

  conn.on('message', (message) => messageListener(conn, doc, new Uint8Array(message)));

  // Heartbeat
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) closeConn(doc, conn);
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try { conn.ping(); } catch (_) { closeConn(doc, conn); clearInterval(pingInterval); }
    }
  }, pingTimeout);

  conn.on('close', () => { closeConn(doc, conn); clearInterval(pingInterval); });
  conn.on('pong', () => { pongReceived = true; });

  // Send sync step 1 + current awareness state immediately.
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder2 = encoding.createEncoder();
      encoding.writeVarUint(encoder2, messageAwareness);
      encoding.writeVarUint8Array(
        encoder2,
        awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
      );
      send(doc, conn, encoding.toUint8Array(encoder2));
    }
  }
}
