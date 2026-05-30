// User preferences for notification behavior. Persisted in localStorage under
// a configurable key. Three knobs every production notification UI exposes:
//   - focusMode: only `high` priority renders a visible banner
//   - density:   compact (1) / normal (3) / spacious (5) — caps maxVisible
//   - quietHours: time-range during which only `high` interrupts

let storageKey = 'priority-notif:prefs:v1';

const defaults = {
  focusMode: false,
  density: 'normal',         // 'compact' | 'normal' | 'spacious'
  quietHours: null,          // null | { start: 22, end: 7 }
};

let cache = null;
const listeners = new Set();

export function setStorageKey(key) {
  storageKey = key;
  cache = null;
}

function load() {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(storageKey);
    cache = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    cache = { ...defaults };
  }
  return cache;
}

function save() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {}
  for (const l of listeners) l(cache);
}

export function getPrefs() { return { ...load() }; }

export function setPrefs(patch) {
  load();
  cache = { ...cache, ...patch };
  save();
}

export function subscribePrefs(listener) {
  listeners.add(listener);
  listener(load());
  return () => listeners.delete(listener);
}

export function densityCap(density) {
  switch (density) {
    case 'compact':  return 1;
    case 'spacious': return 5;
    default:         return 3;
  }
}

export function isInQuietHours(prefs = load(), now = new Date()) {
  if (!prefs.quietHours) return false;
  const { start, end } = prefs.quietHours;
  const h = now.getHours();
  if (start === end) return false;
  return start < end ? (h >= start && h < end) : (h >= start || h < end);
}
