# Pinterest Clone — Full Stack (React + Express)

A working implementation of the Pinterest homepage system-design exercise,
focused on the **masonry layout** and **infinite scroll** feed.

## Architecture

```
client (Vite + React)  ──/api──►  server (Express)
   │                                 │
   ├─ Masonry layout (O(n) shortest-column placement)
   ├─ IntersectionObserver-based infinite scroll
   ├─ Cursor-paginated feed via custom hook
   └─ Reserved image space (no layout shift)        ├─ Cursor pagination
                                                    └─ Deterministic seeded pin pool
```

### Key design decisions

| Concern | Approach |
| --- | --- |
| Layout algorithm | Absolute positioning, "place in shortest column" — same approach as Pinterest's open-source `masonic`/Pinterest Gestalt Masonry. O(n) per layout pass. |
| Feed order preservation | Pins are appended in server order; within a row they flow left-to-right because ties on column height go to the leftmost column. |
| Pagination | Cursor-based (`?cursor=&limit=`). Avoids skip/limit drift as new pins are inserted. |
| No layout shift | API returns intrinsic `width`/`height`. Client reserves image box before bytes arrive. |
| Infinite scroll | `IntersectionObserver` sentinel with 1200px `rootMargin` so the next page is fetched before the user reaches the bottom. |
| Re-entrancy guard | `usePinFeed` uses an `inflightRef` so rapid scroll events / React StrictMode double-mount cannot double-fetch. |
| Resize | `ResizeObserver` recomputes `columnCount` and re-runs layout. Only `transform` changes on each card → cheap. |
| Image loading | `loading="lazy"` + `decoding="async"` so off-screen images don't compete for bandwidth. |

### Possible extensions (mentioned in the prompt)

- **Virtualization**: only mount cards whose `top` is within the viewport ± buffer. The positions array already gives you everything you need (`top`, `cardHeight`).
- **SSR**: render the first page on the server for SEO + faster LCP. Hydrate, then continue CSR for infinite scroll.
- **Responsive `srcset`**: request `picsum.photos/.../{width*dpr}` and serve `<img srcset>`.
- **Optimistic save**: wire the Save button to a `/api/pins/:id/save` endpoint with rollback on failure.

## Run

```bash
# from repo root
npm install
npm run install:all   # installs server + client deps
npm run dev           # runs Express on :4000 and Vite on :5173
```

Then open http://localhost:5173.

## Layout walkthrough

The masonry algorithm lives in [client/src/components/Masonry.jsx](client/src/components/Masonry.jsx):

1. Measure container width with `ResizeObserver`.
2. `columnCount = floor((containerWidth + gutter) / (columnWidth + gutter))`.
3. Maintain `colHeights[columnCount]`. For each pin:
   - Scale `pin.height` by `columnWidth / pin.width` to preserve aspect ratio.
   - Pick the index of the shortest column.
   - Position the card at `(offsetX + col * (w + gutter), colHeights[col])`.
   - Bump `colHeights[col]` by `cardHeight + gutter`.
4. Container height = `max(colHeights) - gutter`.
