// Top-level orchestrator: applies the canonical 3-tier policy to every
// incoming item. This is the only entry point most callers need.
//
//   notify({ priority, title, body, surface, groupKey, onOpen, persistent, meta })
//
// Per-tier behavior (canonical matrix):
//   HIGH    — persistent banner per (groupKey), OS push, debounced sound.
//             aria-live=assertive. Stack manager coalesces by groupKey.
//   MEDIUM  — single rolling banner (auto-coalesced).
//             SUPPRESSED entirely if user is already viewing `surface`.
//             Silent OS push only when tab is hidden.
//   LOW     — never toast individually. Pushed into hourly digest.
//             Caller's `onBadge` hook fires for unread-count UIs.
//
// Bursts are flushed every 500ms so 12 items arriving back-to-back produce
// 1-2 banners, not 12 stacked toasts.

import { addBanner } from './stack';
import { isViewingSurface } from './uiContext';
import { enqueueLow } from './lowDigest';
import { osNotify, playBlip } from './osBridge';

const FLUSH_MS = 500;

let queues = { high: [], medium: [], low: [] };
let flushTimer = null;
let onBadge = null;

export function configureNotify({ onBadge: cb } = {}) {
  if (typeof cb === 'function') onBadge = cb;
}

export function notify(input) {
  const priority = input.priority || 'medium';
  if (!queues[priority]) queues[priority] = [];
  queues[priority].push(input);

  if (onBadge) {
    try { onBadge({ priority, item: input }); } catch {}
  }

  if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
}

function flush() {
  flushTimer = null;
  const high   = queues.high;   queues.high = [];
  const medium = queues.medium; queues.medium = [];
  const low    = queues.low;    queues.low = [];

  // HIGH ---------------------------------------------------------------
  for (const i of high) {
    addBanner({ ...i, priority: 'high', persistent: true });
    osNotify({
      title: `\u2b50 ${i.title}`,
      body: i.body || '',
      tag: i.groupKey || i.title,
      silent: false,
      onOpen: i.onOpen,
    });
  }
  if (high.length) playBlip();

  // MEDIUM -------------------------------------------------------------
  // Suppress entirely when user is already looking at the relevant surface
  // (per-item: each item may carry its own `surface`).
  const mediumToShow = medium.filter((i) => !isViewingSurface(i.surface));
  for (const i of mediumToShow) {
    addBanner({ ...i, priority: 'medium' });
  }
  if (mediumToShow.length === 1) {
    const i = mediumToShow[0];
    osNotify({ title: i.title, body: i.body || '', tag: i.groupKey || i.title, silent: true, onOpen: i.onOpen });
  } else if (mediumToShow.length > 1) {
    osNotify({
      title: `${mediumToShow.length} new notifications`,
      body: mediumToShow.slice(0, 3).map((i) => i.title).join(' \u00b7 '),
      tag: `burst:${Date.now()}`,
      silent: true,
      onOpen: mediumToShow[0].onOpen,
    });
  }

  // LOW ----------------------------------------------------------------
  for (const i of low) enqueueLow(i);
}

export function _resetNotify() {
  queues = { high: [], medium: [], low: [] };
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
}
