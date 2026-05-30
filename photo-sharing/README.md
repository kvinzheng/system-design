# PhotoShare

A minimal full-stack photo-sharing app (Instagram-style) built with Next.js 14
(App Router), SQLite, and Sharp. Demonstrates the patterns from the system
design discussion: SSR feed, infinite scroll, image pipeline, multi-photo posts
with a snapping carousel, and client-side filters baked at upload time.

## Stack

- **Next.js 14** (App Router, RSC, Server Actions) — SSR feed for crawlers,
  client components for interaction.
- **SQLite** via `better-sqlite3` — `posts`, `post_images`, `likes` tables.
- **Sharp** — server-side image pipeline: EXIF rotate, resize to 1440px +
  320px thumbnail, transcode to WebP.
- **Tailwind CSS** — UI.
- **Local disk** (`data/uploads`) — stands in for object storage + CDN.

## Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Architecture mapping

| Concern               | Implementation                                                   |
| --------------------- | ---------------------------------------------------------------- |
| Rendering             | SSR initial page in [page.tsx](src/app/page.tsx); CSR pagination |
| Feed pagination       | Cursor (`created_at`) in [db.ts](src/lib/db.ts) + IO observer    |
| Image pipeline        | [storage.ts](src/lib/storage.ts) (resize, WebP, thumb)           |
| Upload flow           | Server Action [actions.ts](src/app/actions.ts)                   |
| In-browser editing    | CSS filters + canvas bake in [Uploader.tsx](src/components/Uploader.tsx) |
| Carousel              | Native scroll-snap + windowing in [Carousel.tsx](src/components/Carousel.tsx) |
| Cache headers         | Immutable 1y on `/uploads/*` in [route.ts](src/app/uploads/[name]/route.ts) |

## Production deltas

- Replace local disk with **S3 + CloudFront**; do the Sharp pipeline in a
  Lambda triggered by S3 PUT, write variants back to S3.
- Move filter rendering server-side (GPU workers) so the source is always the
  original bytes — better quality + reversible edits.
- Direct-to-S3 multipart uploads from the browser with presigned URLs; the
  API only takes metadata.
- Fan-out feed: write posts to a denormalized feed store (Redis/Cassandra)
  keyed by follower; use pull-on-read for celebrities.
- Replace `<img>` with `next/image` once images live on a real CDN.
- Auth (NextAuth), rate limiting, abuse/NSFW scanning on upload.
