import express from 'express';
import cors from 'cors';
import { VIDEOS, getVideo } from './catalog.js';
import { ROWS, expandRow } from './rows.js';
import { generateVtt } from './subtitles.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Discovery / browse endpoints ---------------------------------------

// Featured billboard (the autoplaying hero at the top of Discover).
app.get('/api/billboard', (_req, res) => {
  res.json(getVideo('tos'));
});

// All recommendation rows (Trending Now, Continue Watching, etc.).
app.get('/api/rows', (_req, res) => {
  res.json(ROWS.map(expandRow));
});

// Full catalog (for the search/browse-all surface).
app.get('/api/videos', (_req, res) => {
  res.json(VIDEOS);
});

// Single title metadata — used by the watch page to build the player.
app.get('/api/videos/:id', (req, res) => {
  const video = getVideo(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...video,
    subtitles: video.subtitles.map((s) => ({
      ...s,
      src: `/api/subtitles/${video.id}/${s.lang}.vtt`,
    })),
  });
});

// --- Subtitles -----------------------------------------------------------

app.get('/api/subtitles/:id/:lang.vtt', (req, res) => {
  const video = getVideo(req.params.id);
  if (!video) return res.status(404).end();
  res.type('text/vtt').send(generateVtt(req.params.lang));
});

// --- Health --------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
