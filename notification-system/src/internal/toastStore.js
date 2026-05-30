// Module-singleton toast store. Pure JS, no React.
//
// Why a singleton instead of putting toasts in the reducer?
//   - Different visual model (slide-in, per-toast timer w/ hover-pause)
//     than the persistent banner stack.
//   - Lets non-React callers (interceptors, workers) push toasts too.
//
// Coalescing: if an incoming toast has the same `groupKey` as a live one,
// we bump its count + refresh createdAt instead of pushing a new row.
// This mirrors the banner stack's medium:rolling behavior.

const DEFAULT_DURATION = 5000;

export const toastStore = (() => {
  let toasts = [];
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  return {
    getSnapshot: () => toasts,

    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    add: (t) => {
      const groupKey = t.groupKey;
      if (groupKey) {
        const existing = toasts.find((x) => x.groupKey === groupKey);
        if (existing) {
          toasts = toasts.map((x) =>
            x.groupKey === groupKey
              ? {
                  ...x,
                  count: (x.count || 1) + 1,
                  message: t.message || x.message,
                  body: t.body || x.body,
                  type: t.type || x.type,
                  createdAt: Date.now(),
                  duration: t.duration ?? x.duration,
                }
              : x,
          );
          emit();
          return existing.id;
        }
      }
      const id = t.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      toasts = [...toasts, {
        id,
        createdAt: Date.now(),
        duration: DEFAULT_DURATION,
        type: 'info',
        count: 1,
        ...t,
      }];
      emit();
      return id;
    },

    remove: (id) => {
      const next = toasts.filter((t) => t.id !== id);
      if (next.length === toasts.length) return;
      toasts = next;
      emit();
    },

    update: (id, patch) => {
      toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
      emit();
    },

    clear: () => {
      if (toasts.length === 0) return;
      toasts = [];
      emit();
    },
  };
})();

// Imperative API — call from anywhere, including non-React code.
export function toast(message, opts = {}) {
  return toastStore.add({ message, ...opts });
}
toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
toast.error   = (msg, opts) => toast(msg, { ...opts, type: 'error' });
toast.info    = (msg, opts) => toast(msg, { ...opts, type: 'info' });
toast.dismiss = (id) => toastStore.remove(id);
