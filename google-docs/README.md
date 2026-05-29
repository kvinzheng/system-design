# Google Docs Clone — Real-Time Collaborative Editor

A full-stack collaborative document editor inspired by Google Docs. Built with **React + Yjs (CRDT) + Tiptap** on the client, and a **Node.js + WebSocket** sync server on the backend.

## Why this stack?

| Concern | Solution |
|---|---|
| Responsive local edits | Edits applied to local Yjs doc immediately; UI never blocks on network |
| Real-time peer updates | `y-websocket` broadcasts CRDT updates to all participants |
| Conflict resolution | Yjs CRDT (YATA algorithm) merges concurrent edits deterministically — no central coordinator needed |
| Eventual consistency | CRDTs are mathematically guaranteed to converge |
| Distributed / ad hoc | Participants can drop in/out; missed updates synced on reconnect via state vectors |
| Awareness (cursors, names) | `y-protocols/awareness` — ephemeral presence state |
| Persistence | `y-leveldb` on the server stores doc state; new joiners load full history |
| Scale to 100 editors | WebSocket fan-out per doc room; CRDT update size scales with edit volume, not doc size |

### The "Mary → Hary / My" problem
Alice deletes `r`, `a`. Bob deletes `M`, inserts `H`. With Yjs, each character has a unique stable ID. Deletes target IDs (not positions), and inserts reference neighbor IDs. Concurrent ops commute, so all participants converge to the same result regardless of arrival order. No locks, no rebasing, no transformation matrices.

## Architecture

```
┌──────────────┐    Yjs updates (binary)     ┌────────────────────┐
│  React +     │ ◄──────────────────────────►│  y-websocket       │
│  Tiptap +    │      over WebSocket          │  server +          │
│  Yjs doc     │                              │  LevelDB persist   │
└──────────────┘                              └────────────────────┘
       ▲                                                │
       │ awareness (cursors, user color/name)           │
       └────────────────────────────────────────────────┘
```

- **Document model**: A `Y.Doc` shared between all participants. Tiptap binds to a `Y.XmlFragment` inside it via `y-prosemirror`.
- **Transport**: WebSocket per `roomname` (= document id). Server relays updates and maintains canonical state.
- **Persistence**: LevelDB stores the merged CRDT state; on first connect server replays it to the new client.
- **REST API**: Minimal endpoints to create/list documents (metadata only; content lives in the CRDT).

## Project structure

```
google-docs/
├── client/        # React + Vite + Tiptap + Yjs
└── server/        # Express + y-websocket + LevelDB
```

## Setup

```bash
# from repo root
npm install
npm run dev
```

- Client: http://localhost:5173
- Server (HTTP + WS): http://localhost:1234

## Try it
1. Open http://localhost:5173 and create a document.
2. Copy the URL into a second browser (or incognito tab).
3. Edit in either — changes appear in real time, cursors with colored labels are visible.
4. Kill your network, edit offline, reconnect — Yjs merges your changes cleanly.

## Production notes
- Front horizontal pods with a sticky-by-room load balancer (or use Redis pub/sub adapter for `y-websocket`).
- Replace LevelDB with S3 snapshots + a Redis-backed update log for durability + scale.
- Add auth (JWT) at the WS upgrade handshake; gate document access via ACLs.
- Add a `Y.UndoManager` per client for per-user undo/redo.
