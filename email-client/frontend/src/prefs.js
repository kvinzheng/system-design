// User notification preferences, persisted in localStorage.
// Three knobs every production notification UI exposes:
//   - Focus Mode: when on, only `high` priority renders as a visible banner.
//     Medium goes straight to overflow; nothing makes sound or OS popups.
//   - Density: compact (1) / normal (3) / spacious (5) — caps maxVisible.
//   - Quiet Hours: time-range during which only `high` interrupts.
//     e.g. { start: 22, end: 7 } means 10pm-7am is quiet.

const KEY = 'email:prefs:v1';

const defaults = {
  focusMode: false,
  density: 'normal',          // 'compact' | 'normal' | 'spacious'
  quietHours: null,           // null | { start: 22, end: 7 }
};

let cache = null;
const listeners = new Set();

function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    cache = { ...defaults };
  }
  return cache;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  for (const l of listeners) l(cache);
}

export function getPrefs() {
  return { ...load() };
}

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
