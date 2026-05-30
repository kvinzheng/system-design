// Production-style notification stack manager.
//
// Responsibilities:
//  - Group incoming banners by (sender, thread) before stacking
//  - Cap visible banners dynamically by viewport AND user density preference
//  - Priority-weighted eviction: requiresAction > high > medium > low,
//    age as tiebreaker; never evict requiresAction
//  - Time-based aging with TTL per tier; hover pauses the timer
//  - Overflow surface: evicted/aged banners move to `overflow[]`
//    until user clears them or 24h passes
//  - Context awareness: Focus mode / quiet hours / reduced-motion shrink behavior
//
// Public API:
//   addBanner(detail)               -> id
//   dismissBanner(id)               -> void
//   pauseAging(id) / resumeAging(id)
//   subscribe(listener)             -> unsubscribe()
//   getState()                      -> { visible, overflow, maxVisible }

import { getPrefs, densityCap, isInQuietHours, subscribePrefs } from './prefs';

const TTL_MS = { high: Infinity, medium: 5000, low: 0 }; // low never enters stack
const BANNER_HEIGHT_PX = 64;
const VIEWPORT_FRACTION = 0.3; // banners may consume at most 30% of viewport
const OVERFLOW_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let visible = []; // [{ id, priority, message?, summary?, groupKey, count, lastTs, persistent, requiresAction, paused, ttlRemaining }]
let overflow = []; // same shape; aged or evicted
let listeners = new Set();
let agingTimer = null;

function notify() {
  const state = getState();
  for (const l of listeners) l(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(getState());
  ensureAgingLoop();
  return () => listeners.delete(listener);
}

// React to user prefs changes (Focus / density / quiet hours) by re-enforcing
// the cap. Any visible banner over the new cap evicts to overflow.
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
  // Always notify so subscribers re-render maxVisible
  if (changed || listeners.size) notify();
});

export function getState() {
  return { visible: [...visible], overflow: [...overflow], maxVisible: maxBanners() };
}

export function maxBanners() {
  if (typeof window === 'undefined') return 3;
  const prefs = getPrefs();
  if (prefs.focusMode) return 1; // focus: only one banner ever, reserved for high
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

function groupKeyFor(detail) {
  // MEDIUM: always one global rolling toast — never stack two medium banners.
  // Bursts of any size, any sender, become a single "N new" toast.
  if (detail.priority === 'medium') return 'medium:rolling';

  if (detail.summary) return `summary:${detail.priority}:${Date.now()}`;

  // HIGH: group per (sender, thread) so a thread burst becomes one banner,
  // but different senders / threads each get their own banner.
  const m = detail.message;
  const sender = (m && (m.fromAddress || m.fromName)) || 'unknown';
  const thread = (m && (m.threadKey || m.subject)) || 'no-thread';
  return `${detail.priority}:${sender}:${thread}`;
}

function evictionScore(b) {
  // Higher score = more important to keep
  let s = 0;
  if (b.requiresAction) s += 10_000;
  if (b.priority === 'high') s += 100;
  if (b.priority === 'medium') s += 10;
  if (b.persistent) s += 5;
  s -= (Date.now() - b.lastTs) / 1000; // older = lower score
  return s;
}

export function addBanner(detail) {
  // Low priority never enters the banner stack — badge only.
  if (detail.priority === 'low') return null;

  const prefs = getPrefs();
  // Focus mode / quiet hours: medium goes straight to overflow silently.
  const suppressMedium = (prefs.focusMode || isInQuietHours(prefs)) && detail.priority !== 'high';

  const groupKey = detail.groupKey || groupKeyFor(detail);
  const targetArr = suppressMedium ? overflow : visible;
  const existing = targetArr.find((b) => b.groupKey === groupKey);

  if (existing) {
    // Coalesce into the existing banner in the same group
    existing.count = (existing.count || 1) + 1;
    existing.lastTs = Date.now();
    existing.ttlRemaining = TTL_MS[existing.priority];
    existing.latestMessage = detail.message || existing.latestMessage;
    notify();
    ensureAgingLoop();
    return existing.id;
  }

  const banner = {
    id: detail.id || `${detail.priority}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    priority: detail.priority,
    message: detail.message,
    summary: detail.summary,
    groupKey,
    count: 1,
    lastTs: Date.now(),
    persistent: !!detail.persistent,
    requiresAction: !!detail.requiresAction,
    paused: false,
    ttlRemaining: TTL_MS[detail.priority],
  };

  if (suppressMedium) {
    overflow.unshift(banner);
    notify();
    ensureAgingLoop();
    return banner.id;
  }

  visible.push(banner);

  // Cap enforcement: while over cap, evict lowest-scoring banner to overflow
  const cap = maxBanners();
  while (visible.length > cap) {
    let victimIdx = 0;
    let victimScore = Infinity;
    for (let i = 0; i < visible.length; i++) {
      const s = evictionScore(visible[i]);
      if (s < victimScore) { victimScore = s; victimIdx = i; }
    }
    const [victim] = visible.splice(victimIdx, 1);
    overflow.unshift(victim);
  }

  notify();
  ensureAgingLoop();
  return banner.id;
}

export function dismissBanner(id) {
  const before = visible.length + overflow.length;
  visible = visible.filter((b) => b.id !== id);
  overflow = overflow.filter((b) => b.id !== id);
  if (visible.length + overflow.length !== before) notify();
}

export function clearOverflow() {
  if (!overflow.length) return;
  overflow = [];
  notify();
}

export function pauseAging(id) {
  const b = visible.find((x) => x.id === id);
  if (b && !b.paused) { b.paused = true; notify(); }
}

export function resumeAging(id) {
  const b = visible.find((x) => x.id === id);
  if (b && b.paused) { b.paused = false; notify(); }
}

function ensureAgingLoop() {
  if (agingTimer) return;
  agingTimer = setInterval(tick, 250);
}

function tick() {
  const now = Date.now();
  let changed = false;

  // Age visible banners
  const survivors = [];
  for (const b of visible) {
    if (b.persistent || b.requiresAction || b.ttlRemaining === Infinity) {
      survivors.push(b); continue;
    }
    if (b.paused) { survivors.push(b); continue; }
    b.ttlRemaining -= 250;
    if (b.ttlRemaining <= 0) {
      // Aged out → move to overflow (so user can still find it briefly)
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

  // Sweep overflow older than 24h
  const beforeOv = overflow.length;
  overflow = overflow.filter((b) => now - (b.agedAt || b.lastTs) < OVERFLOW_MAX_AGE_MS);
  if (overflow.length !== beforeOv) changed = true;

  // Stop the loop when nothing to age
  if (!visible.length && !overflow.length) {
    clearInterval(agingTimer);
    agingTimer = null;
  }

  if (changed) notify();
}
