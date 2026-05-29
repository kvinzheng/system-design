# Chat App (Messenger-style)

Local-first 1:1 chat. Realtime over WebSocket, durable on the server with SQLite,
and durable on the client with IndexedDB so history and composing keep working offline.

## Run

```bash
npm install
npm start
# open http://localhost:3000 in two tabs/windows, sign in as different usernames
```

In one tab sign in as `alice`, in another as `bob`. Type `bob` into Alice's
"Chat with username…" box (and vice versa) to open the conversation.

## Architecture

- **Transport** — single WebSocket at `/ws`. Messages are JSON; the protocol is
  documented at the top of [server/index.js](server/index.js).
- **Server store** — SQLite via `better-sqlite3`. Messages are unique on
  `(from_user, client_id)` so retries from the outbox are idempotent.
- **Client store** — IndexedDB (`messages`, `meta`). Each row carries an
  `owner` (the signed-in user on this device) plus `peer`, so the same browser
  profile can host multiple users without leaking history between them.
- **Optimistic send** — `enqueueSend` writes a `pending` row locally and renders
  it immediately. When the server returns `sent`, the local row is reconciled
  with the assigned `serverId` and marked `sent`.
- **Offline / reconnect** — on every WebSocket `open` the client sends a `sync`
  with its highest seen `serverId`. The server replays everything newer for that
  user, then the client drains its outbox.
- **Cross-tab** — `BroadcastChannel('chatapp:<user>')` mirrors new/updated
  messages between tabs of the same user so both views stay consistent without
  a server round-trip.
