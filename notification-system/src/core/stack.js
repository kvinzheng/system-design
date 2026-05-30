// Production-style notification stack manager (framework-free).
//
// Responsibilities:
//  - Coalesce incoming items by group key
//  - Cap visible banners dynamically by viewport AND user density preference
//  - Priority-weighted eviction: requiresAction > high > medium > low,
//    age as tiebreaker; never evict requiresAction
//  - Time-based aging with TTL per tier; hover pauses the timer
//  - Overflow surface: evicted/aged banners move to `overflow[]`
//    until user clears them or 24h passes
//  - Re-applies cap when user prefs change (focus / density / quiet hours)
//
// Item shape (provided by `notify()`):
//   { priority, title, body?, groupKey?, surface?, persistent?,
//     requiresAction?, onOpen?, summary?, meta? }
//
// Banner shape (subscribers receive):
//   { id, priority, title, body, count, persistent, requiresAction,
//     groupKey, surface, onOpen, summary, meta, lastTs, paused, ttlRemaining }

import { getPrefs, densityCap, isInQuietHours, subscribePrefs } from './prefs.js';

const TTL_MS = { high: Infinity, medium: 5000, low: 0 };
const BANNER_HEIGHT_PX = 64;
const VIEWPORT_FRACTION = 0.3;
const OVERFLOW_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let visible = [];
let overflow = [];
let listeners = new Set();
let agingTimer = null;

function emit() {
  const state = getState();
  for (const l of listeners) l(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(getState());
  ensureAgingLoop();
  return () => listeners.delete(listener);
}

subscribePrefs(() => {
  const cap = maxBanners();
  let changed = false;
  while (visible.length > cap) {
    let victimIdx = 0, victimScore = Infinity;
    for (let i = 0; i < visible.length; i++) {
      const s = evictionScore(visible[i]);
      if (s < victimScore) { victimScore = s; victimIdx = i; }
    }
    const [victim] = visible.splice(victimIdx, 1);
    overflow.unshift(victim);
    changed = true;
  }
  if (changed || listeners.size) emit();
});

export function getState() {
  return { visible: [...visible], overflow: [...overflow], maxVisible: maxBanners() };
}

export function maxBanners() {
  if (typeof window === 'undefined') return 3;
  const prefs = getPrefs();
  if (prefs.focusMode) return 1;
  const viewport = window.innerHeight || 800;
  let cap = Math.floor((viewport * VIEWPORT_FRACTION) / BANNER_HEIGHT_PX);
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cap = Math.min(cap, 1);
    }
  } catch {}
  cap = Math.min(cap, densityCap(prefs.density));
  return Math.max(1, Math.min(cap, 5));
}

function defaultGroupKey(input) {
  // MEDIUM: a single rolling banner. Bursts collapse into one "N new" toast,
  // regardless of source.
  if (input.priority === 'medium') return 'medium:rolling';
  if (input.summary) return `summary:${input.priority}:${Date.now()}`;
  // HIGH/LOW: unique per call unless caller provided one
  return `${input.priority}:${input.title || ''}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
}

function evictionScore(b) {
  let s = 0;
  if (b.requiresAction) s += 10_000;
  if (b.priority === 'high') s += 100;
  if (b.priority === 'medium') s += 10;
  if (b.persistent) s += 5;
  s -= (Date.now() - b.lastTs) / 1000;
  return s;
}

export function addBanner(input) {
  // Low priority never enters the banner stack — badge / digest only.
  if (input.priority === 'low') return null;

  const prefs = getPrefs();
  const suppressMedium = (prefs.focusMode || isInQuietHours(prefs)) && input.priority !== 'high';

  const groupKey = input.groupKey || defaultGroupKey(input);
  const targetArr = suppressMedium ? overflow : visible;
  const existing = targetArr.find((b) => b.groupKey === groupKey);

  if (existing) {
    existing.count = (existing.count || 1) + 1;
    existing.lastTs = Date.now();
    existing.ttlRemaining = TTL_MS[existing.priority];
    // Refresh content with the latest occurrence
    if (input.title) existing.latestTitle = input.title;
    if (input.body) existing.latestBody = input.body;
    if (input.onOpen) existing.onOpen = input.onOpen;
    emit();
    ensureAgingLoop();
    return existing.id;
  }

  const banner = {
    id: input.id || `${input.priority}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    priority: input.priority,
    title: input.title || '',
    body: input.body || '',
    summary: input.summary,
    groupKey,
    surface: input.surface,
    onOpen: input.onOpen,
    meta: input.meta,
    count: 1,
    lastTs: Date.now(),
    persistent: input.persistent ?? (input.priority === 'high'),
    requiresAction: !!input.requiresAction,
    paused: false,
    ttlRemaining: TTL_MS[input.priority],
  };

  if (suppressMedium) {
    overflow.unshift(banner);
    emit();
    ensureAgingLoop();
    return banner.id;
  }

  visible.push(banner);

  const cap = maxBanners();
  while (visible.length > cap) {
    let victimIdx = 0, victimScore = Infinity;
    for (let i = 0; i < visible.length; i++) {
      const s = evictionScore(visible[i]);
      if (s < victimScore) { victimScore = s; victimIdx = i; }
    }
    const [victim] = visible.splice(victimIdx, 1);
    overflow.unshift(victim);
  }

  emit();
  ensureAgingLoop();
  return banner.id;
}

export function dismissBanner(id) {
  const before = visible.length + overflow.length;
  visible = visible.filter((b) => b.id !== id);
  overflow = overflow.filter((b) => b.id !== id);
  if (visible.length + overflow.length !== before) emit();
}

export function clearOverflow() {
  if (!overflow.length) return;
  overflow = [];
  emit();
}

export function pauseAging(id) {
  const b = visible.find((x) => x.id === id);
  if (b && !b.paused) { b.paused = true; emit(); }
}
export function resumeAging(id) {
  const b = visible.find((x) => x.id === id);
  if (b && b.paused) { b.paused = false; emit(); }
}

function ensureAgingLoop() {
  if (agingTimer) return;
  agingTimer = setInterval(tick, 250);
}

function tick() {
  const now = Date.now();
  let changed = false;

  const survivors = [];
  for (const b of visible) {
    if (b.persistent || b.requiresAction || b.ttlRemaining === Infinity) { survivors.push(b); continue; }
    if (b.paused) { survivors.push(b); continue; }
    b.ttlRemaining -= 250;
    if (b.ttlRemaining <= 0) {
      overflow.unshift({ ...b, agedAt: now });
      changed = true;
    } else {
      survivors.push(b);
    }
  }
  if (survivors.length !== visible.length) {
    visible = survivors;
    changed = true;
  }

  const beforeOv = overflow.length;
  overflow = overflow.filter((b) => now - (b.agedAt || b.lastTs) < OVERFLOW_MAX_AGE_MS);
  if (overflow.length !== beforeOv) changed = true;

  if (!visible.length && !overflow.length) {
    clearInterval(agingTimer);
    agingTimer = null;
  }

  if (changed) emit();
}
