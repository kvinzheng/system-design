// Pure helper: localStorage-backed prefs IO.
// No React. Just (load, save, defaults).
//
// Prefs shape: { focusMode, density, quietHours }
//   focusMode  — only HIGH renders a visible banner
//   density    — 'compact' | 'normal' | 'spacious' (caps maxVisible)
//   quietHours — null | { start: 22, end: 7 } (24h hours, may wrap)

export const PREFS_DEFAULTS = {
  focusMode: false,
  density: 'normal',
  quietHours: null,
};

export function loadPrefs(storageKey) {
  try {
    if (typeof localStorage === 'undefined') return { ...PREFS_DEFAULTS };
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...PREFS_DEFAULTS, ...JSON.parse(raw) } : { ...PREFS_DEFAULTS };
  } catch {
    return { ...PREFS_DEFAULTS };
  }
}

export function savePrefs(storageKey, prefs) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    }
  } catch {}
}

export function densityCap(density) {
  switch (density) {
    case 'compact':  return 1;
    case 'spacious': return 5;
    default:         return 3;
  }
}

export function isInQuietHours(prefs, now = new Date()) {
  if (!prefs.quietHours) return false;
  const { start, end } = prefs.quietHours;
  if (start === end) return false;
  const h = now.getHours();
  return start < end ? (h >= start && h < end) : (h >= start || h < end);
}
