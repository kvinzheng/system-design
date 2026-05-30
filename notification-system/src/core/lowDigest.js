// Windowed low-priority digest synthesizer.
//
// Production rule: low priority never produces a per-item toast, but every
// N minutes if the queue is non-empty, fire ONE summary toast:
//   "12 low-priority notifications in the last hour"
//
// Window is configurable. Demo apps typically use 30-60s; production: 1h.

import { addBanner } from './stack';

let windowMs = 60_000; // default 1 minute (demo-friendly)
let queue = [];
let timer = null;
let digestTitle = (count) => `${count} low-priority notifications`;

export function configureDigest({ windowMs: w, digestTitle: dt } = {}) {
  if (typeof w === 'number') windowMs = w;
  if (typeof dt === 'function') digestTitle = dt;
}

export function enqueueLow(item) {
  queue.push(item);
  ensureTimer();
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(flush, windowMs);
}

function flush() {
  if (!queue.length) {
    clearInterval(timer); timer = null;
    return;
  }
  const batch = queue; queue = [];
  addBanner({
    priority: 'medium',
    title: digestTitle(batch.length),
    body: batch.slice(0, 3).map((i) => i.title).filter(Boolean).join(' · '),
    summary: { count: batch.length, items: batch, kind: 'digest' },
    groupKey: `digest:${Date.now()}`,
  });
}

export function _peekQueue() { return [...queue]; }
