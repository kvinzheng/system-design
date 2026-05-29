export async function fetchAvailability({ lat, lng, items = [], page = 1, pageSize = 50 }) {
  const params = new URLSearchParams({ lat, lng, page, pageSize });
  if (items.length) params.set('items', items.join(','));
  const res = await fetch(`/api/availability?${params}`);
  if (!res.ok) throw new Error((await res.json()).error || 'availability failed');
  return res.json();
}

export async function placeOrder({ lat, lng, items, idempotencyKey }) {
  const key = idempotencyKey || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ lat, lng, items }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'order failed');
  return { ...body, idempotencyKey: key, replayed: res.headers.get('Idempotent-Replay') === 'true' };
}
