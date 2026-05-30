# Email Client

A desktop-style email client (think Outlook / Apple Mail) implemented as a React frontend talking to a Node/Express backend that stubs an email provider's SMTP/IMAP service.

## Features
- 3-pane layout: folders / message list / reading pane
- Folders: Inbox, Sent, Drafts, Outbox, Trash
- Compose modal with To / Subject / Body
- Threading by normalized subject
- Search across subject, body, and sender
- Offline-aware:
  - Online status indicator (toggle to simulate offline)
  - Messages composed while offline land in the **Outbox** and flush automatically when online
  - Last-fetched messages remain browsable from local store
- Mark read / unread, move to Trash, delete

## Run

```bash
# terminal 1
cd backend && npm install && npm start

# terminal 2
cd frontend && npm install && npm start
# open http://localhost:3001
```

The frontend runs on port **3001** to avoid colliding with `fb-news-feed` (3000). Backend on **4001**.

## Architecture

```
React (3001) ──HTTP──► Express provider (4001) ──► SQLite (mock SMTP/IMAP store)
       │
       └── localStorage (outbox queue + last-seen cache for offline)
```

- Backend simulates SMTP by appending to the `Sent` folder of the sender's account on `POST /messages/send`.
- Backend simulates IMAP fetch via `GET /messages?folder=...` with cursor pagination on `receivedAt`.
- Frontend `outbox.js` queues compose actions when offline and drains on reconnect.
