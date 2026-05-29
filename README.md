# system-design

A collection of full-stack reference implementations for common system-design interview problems. Each folder is a self-contained project with its own backend, frontend, and README (where applicable).

## Projects

| Folder | Problem | Stack | Status |
|---|---|---|---|
| [fb-news-feed/](fb-news-feed/) | Facebook News Feed — posts, follows, reactions, infinite scroll, realtime fan-out | React + Express + Sequelize/SQLite + socket.io | **Working end-to-end** |
| [ticket-master/](ticket-master/) | Ticketmaster — event search, seat selection, concurrent booking with distributed lock | React + Express + Sequelize/Postgres + Redis + Stripe | Code complete (needs Postgres + Redis to run) |
| [chatapp/](chatapp/) | Realtime chat — channels, presence, message history | Express + socket.io | Scaffolding |
| [music-stream/](music-stream/) | Spotify-style audio streaming | Node server | Scaffolding |
| [netflix/](netflix/) | Video streaming + CDN-style delivery | — | Planned |
| [google-docs/](google-docs/) | Collaborative editor (OT/CRDT) | — | Planned |
| [photo-sharing/](photo-sharing/) | Instagram-style photo feed | — | Planned |
| [pinterest/](pinterest/) | Pinterest-style masonry feed | — | Planned |
| [rich-text-editor/](rich-text-editor/) | Browser-based WYSIWYG editor | — | Planned |
| [local-delivery-service/](local-delivery-service/) | DoorDash-style dispatch | — | Planned |

## Featured: FB News Feed

The most complete project. Demonstrates the canonical News Feed system-design pattern end-to-end.

**Backend** (`fb-news-feed/backend/`)
- Express + Sequelize on SQLite (zero-config local demo)
- Models: `User`, `Post`, `Follow`, `Reaction`
- REST: `GET /feed`, `POST /posts`, `POST/DELETE /posts/:id/react`, `GET /users`, `PUT/DELETE /users/:id/follow`
- Cursor pagination on `createdAt` (ISO timestamp)
- **Realtime** via socket.io: fan-out on write to follower rooms (`user:<id>`), per-post reaction rooms (`post:<id>`)
- Demo auth via `x-user-id` header

**Frontend** (`fb-news-feed/frontend/`)
- Create React App, FB-style layout
- Infinite scroll via `IntersectionObserver`
- Optimistic likes with rollback on error
- Live updates: new posts prepend without refresh; reaction counts update across clients
- In-app **user switcher** (top bar) — pick demo-user / alice / bob / carol to test multi-user scenarios in one browser

**Run it**
```bash
# terminal 1
cd fb-news-feed/backend && npm install && npm start
# terminal 2
cd fb-news-feed/frontend && npm install && npm start
# open http://localhost:3000
```

**Test realtime**
1. Open two browser windows (one normal, one incognito for separate `localStorage`).
2. Window A: "Viewing as" → Alice. Window B: leave as You (Demo).
3. Window A posts → Window B sees it instantly. Either window likes → other window's count updates live.

## Featured: Ticketmaster

Demonstrates concurrency control for high-contention seat booking.

- Sequelize transaction + row-level `LOCK.UPDATE` on tickets
- Redis distributed lock (`SET NX EX 600`) per ticket to serialize booking attempts across instances
- Stripe payment intent stub
- React frontend with event search, seat selection, booking confirmation

Requires Postgres + Redis. See [ticket-master/](ticket-master/) for setup.

## Repo conventions

- **Node 18+** assumed.
- Each project has its own `package.json` files in `backend/` and `frontend/`.
- Local databases (e.g. `data.sqlite`) and `node_modules/` are gitignored.
- Demo auth uses a header / local storage value — no real identity provider.

## License

MIT for personal/study use.
