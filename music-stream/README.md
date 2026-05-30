# music-stream

Full-stack React music-streaming demo modeling the front-end architecture of a
Spotify-style app.

## Stack
- **Server:** Node + Express (mock catalog, search, stream-handshake, queue sync)
- **Client:** React 18 + TypeScript + Vite + react-router + Zustand + idb-keyval

## Architectural highlights
- **App shell** keeps `<audio>` and player UI mounted outside the router outlet
  so playback survives navigation.
- **PlaybackController** singleton owns the audio element; pages only dispatch
  intents (`playTrack`, `playContext`, `next`, …).
- **QueueManager** splits the queue into a manual `userQueue` and a derived
  `contextQueue` (matches Spotify behavior: switching context preserves user
  queue).
- **playerStore** (Zustand) holds runtime + persisted state; persisted slice is
  written to IndexedDB on every change and rehydrated on boot.
- **sync.ts** pushes a monotonic-version snapshot to the server on every change
  and on `online` events (last-writer-wins reconcile on the server).
- **Media Session API** wired up so OS / lock-screen controls work.
- **Next-track prefetch** (~15s before end) warms the stream handshake.

## Run

```bash
# terminal 1 — server (port 4000)
cd server && npm install && npm run dev

# terminal 2 — client (port 5173, proxies /api → :4000)
cd client && npm install && npm run dev
```

Open <http://localhost:5173>.

Audio comes from public SoundHelix sample MP3s so no media files are bundled.
