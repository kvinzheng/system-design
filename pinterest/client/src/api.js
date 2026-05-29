// Thin API client. Vite dev server proxies /api to the Express server.
export async function fetchPins({ cursor = 0, limit = 20, signal } = {}) {
  const url = `/api/pins?cursor=${cursor}&limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load pins: ${res.status}`);
  return res.json();
}
