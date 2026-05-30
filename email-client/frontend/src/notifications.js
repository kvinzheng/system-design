// Notification policy. Each new mail has a priority; the client renders it differently:
//
//   high   — OS notification (with body), in-app banner, sound, badge bump
//   medium — OS notification (title only), in-app banner, badge bump
//   low    — silent badge bump only (no popup, no sound)
//
// This mirrors how Outlook / Apple Mail distinguish VIP & Focused Inbox alerts.

let permission = 'default';

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

export function notifyNewMail(message, { onClick } = {}) {
  const priority = message.priority || 'medium';
  // 1. OS notification — only for high & medium
  if (priority !== 'low' && permission === 'granted' && document.visibilityState !== 'visible') {
    const title = priority === 'high'
      ? `⭐ ${message.fromName || message.fromAddress}`
      : message.fromName || message.fromAddress;
    const body = priority === 'high'
      ? `${message.subject}\n${(message.body || '').slice(0, 120)}`
      : message.subject;
    const n = new Notification(title, { body, tag: message.id });
    if (onClick) n.onclick = () => { window.focus(); onClick(message); };
  }
  // 2. Sound — only for high
  if (priority === 'high') playBlip();
  // 3. In-app banner event — bus pattern, App listens
  window.dispatchEvent(new CustomEvent('mail:banner', { detail: { message, priority } }));
}
