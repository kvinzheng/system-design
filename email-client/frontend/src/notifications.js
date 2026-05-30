// Production-style notification policy with per-tier coalescing.
//
//   high   — one OS notification + one banner per message, sound (debounced),
//            banner is persistent (no auto-dismiss). aria-live=assertive.
//   medium — coalesced: bursts collapse into "N new messages" (one banner,
//            one OS popup only when tab hidden, silent). aria-live=polite.
//            Auto-dismiss after 5s.
//   low    — no OS popup, no banner, no sound. Badge bump only.
//
// Bursts are flushed every 500ms so 12 messages arriving back-to-back
// produce 1–2 banners, not 12 stacked toasts.

import { addBanner } from './notificationStack';

const FLUSH_MS = 500;
const HIGH_SOUND_DEBOUNCE_MS = 1500;

let permission = 'default';
let queues = { high: [], medium: [], low: [] };
let flushTimer = null;
let lastSoundAt = 0;

export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') {
    permission = Notification.permission;
    return permission;
  }
  permission = await Notification.requestPermission();
  return permission;
}

function playBlip() {
  const now = Date.now();
  if (now - lastSoundAt < HIGH_SOUND_DEBOUNCE_MS) return;
  lastSoundAt = now;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.start(); o.stop(ctx.currentTime + 0.3);
  } catch {}
}

// Public entry point. Called for every incoming mail message.
// Enqueues by tier and schedules a flush on the next tick.
export function notifyNewMail(message) {
  const priority = message.priority || 'medium';
  queues[priority].push(message);

  // Badge bump is immediate for every tier — even low.
  window.dispatchEvent(new CustomEvent('mail:badge', { detail: { priority } }));

  if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
}

function osNotify({ title, body, tag, silent, openMessage }) {
  if (permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // tab is active, banner is enough
  try {
    const n = new Notification(title, { body, tag, silent });
    n.onclick = () => {
      window.focus();
      if (openMessage) {
        window.dispatchEvent(new CustomEvent('mail:open', { detail: openMessage }));
      }
    };
  } catch {}
}

function flush() {
  flushTimer = null;
  const high = queues.high; queues.high = [];
  const medium = queues.medium; queues.medium = [];
  const low = queues.low; queues.low = []; // drained, but produces no UI

  // HIGH: one banner per message (persistent), one OS push per message,
  // one debounced sound for the whole burst.
  for (const m of high) {
    addBanner({ priority: 'high', message: m, persistent: true });
    osNotify({
      title: `⭐ ${m.fromName || m.fromAddress}`,
      body: `${m.subject}\n${(m.body || '').slice(0, 120)}`,
      tag: m.id,
      silent: false,
      openMessage: m,
    });
  }
  if (high.length) playBlip();

  // MEDIUM: coalesce. 1 message → personal banner. N messages → summary banner.
  if (medium.length === 1) {
    const m = medium[0];
    addBanner({ priority: 'medium', message: m });
    osNotify({ title: m.fromName || m.fromAddress, body: m.subject, tag: m.id, silent: true, openMessage: m });
  } else if (medium.length > 1) {
    addBanner({
      priority: 'medium',
      summary: { count: medium.length, messages: medium },
    });
    osNotify({
      title: `${medium.length} new messages`,
      body: medium.slice(0, 3).map((m) => m.subject).join(' · '),
      tag: `burst:${Date.now()}`,
      silent: true,
      openMessage: medium[0],
    });
  }
  // LOW: intentionally nothing. Badge already bumped above.
}

// Test seam — let App reset state on unmount in dev/HMR.
export function _resetNotifications() {
  queues = { high: [], medium: [], low: [] };
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
}
