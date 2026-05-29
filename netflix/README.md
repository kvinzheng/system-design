# Netflix-like Video Streaming App

Full-stack reference implementation for a video streaming platform inspired by Netflix.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, custom HLS player using [hls.js](https://github.com/video-dev/hls.js/)
- **Backend**: Node.js + Express, serves video catalog, recommendations, and subtitle/manifest endpoints

## Features

### Discover page
- Autoplaying muted **billboard** hero at the top (with mute/info CTAs)
- Multiple **recommendation rows** with horizontal scrolling card carousels
- Hover-preview metadata

### Watch page (custom player)
- Adaptive bitrate streaming via HLS (auto-quality based on network)
- Manual quality / resolution selector (1080p, 720p, 480p, auto)
- Play / pause / large-skip (±10s) / seek bar with hover preview time
- Playback rate (0.5x – 2x)
- Volume control + mute
- Audio track selection (multi-language)
- Subtitle tracks (WebVTT) with language selection and off toggle
- Fullscreen toggle
- Auto-hide controls

### Backend
- `GET  /api/billboard` – returns the featured hero title
- `GET  /api/rows` – returns rows of recommendations (Trending, Continue Watching, etc.)
- `GET  /api/videos/:id` – returns video metadata (HLS manifest URL, audio/subtitle tracks)
- `GET  /api/subtitles/:id/:lang.vtt` – serves WebVTT subtitle file
- HLS manifests reference public test streams (Mux / Apple) so playback works without any
  local transcoding pipeline.

## Run locally

```bash
npm run install:all
npm run dev
```

- Server: http://localhost:4000
- Client: http://localhost:5173

## Architecture (high level)

```
Browser ──HTTP──> Vite dev / CDN (static React bundle)
   │
   │ /api/*           ─────> Express API (catalog, recs, subs)
   │ /hls/*.m3u8,.ts  ─────> Public origin / CDN (adaptive bitrate ladder)
   │ /vtt/*.vtt       ─────> Express (WebVTT subtitles)
```

In production:
- Video files are pre-transcoded into an ABR ladder (e.g. 240p/480p/720p/1080p/4K) using
  FFmpeg → segmented into ~6s `.ts` (or fragmented MP4) chunks → master `.m3u8` manifest.
- Manifests + segments are served via a CDN edge cache.
- The client uses Media Source Extensions (via hls.js) to switch quality on the fly based on
  measured bandwidth and buffer health.
- Subtitles are delivered as separate WebVTT files referenced from the manifest.
