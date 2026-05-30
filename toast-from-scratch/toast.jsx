// ─────────────────────────────────────────────────────────────────────────────
// Toast from scratch.
//
// Read this top-to-bottom. Five sections:
//   1. The store     — plain JS, no React. The source of truth.
//   2. toast()       — the imperative API you call from anywhere.
//   3. useToasts()   — hook that subscribes React to the store.
//   4. <Toaster />   — the host component that renders the stack.
//   5. <Demo />      — the page that fires toasts.
//
// Why a store, not React state?
//   Because real apps need to fire toasts from places that aren't React:
//   service workers, fetch interceptors, WebSocket handlers, route guards.
//   A module-level singleton means `toast('hi')` works from anywhere.
//   The React tree just *observes* the store.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { createRoot } from 'react-dom/client';

// ─── 1. THE STORE ────────────────────────────────────────────────────────────
//
// A store has three jobs:
//   - hold state (the array of live toasts)
//   - let callers mutate state
//   - notify listeners when state changes
//
// That's it. No framework needed.

const store = (() => {
  let toasts = [];                  // current state
  const listeners = new Set();      // functions to call on change

  // Tell every subscriber that state changed.
  // React's useSyncExternalStore will trigger a re-render.
  const emit = () => listeners.forEach((fn) => fn());

  return {
    // React calls this to read the current value.
    // MUST return the SAME reference if nothing changed, or React will
    // re-render forever. That's why we replace the array on every mutation.
    getSnapshot: () => toasts,

    // React calls this to subscribe; returns the unsubscribe function.
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Add a toast. Returns the id so callers can dismiss it later.
    add: (toast) => {
      const id = toast.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const next = { id, createdAt: Date.now(), duration: 4000, type: 'info', ...toast };
      toasts = [...toasts, next];   // new array reference → React sees change
      emit();
      return id;
    },

    remove: (id) => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    },

    update: (id, patch) => {
      toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
      emit();
    },
  };
})();

// ─── 2. THE IMPERATIVE API ───────────────────────────────────────────────────
//
// This is what app code actually calls. Notice it's a plain function, not a
// hook. It works in event handlers, async callbacks, anywhere.

export function toast(message, opts = {}) {
  return store.add({ message, ...opts });
}

// Conveniences. Mirror what Sonner / react-hot-toast offer.
toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
toast.error   = (msg, opts) => toast(msg, { ...opts, type: 'error' });
toast.info    = (msg, opts) => toast(msg, { ...opts, type: 'info' });
toast.dismiss = (id) => store.remove(id);

// Promise integration — show "loading", then flip to success/error.
toast.promise = (promise, { loading, success, error }) => {
  const id = toast(loading, { type: 'info', duration: Infinity });
  promise.then(
    (val) => store.update(id, {
      message: typeof success === 'function' ? success(val) : success,
      type: 'success',
      duration: 4000,
      createdAt: Date.now(),       // restart the TTL clock
    }),
    (err) => store.update(id, {
      message: typeof error === 'function' ? error(err) : error,
      type: 'error',
      duration: 4000,
      createdAt: Date.now(),
    }),
  );
  return promise;
};

// Builder API — build the toast first, call .add() to actually show it.
//
//   const t = toast.create('Uploading…')
//                  .type('info')
//                  .duration(Infinity)
//                  .add();          // ← NOW it appears on screen
//
//   t.update({ message: 'Done', type: 'success' });
//   t.dismiss();
//
// Same store.add under the hood — this is just a different SHAPE of API
// on top of it. Useful when a toast has many configuration steps OR when
// you'll mutate it repeatedly and don't want to track an id by hand.

toast.create = (message) => {
  // Config accumulates here until .add() is called.
  const config = { message, type: 'info', duration: 4000 };
  let id = null;

  const instance = {
    // ── builders (mutate config, return self for chaining) ──
    type:     (v) => { config.type = v;     return instance; },
    duration: (v) => { config.duration = v; return instance; },
    message:  (v) => { config.message = v;  return instance; },

    // ── actions ──
    add: () => {
      if (id !== null) return instance;            // already shown — no-op
      id = store.add({ ...config });
      return instance;
    },
    update: (patch) => {
      if (id === null) return instance;            // not shown yet — no-op
      store.update(id, { ...patch, createdAt: Date.now() });
      return instance;
    },
    dismiss: () => {
      if (id === null) return instance;
      store.remove(id);
      id = null;
      return instance;
    },

    get id() { return id; },
  };
  return instance;
};

// ─── 3. THE HOOK ─────────────────────────────────────────────────────────────
//
// useSyncExternalStore is React's official primitive for subscribing to
// external (non-React) state. It handles tearing in concurrent mode, SSR,
// the whole story. Before React 18 you'd write this with useEffect +
// useState and it would be subtly broken. Now it's one line.

function useToasts() {
  return React.useSyncExternalStore(store.subscribe, store.getSnapshot);
}

// ─── 4. THE COMPONENTS ───────────────────────────────────────────────────────

// One toast. Dumb visual leaf. Owns ONE thing: its own auto-dismiss timer.
//
// Why is the timer in the Toast (not the store)?
//   Because the timer needs to pause on hover. Putting it here means each
//   toast manages its own clock and the store stays a dumb data bag.
//   If you wanted aging in the store you'd add a tick action — see the
//   sibling notification-system/ package for that approach.

