import express from "express";
import cors from "cors";
import { generatePins } from "./pins.js";

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());

// In-memory dataset (in real life: a database / Pinterest's Smart Feed).
// We pre-generate a large pool so cursor pagination is deterministic.
const TOTAL_PINS = 5000;
const PINS = generatePins(TOTAL_PINS);

/**
 * GET /api/pins?cursor=<index>&limit=<n>
 *
 * Cursor-based pagination. The cursor is the index into the feed.
 * Returns pins in stable feed order so the client can place them
 * top-to-bottom in the masonry layout while preserving server ranking.
 */
app.get("/api/pins", (req, res) => {
  const cursor = Math.max(0, parseInt(req.query.cursor ?? "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? "20", 10) || 20));

  const slice = PINS.slice(cursor, cursor + limit);
  const nextCursor = cursor + slice.length < PINS.length ? cursor + slice.length : null;

  // Simulate small network latency so the infinite scroll loader is visible.
  setTimeout(() => {
    res.json({
      items: slice,
      nextCursor,
      total: PINS.length,
    });
  }, 250);
});

app.get("/api/pins/:id", (req, res) => {
  const pin = PINS.find((p) => p.id === req.params.id);
  if (!pin) return res.status(404).json({ error: "Pin not found" });
  res.json(pin);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Pinterest API listening on http://localhost:${PORT}`);
});
