// Host component that subscribes to the toast store and renders one
// <Toast /> per live entry. Owns no state of its own — pure projection.
//
// Each <Toast /> owns its own setTimeout (wall-clock based, so updates
// don't lose remaining time) and pauses on hover.

import React from 'react';
import { toastStore } from '../internal/toastStore.js';

const COLORS = {
  success: { bg: '#ecfdf5', border: '#10b981', icon: '\u2713' },
  error:   { bg: '#fef2f2', border: '#ef4444', icon: '!' },
  info:    { bg: '#eff6ff', border: '#3b82f6', icon: 'i' },
  digest:  { bg: '#f9fafb', border: '#9ca3af', icon: '\u00b7' }, // low-priority batch
};

function useToasts() {
  return React.useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
}

function Toast({ toast: t, onDismiss }) {
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || t.duration === Infinity) return;
    const elapsed = Date.now() - t.createdAt;
    const remaining = Math.max(0, t.duration - elapsed);
    const timer = setTimeout(() => onDismiss(t.id), remaining);
    return () => clearTimeout(timer);
  }, [paused, t.id, t.duration, t.createdAt, onDismiss]);

  const color = COLORS[t.type] || COLORS.info;
  const count = t.count || 1;

  return (
    <div
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
        minWidth: 280,
        maxWidth: 380,
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',
        animation: 'pn_toastIn 180ms ease-out',
      }}
    >
      <span aria-hidden style={{ fontSize: 16 }}>{color.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.message || t.title || ''}
          </span>
          {count > 1 && (
            <span style={{ background: '#111827', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
              {`\u00d7${count}`}
            </span>
          )}
        </div>
        {t.body && (
          <div style={{ fontSize: 12, color: '#374151', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.body}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: '4px 6px' }}
      >
        {'\u2715'}
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useToasts();
  return (
    <>
      <style>{`@keyframes pn_toastIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }`}</style>
      <div
        aria-label="Toast notifications"
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={toastStore.remove} />
        ))}
      </div>
    </>
  );
}
