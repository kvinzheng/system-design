# Local Delivery Service (Gopuff-style)

A React full-stack reference implementation of the **Local Delivery Service** system-design problem.

## Functional scope

- Query availability of items deliverable within ~1 hour, by location. Availability is the **union of inventory across nearby DCs**.
- Place an order for multiple items **atomically** (no double-booking) using a SQLite transaction + row-level guards.

Out of scope: payments, driver routing, search, cancellations.

## Architecture

```
client (Vite/React)  ──HTTP──▶  server (Express)
                                    │
                                    ├─ NearbyService    (Haversine, <1h ≈ 50mi)
                                    ├─ AvailabilityCache (in-memory TTL)
                                    └─ SQLite (DCs, items, inventory, orders)
                                                │
                                                └─ Atomic order txn
```

### Endpoints
- `GET  /api/availability?lat=&lng=&items=A,B,C&page=1&pageSize=50`
- `POST /api/orders`  body: `{ lat, lng, items: [{itemId, quantity}] }`
- `GET  /api/dcs/nearby?lat=&lng=` (debug)

### Entities
- **Item** — catalog item (e.g. Cheetos)
- **DistributionCenter** — physical DC w/ lat/lng
- **Inventory** — `(dc_id, item_id, quantity)`
- **Order / OrderItem** — placed orders

## Quick start

```bash
cd local-delivery-service
npm run install:all
npm run seed        # creates data.sqlite with sample DCs + items + inventory
npm run dev         # server :4000, client :5173 (proxied)
```

Open http://localhost:5173

## Notes / trade-offs

- **SQLite** is used instead of Postgres so the demo runs with zero infra. The transaction semantics (`BEGIN IMMEDIATE` + per-row checks) translate directly to Postgres `SELECT ... FOR UPDATE`.
- **Cache**: `AvailabilityCache` uses a 30s TTL keyed by `(lat-rounded, lng-rounded, items)` — mirrors the "scale reads" deep-dive.
- **Nearby**: simple Haversine ≤ 50mi as a proxy for 1h drive time. A real system would call a Travel-Time service (deep-dive #1).
- **Strong consistency on orders**: a single transaction checks-and-decrements all inventory rows; if any item is short, the whole order fails.
