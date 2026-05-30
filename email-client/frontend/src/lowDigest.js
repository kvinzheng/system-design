// Hourly digest synthesizer for low-priority messages.
//
// Production rule: low priority never produces a per-message toast, but every
// N minutes if the queue is non-empty, fire ONE summary toast:
//   "12 low-priority messages in the last hour"
//
// Demo uses a 60s window so the behavior is observable.

import { addBanner } from './notificationStack';

const WINDOW_MS = 60_000;  // 1 minute in demo; in prod: 60 * 60 * 1000
let queue = [];
let timer = null;

export function enqueueLow(message) {
  queue.push(message);
  ensureTimer();
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(flush, WINDOW_MS);
}

function flush() {
  if (!queue.length) {
    clearInterval(timer); timer = null;
    return;
  }
  const batch = queue; queue = [];
  // Synthesize a single LOW-tier banner with summary payload. The stack treats
  // it as medium-weight so it actually renders (low is suppressed by default).
  addBanner({
    priority: 'medium',
    summary: { count: batch.length, messages: batch, kind: 'digest' },
    autoDismissMs: 8000,
    digest: true,
  });
}

export function _peekQueue() { return [...queue]; } // test seam
