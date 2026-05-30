// Optional OS-level bridges: Web Notification API + brief audio cue.
// All hooks are no-ops if the runtime doesn't support them.

let permission = 'default';
let lastSoundAt = 0;
let SOUND_DEBOUNCE_MS = 1500;

export function configureOSBridge({ soundDebounceMs } = {}) {
  if (typeof soundDebounceMs === 'number') SOUND_DEBOUNCE_MS = soundDebounceMs;
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') {
    permission = Notification.permission;
    return permission;
  }
  permission = await Notification.requestPermission();
  return permission;
}

export function playBlip() {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_DEBOUNCE_MS) return;
  lastSoundAt = now;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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

export function osNotify({ title, body, tag, silent, onOpen }) {
  if (permission !== 'granted') return;
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
  try {
    const n = new Notification(title, { body, tag, silent });
    n.onclick = () => {
      if (typeof window !== 'undefined') window.focus();
      if (typeof onOpen === 'function') onOpen();
    };
  } catch {}
}