function Toast({ toast: t, onDismiss }) {
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || t.duration === Infinity) return;
    // How much time is left? duration minus time-already-shown.
    const elapsed = Date.now() - t.createdAt;
    const remaining = Math.max(0, t.duration - elapsed);
    const timer = setTimeout(() => onDismiss(t.id), remaining);
    return () => clearTimeout(timer);
    // Re-run if paused changes or duration changes (promise upgrade).
  }, [paused, t.id, t.duration, t.createdAt, onDismiss]);

  const color = COLORS[t.type] || COLORS.info;

  return (
    <div
      // role="status" + aria-live = screen readers announce it.
      // "assertive" interrupts; "polite" waits for a pause.
      role="status"
      aria-live={t.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: color.bg,
        borderLeft: `4px solid ${color.border}`,
        color: '#111',
        padding: '12px 14px',
        borderRadius: 10,
        minWidth: 260,
        maxWidth: 380,
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',     // re-enable; the host disables for click-through
        animation: 'toastIn 180ms ease-out',
      }}
    >
      <span aria-hidden style={{ fontSize: 16 }}>{color.icon}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#6b7280', fontSize: 14, padding: '4px 6px',
        }}
      >×</button>
    </div>
  );
}

const COLORS = {
  success: { bg: '#ecfdf5', border: '#10b981', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#ef4444', icon: '!' },
  info:    { bg: '#eff6ff', border: '#3b82f6', icon: 'i' },
};

// The host. One per app. Subscribes to the store, fans out to <Toast />.
//
// pointerEvents: 'none' on the container so empty gaps don't block clicks
// on the page underneath. Each Toast re-enables it on itself.

export function Toaster() {
  const toasts = useToasts();
  return (
    <>
      <style>{`@keyframes toastIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }`}</style>
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={store.remove} />
        ))}
      </div>
    </>
  );
}

// ─── 5. THE DEMO ─────────────────────────────────────────────────────────────

function Demo() {
  return (
    <>
      <Toaster />
      <div className="row">
        <button onClick={() => toast('Hello there')}>info toast</button>
        <button onClick={() => toast.success('Saved successfully')}>success</button>
        <button onClick={() => toast.error('Something broke')}>error</button>
        <button
          onClick={() => toast('Sticky — won\'t auto-dismiss', { duration: Infinity })}
        >sticky</button>
        <button
          onClick={() => {
            // Fire 8 quickly to see the stack behavior.
            for (let i = 0; i < 8; i++) toast(`Burst #${i + 1}`);
          }}
        >burst 8</button>
        <button
          onClick={() => {
            // Promise pattern — loading → success/error.
            const p = new Promise((resolve, reject) =>
              setTimeout(() => (Math.random() < 0.5 ? resolve() : reject()), 1500),
            );
            toast.promise(p, {
              loading: 'Saving…',
              success: 'Saved',
              error: 'Failed to save',
            });
          }}
        >promise (50/50)</button>
        <button
          onClick={() => {
            // Builder pattern — create, configure, then .add().
            // Then mutate via the same handle 1s and 2s later, dismiss at 3s.
            const t = toast.create('Step 1: starting…')
                           .type('info')
                           .duration(Infinity)
                           .add();
            setTimeout(() => t.update({ message: 'Step 2: working…' }), 1000);
            setTimeout(() => t.update({ message: 'Step 3: almost done…' }), 2000);
            setTimeout(() => t.update({ message: 'Done!', type: 'success' }).duration(2000), 3000);
          }}
        >builder (.create().add())</button>
      </div>
    </>
  );
}

// Mount.
createRoot(document.getElementById('app')).render(<Demo />);

// ─── EXTENSIONS YOU CAN ADD NEXT ─────────────────────────────────────────────
//
// 1. Cap visible count + overflow tray
//    In <Toaster />, slice the array: visible = toasts.slice(-5),
//    overflow = toasts.slice(0, -5). Show a "+N more" pill for overflow.
//
// 2. Dedupe identical messages
//    In store.add, check if last toast has same message within 1000ms —
//    bump its count instead of pushing new. Display as "Message ×3".
//
// 3. Exit animation
//    Don't remove on click; mark { exiting: true }, animate via CSS,
//    setTimeout(() => store.remove(id), 200) after animation completes.
//    Or use Framer Motion's <AnimatePresence /> for free.
//
// 4. Swipe-to-dismiss
//    pointerdown → pointermove → pointerup. Track deltaX, transform the
//    toast, remove if |deltaX| > 80px. Radix Toast does this well.
//
// 5. Priority tiers
//    Add `priority: 'high' | 'medium' | 'low'`. High pins to top, never
//    auto-dismisses, requires explicit dismiss. See the sibling
//    notification-system/ package for that whole arc.
//
// 6. Persistence across reloads
//    Subscribe a listener that writes toasts to localStorage; load on init.
//    Only useful for "sticky" notifications you don't want to lose.
//
// 7. SSR safety
//    useSyncExternalStore needs a `getServerSnapshot` arg for SSR; return
//    [] so the server renders nothing.
