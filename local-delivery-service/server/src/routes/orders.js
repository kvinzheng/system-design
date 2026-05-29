import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { nearbyDcs } from '../services/nearby.js';
import { availabilityCache } from '../services/cache.js';

export const ordersRouter = Router();

const insertOrder = db.prepare(
  'INSERT INTO orders (lat, lng, status) VALUES (?, ?, ?)'
);
const insertOrderItem = db.prepare(
  'INSERT INTO order_items (order_id, dc_id, item_id, quantity) VALUES (?, ?, ?, ?)'
);
const decrementInventory = db.prepare(
  `UPDATE inventory
      SET quantity = quantity - ?
    WHERE dc_id = ? AND item_id = ? AND quantity >= ?`
);
const getInventoryForItemInDcs = (dcCount) =>
  db.prepare(
    `SELECT dc_id, quantity
       FROM inventory
      WHERE item_id = ?
        AND dc_id IN (${Array(dcCount).fill('?').join(',')})
        AND quantity > 0
      ORDER BY quantity DESC`
  );

const getIdempotent = db.prepare(
  'SELECT request_hash, status_code, response_body FROM idempotency_keys WHERE key = ?'
);
const insertIdempotent = db.prepare(
  'INSERT INTO idempotency_keys (key, request_hash, status_code, response_body) VALUES (?, ?, ?, ?)'
);

function hashRequest(body) {
  // Canonicalize: sort items by itemId so {A,B} and {B,A} hash the same.
  const canonical = {
    lat: body.lat,
    lng: body.lng,
    items: [...(body.items || [])]
      .map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
      .sort((a, b) => a.itemId - b.itemId),
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

// POST /api/orders  { lat, lng, items: [{itemId, quantity}] }
// Optional header: Idempotency-Key  (UUID supplied by client per intent)
ordersRouter.post('/', (req, res) => {
  const { lat, lng, items } = req.body || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  for (const it of items) {
    if (!Number.isFinite(it.itemId) || !Number.isInteger(it.quantity) || it.quantity <= 0) {
      return res.status(400).json({ error: 'each item needs itemId (number) and quantity (positive int)' });
    }
  }

  const idempotencyKey = req.get('Idempotency-Key');
  const requestHash = idempotencyKey ? hashRequest({ lat, lng, items }) : null;
  if (idempotencyKey) {
    const existing = getIdempotent.get(idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        return res.status(422).json({
          error: 'Idempotency-Key reused with a different request body',
        });
      }
      // Replay the stored response — same key, same body → same result.
      res.set('Idempotent-Replay', 'true');
      return res.status(existing.status_code).json(JSON.parse(existing.response_body));
    }
  }

  const dcs = nearbyDcs(lat, lng);
  if (dcs.length === 0) {
    return respond(res, 409, { error: 'no distribution centers in range' }, idempotencyKey, requestHash);
  }
  const dcIds = dcs.map((d) => d.id);

  // Atomic: BEGIN IMMEDIATE gives us a write lock; per-row decrements use a
  // WHERE quantity >= ? guard so concurrent writers cannot oversell.
  const txn = db.transaction(() => {
    const allocations = []; // {itemId, dcId, quantity}
    for (const { itemId, quantity } of items) {
      let remaining = quantity;
      const rows = getInventoryForItemInDcs(dcIds.length).all(itemId, ...dcIds);
      for (const row of rows) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, row.quantity);
        const info = decrementInventory.run(take, row.dc_id, itemId, take);
        if (info.changes === 1) {
          allocations.push({ itemId, dcId: row.dc_id, quantity: take });
          remaining -= take;
        }
      }
      if (remaining > 0) {
        // throw aborts the transaction → rollback
        const err = new Error(`insufficient stock for item ${itemId}`);
        err.code = 'INSUFFICIENT_STOCK';
        err.itemId = itemId;
        throw err;
      }
    }
    const { lastInsertRowid: orderId } = insertOrder.run(lat, lng, 'placed');
    for (const a of allocations) insertOrderItem.run(orderId, a.dcId, a.itemId, a.quantity);
    return { orderId, allocations };
  });

  try {
    const result = txn.immediate();
    availabilityCache.invalidate(); // reads were stale
    return respond(res, 201, { status: 'placed', ...result }, idempotencyKey, requestHash);
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return respond(res, 409, { error: err.message, itemId: err.itemId }, idempotencyKey, requestHash);
    }
    console.error(err);
    return res.status(500).json({ error: 'order failed' });
  }
});

// Persist the response under the idempotency key (if provided) and send it.
// Note: only deterministic outcomes (success + business-rule rejections) are
// stored. Transient 5xx errors are NOT recorded so the client can retry safely.
function respond(res, statusCode, body, idempotencyKey, requestHash) {
  if (idempotencyKey) {
    try {
      insertIdempotent.run(idempotencyKey, requestHash, statusCode, JSON.stringify(body));
    } catch (e) {
      // Race: another concurrent request with the same key beat us to insert.
      // Replay the winner's stored response instead of double-processing.
      const existing = getIdempotent.get(idempotencyKey);
      if (existing) {
        res.set('Idempotent-Replay', 'true');
        return res.status(existing.status_code).json(JSON.parse(existing.response_body));
      }
      throw e;
    }
  }
  return res.status(statusCode).json(body);
}
