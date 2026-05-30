import express from 'express';
import cors from 'cors';
import { artists, albums, tracks, playlists, home } from './data.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Helpers -----------------------------------------------------------------

const notFound = (res, what) => res.status(404).json({ error: `${what} not found` });

const expandTrack = (t) => ({
  ...t,
  artist: artists[t.artistId],
  album: { id: albums[t.albumId].id, name: albums[t.albumId].name, cover: albums[t.albumId].cover },
});

// --- Home / shelves ----------------------------------------------------------

app.get('/api/home', (_req, res) => {
  const expanded = home.shelves.map((s) => ({
    ...s,
    items: s.itemIds.map((id) => {
      if (s.kind === 'playlist') return summarize('playlist', playlists[id]);
      if (s.kind === 'album')    return summarize('album', albums[id]);
      if (s.kind === 'artist')   return summarize('artist', artists[id]);
      return null;
    }),
  }));
  res.json({ shelves: expanded });
});

function summarize(kind, e) {
  if (!e) return null;
  if (kind === 'playlist') return { kind, id: e.id, name: e.name, cover: e.cover, curator: e.curator };
  if (kind === 'album')    return { kind, id: e.id, name: e.name, cover: e.cover, artist: artists[e.artistId]?.name };
  if (kind === 'artist')   return { kind, id: e.id, name: e.name, cover: e.image };
}

// --- Detail pages ------------------------------------------------------------

app.get('/api/albums/:id', (req, res) => {
  const a = albums[req.params.id];
  if (!a) return notFound(res, 'album');
  res.json({
    ...a,
    artist: artists[a.artistId],
    tracks: a.trackIds.map((id) => expandTrack(tracks[id])),
  });
});

app.get('/api/artists/:id', (req, res) => {
  const a = artists[req.params.id];
  if (!a) return notFound(res, 'artist');
  const artistAlbums = Object.values(albums).filter((al) => al.artistId === a.id);
  const top = Object.values(tracks)
    .filter((t) => t.artistId === a.id)
    .slice(0, 5)
    .map(expandTrack);
  res.json({ ...a, albums: artistAlbums.map((al) => summarize('album', al)), topTracks: top });
});

app.get('/api/playlists/:id', (req, res) => {
  const p = playlists[req.params.id];
  if (!p) return notFound(res, 'playlist');
  res.json({ ...p, tracks: p.trackIds.map((id) => expandTrack(tracks[id])) });
});

// --- Search ------------------------------------------------------------------

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ tracks: [], albums: [], artists: [], playlists: [] });

  const match = (s) => s.toLowerCase().includes(q);
  res.json({
    tracks: Object.values(tracks).filter((t) => match(t.title)).map(expandTrack),
    albums: Object.values(albums).filter((a) => match(a.name)).map((a) => summarize('album', a)),
    artists: Object.values(artists).filter((a) => match(a.name)).map((a) => summarize('artist', a)),
    playlists: Object.values(playlists).filter((p) => match(p.name)).map((p) => summarize('playlist', p)),
  });
});

// --- Stream URL handshake ----------------------------------------------------
// In production this would return a short-lived signed manifest URL.
// For the demo, we just expose the upstream MP3 URL.

app.get('/api/tracks/:id/stream', (req, res) => {
  const t = tracks[req.params.id];
  if (!t) return notFound(res, 'track');
  res.json({
    trackId: t.id,
    url: t.streamUrl,
    mimeType: 'audio/mpeg',
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
});

// --- Server-side queue sync (last-writer-wins by version) --------------------

const userQueues = new Map(); // userId -> { version, state }

app.get('/api/queue', (req, res) => {
  const userId = req.header('x-user-id') || 'demo';
  res.json(userQueues.get(userId) || { version: 0, state: null });
});

app.put('/api/queue', (req, res) => {
  const userId = req.header('x-user-id') || 'demo';
  const incoming = req.body; // { version, state }
  const current = userQueues.get(userId);
  if (!current || incoming.version >= current.version) {
    userQueues.set(userId, incoming);
    return res.json({ ok: true, accepted: true, version: incoming.version });
  }
  res.json({ ok: true, accepted: false, current });
});

// --- Boot --------------------------------------------------------------------

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`music-stream-server listening on :${PORT}`));
