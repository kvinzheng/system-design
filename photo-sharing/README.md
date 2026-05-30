# PhotoShare

A minimal full-stack photo-sharing app (Instagram-style) built with Next.js 14,
SQLite, and Sharp. Implements the production upload flow: **client →
presigned URL → direct PUT to object storage → server processes variants →
CDN URL in DB**.

A storage driver abstraction (`STORAGE_DRIVER=local|s3`) keeps the upload
flow identical in dev and prod — the local driver simulates S3 with a
presign endpoint that points at a local PUT sink.

## Stack

- **Next.js 14** (App Router, RSC) — SSR feed for crawlers, CSR for interaction.
- **SQLite** via `better-sqlite3` — `posts`, `post_images`, `likes`.
- **Sharp** — EXIF rotate, resize 1440px + 320px thumb, transcode to WebP.
- **AWS SDK v3** (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- **Tailwind CSS**.

## Run (local driver, default)

```bash
npm install
npm run dev          # http://localhost:3000
```

Uploads land in `data/uploads/` and are served by
[src/app/uploads/[name]/route.ts](src/app/uploads/%5Bname%5D/route.ts).

## Run (S3 driver)

See [.env.example](.env.example):

```bash
STORAGE_DRIVER=s3
S3_BUCKET=my-bucket
AWS_REGION=us-east-1
CDN_BASE_URL=https://d123.cloudfront.net
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Set bucket CORS so the browser PUT works (sample in `.env.example`).

## Upload flow

```
 Browser                    App server                     S3 / disk
   │                            │                              │
   │ ─ POST /api/uploads/presign│                              │
   │                            │ ─ create presigned PUT ─────▶│
   │ ◀── { uploadUrl, key } ────│                              │
   │                                                           │
   │ ── PUT raw bytes (filter baked in) ──────────────────────▶│
   │ ◀── 200 OK ───────────────────────────────────────────────│
   │                                                           │
   │ ── POST /api/posts { rawKeys, caption } ─▶ processRaw() ─▶│
   │                                          (resize + WebP)  │
   │ ◀── { id } ──────────────────────────────                 │
```

In production `processRaw` runs in a Lambda triggered by S3
`ObjectCreated:Put` on `raw/`, not in the request path.

## Architecture map

| Concern                | File |
| ---------------------- | ---- |
| SSR feed               | [src/app/page.tsx](src/app/page.tsx) |
| Pagination + IO scroll | [src/lib/db.ts](src/lib/db.ts), [src/components/Feed.tsx](src/components/Feed.tsx) |
| Storage interface      | [src/lib/storage/index.ts](src/lib/storage/index.ts) |
| S3 driver              | [src/lib/storage/s3.ts](src/lib/storage/s3.ts) |
| Local driver           | [src/lib/storage/local.ts](src/lib/storage/local.ts) |
| Presign endpoint       | [src/app/api/uploads/presign/route.ts](src/app/api/uploads/presign/route.ts) |
| Local PUT sink (dev)   | [src/app/api/local-upload/route.ts](src/app/api/local-upload/route.ts) |
| Finalize / create post | [src/app/api/posts/route.ts](src/app/api/posts/route.ts) |
| Client upload flow     | [src/components/Uploader.tsx](src/components/Uploader.tsx) |
| Carousel               | [src/components/Carousel.tsx](src/components/Carousel.tsx) |
| Like API               | [src/app/api/like/route.ts](src/app/api/like/route.ts) |

## Remaining production deltas

- Move `processRaw` to a Lambda triggered by S3 PUT event (queue-based).
- Move filter rendering server-side so the original bytes are preserved.
- Auth (currently `demo-user` everywhere).
- Rate limit `/api/uploads/presign` to prevent presign abuse.
- NSFW / virus scan between PUT and `processRaw`.
- Fan-out feed writes to a denormalized store (Redis/Cassandra).
