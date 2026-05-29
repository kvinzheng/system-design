import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability, placeOrder } from './api.js';

const PRESETS = [
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'Oakland',       lat: 37.8044, lng: -122.2712 },
  { name: 'San Jose',      lat: 37.3382, lng: -121.8863 },
  { name: 'New York',      lat: 40.7128, lng:  -74.0060 },
  { name: 'Los Angeles',   lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago',       lat: 41.8781, lng:  -87.6298 },
];

export default function App() {
  const [lat, setLat] = useState(37.7749);
  const [lng, setLng] = useState(-122.4194);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({}); // itemId -> qty
  const [orderResult, setOrderResult] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    setOrderResult(null);
    try {
      const t0 = performance.now();
      const res = await fetchAvailability({ lat, lng });
      res.latencyMs = Math.round(performance.now() - t0);
      setData(res);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cartItems = useMemo(
    () => Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ itemId: Number(id), quantity: q })),
    [cart]
  );
  const cartTotal = useMemo(() => {
    if (!data) return 0;
    return cartItems.reduce((sum, ci) => {
      const it = data.items.find((i) => i.itemId === ci.itemId);
      return sum + (it ? it.priceCents * ci.quantity : 0);
    }, 0);
  }, [cart, cartItems, data]);

  function bump(itemId, delta, max) {
    setCart((c) => {
      const next = Math.max(0, Math.min(max, (c[itemId] || 0) + delta));
      return { ...c, [itemId]: next };
    });
  }

  async function onPlaceOrder() {
    setOrderResult(null);
    try {
      const res = await placeOrder({ lat, lng, items: cartItems });
      setOrderResult({ ok: true, ...res });
      setCart({});
      await load();
    } catch (e) {
      setOrderResult({ ok: false, error: e.message });
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Local Delivery Service</h1>
        <p className="sub">Availability is the union of inventory across DCs within ~1 hour.</p>
      </header>

      <section className="panel">
        <div className="row">
          <label>Lat <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} /></label>
          <label>Lng <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} /></label>
          <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Check availability'}</button>
        </div>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.name} className="preset" onClick={() => { setLat(p.lat); setLng(p.lng); }}>{p.name}</button>
          ))}
        </div>
      </section>

      {error && <div className="error">Error: {error}</div>}

      {data && (
        <section className="grid">
          <div className="col">
            <h2>
              Items{' '}
              <small>
                ({data.items.length} • {data.dcs.length} DCs nearby • {data.latencyMs}ms{data.cached ? ' • cached' : ''})
              </small>
            </h2>
            {data.items.length === 0 && <p className="muted">No inventory in range.</p>}
            <ul className="items">
              {data.items.map((it) => {
                const inCart = cart[it.itemId] || 0;
                return (
                  <li key={it.itemId} className="item">
                    <div className="item-main">
                      <strong>{it.name}</strong>
                      <span className="desc">{it.description}</span>
                      <span className="price">${(it.priceCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="item-stock">
                      <span>{it.quantity} in stock</span>
                      <div className="qty">
                        <button onClick={() => bump(it.itemId, -1, it.quantity)} disabled={inCart === 0}>−</button>
                        <span>{inCart}</span>
                        <button onClick={() => bump(it.itemId, +1, it.quantity)} disabled={inCart >= it.quantity}>+</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="col cart">
            <h2>Cart</h2>
            {cartItems.length === 0 ? (
              <p className="muted">Cart is empty.</p>
            ) : (
              <>
                <ul>
                  {cartItems.map((ci) => {
                    const it = data.items.find((i) => i.itemId === ci.itemId);
                    return (
                      <li key={ci.itemId}>
                        {it?.name} × {ci.quantity}
                        <span className="line-total">${((it?.priceCents || 0) * ci.quantity / 100).toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="total">Total: ${(cartTotal / 100).toFixed(2)}</div>
                <button className="primary" onClick={onPlaceOrder}>Place order</button>
              </>
            )}
            {orderResult && (
              <div className={orderResult.ok ? 'order ok' : 'order bad'}>
                {orderResult.ok
                  ? <>Order #{orderResult.orderId} placed. Allocated across {new Set(orderResult.allocations.map(a => a.dcId)).size} DC(s).</>
                  : <>Order failed: {orderResult.error}</>}
              </div>
            )}

            <h3>Nearby DCs</h3>
            <ul className="dcs">
              {data.dcs.map((d) => (
                <li key={d.id}>{d.name} <small>({d.distance.toFixed(1)} mi)</small></li>
              ))}
            </ul>
          </aside>
        </section>
      )}
    </div>
  );
}
