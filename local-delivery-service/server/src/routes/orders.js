import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { nearbyDcs } from '../services/nearby.js';
import { availabilityCache } from '../services/cache.js';

export const ordersRouter = Router();

// ─── prepared statements ───────────────────────────────────────────────
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

// Idempotency statements
const getIdemRow = db.prepare(
  `SELECT status, request_hash, status_code, response_body
     FROM idempotency_keys WHERE key = ?`
);
const claimIdemKey = db.prepare(
  `INSERT INTO idempotency_keys (key, request_hash, status, expires_at)
   VALUES (?, ?, 'pending', datetime('now', '+24 hours'))`
);
const finalizeIdemKey = db.prepare(
  `UPDATE idempotency_keys
      SET status = 'done', status_code = ?, response_body = ?
    WHERE key = ?`
);

// ─── helpers ───────────────────────────────────────────────────────────
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

function replay(res, row) {
  res.set('Idempotent-Replayed', 'true');
  return res.status(row.status_code).json(JSON.parse(row.response_body));
}

// Try to do the order inside a SAVEPOINT so we can roll back the inventory
// changes on INSUFFICIENT_STOCK while keeping the outer txn (and the
// idempotency_keys row) intact.
function attemptOrder({ lat, lng, items, dcIds }) {
  db.exec('SAVEPOINT order_attempt');
  try {
    const allocations = [];
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
        const err = new Error(`insufficient stock for item ${itemId}`);
        err.code = 'INSUFFICIENT_STOCK';
        err.itemId = itemId;
        throw err;
      }
    }
    const { lastInsertRowid: orderId } = insertOrder.run(lat, lng, 'placed');
    for (const a of allocations) insertOrderItem.run(orderId, a.dcId, a.itemId, a.quantity);
    db.exec('RELEASE order_attempt');
    return { statusCode: 201, body: { status: 'placed', orderId, allocations } };
  } catch (err) {
    db.exec('ROLLBACK TO order_attempt');
    db.exec('RELEASE order_attempt');
    if (err.code === 'INSUFFICIENT_STOCK') {
      return { statusCode: 409, body: { error: err.message, itemId: err.itemId } };
    }
    throw err;
  }
}

// ─── route ─────────────────────────────────────────────────────────────
// POST /api/orders  { lat, lng, items: [{itemId, quantity}] }
// Optional header: Idempotency-Key
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

  // Fast-path replay (no write lock): if the key already finished, return it.
  if (idempotencyKey) {
    const existing = getIdemRow.get(idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        return res.status(422).json({ error: 'Idempotency-Key reused with a different request body' });
      }
      if (existing.status === 'done') return replay(res, existing);
      // status === 'pending' → someone else is still processing the same key.
      res.set('Retry-After', '1');
      return res.status(409).json({ error: 'request in progress, retry shortly' });
    }
  }

  const dcs = nearbyDcs(lat, lng);
  const dcIds = dcs.map((d) => d.id);

  // One transaction does it all: claim key → do work → finalize key.
  // If we crash anywhere in between, the whole thing rolls back, leaving NO
  // pending row stranded — the next retry can claim the key cleanly.
  const txn = db.transaction(() => {
    // 1. Claim the key. PK constraint guarantees exactly one winner.
    if (idempotencyKey) {
      try {
        claimIdemKey.run(idempotencyKey, requestHash);
      } catch (e) {
        // Lost the race to a concurrent retry with the same key.
        const existing = getIdemRow.get(idempotencyKey);
        if (existing?.status === 'done') {
          if (existing.request_hash !== requestHash) {
            return { statusCode: 422, body: { error: 'Idempotency-Key reused with a different request body' } };
          }
          return { replay: existing };
        }
        return { conflict: true };
      }
    }

    // 2. Handle "no DCs in range" as a deterministic 409 we can cache.
    if (dcs.length === 0) {
      const body = { error: 'no distribution centers in range' };
      if (idempotencyKey) finalizeIdemKey.run(409, JSON.stringify(body), idempotencyKey);
      return { statusCode: 409, body };
    }

    // 3. Try the order. SAVEPOINT lets us roll back inventory on stock errors
    //    while keeping the idempotency_keys row.
    const outcome = attemptOrder({ lat, lng, items, dcIds });

    // 4. Save the response under the key so future retries replay it.
    if (idempotencyKey) {
      finalizeIdemKey.run(outcome.statusCode, JSON.stringify(outcome.body), idempotencyKey);
    }
    return outcome;
  });

  try {
    const result = txn.immediate();

    if (result.replay) return replay(res, result.replay);
    if (result.conflict) {
      res.set('Retry-After', '1');
      return res.status(409).json({ error: 'request in progress, retry shortly' });
    }
    if (result.statusCode === 201) availabilityCache.invalidate();
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    // Transient errors only — the txn rolled back, including the pending claim.
    // Client is safe to retry with the same key.
    console.error(err);
    return res.status(500).json({ error: 'order failed' });
  }
});
