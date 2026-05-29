// Simple in-memory TTL cache. Mirrors the "scale reads" deep-dive.
// Production: Redis with the same semantics.

const DEFAULT_TTL_MS = 30_000;

class TTLCache {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
    this.map = new Map();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value) {
    this.map.set(key, { value, expires: Date.now() + this.ttl });
  }
  invalidate(predicate) {
    if (!predicate) return this.map.clear();
    for (const k of this.map.keys()) if (predicate(k)) this.map.delete(k);
  }
}

export const availabilityCache = new TTLCache(30_000);
