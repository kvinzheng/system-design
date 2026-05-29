import { Router } from 'express';
import { db } from '../db.js';
import { nearbyDcs } from '../services/nearby.js';
import { availabilityCache } from '../services/cache.js';

export const availabilityRouter = Router();

// GET /api/availability?lat&lng&items=1,2,3&page=1&pageSize=50
availabilityRouter.get('/', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }
  const itemIds = (req.query.items || '')
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50));

  // Round to ~0.1 deg (~6mi) for cache-key bucketing
  const cacheKey = JSON.stringify({
    lat: Math.round(lat * 10) / 10,
    lng: Math.round(lng * 10) / 10,
    itemIds,
    page,
    pageSize,
  });
  const cached = availabilityCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const dcs = nearbyDcs(lat, lng);
  if (dcs.length === 0) {
    const empty = { items: [], dcs: [], page, pageSize, total: 0 };
    availabilityCache.set(cacheKey, empty);
    return res.json({ ...empty, cached: false });
  }

  const dcIds = dcs.map((d) => d.id);
  const placeholders = dcIds.map(() => '?').join(',');
  let sql = `
    SELECT i.id   AS item_id,
           i.name AS name,
           i.description AS description,
           i.price_cents AS price_cents,
           SUM(inv.quantity) AS quantity
    FROM   inventory inv
    JOIN   items i ON i.id = inv.item_id
    WHERE  inv.dc_id IN (${placeholders})
      AND  inv.quantity > 0
  `;
  const params = [...dcIds];
  if (itemIds.length) {
    sql += ` AND inv.item_id IN (${itemIds.map(() => '?').join(',')})`;
    params.push(...itemIds);
  }
  sql += ' GROUP BY i.id ORDER BY i.name LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const rows = db.prepare(sql).all(...params);
  const payload = {
    items: rows.map((r) => ({
      itemId: r.item_id,
      name: r.name,
      description: r.description,
      priceCents: r.price_cents,
      quantity: r.quantity,
    })),
    dcs,
    page,
    pageSize,
    total: rows.length,
  };
  availabilityCache.set(cacheKey, payload);
  res.json({ ...payload, cached: false });
});
