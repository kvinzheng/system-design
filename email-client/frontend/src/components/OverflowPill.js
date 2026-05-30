import React, { useState } from 'react';

// Collapsed pill that expands into a drawer of evicted/aged banners.
// Mirrors macOS Notification Center grouping.
export default function OverflowPill({ items, onOpen, onDismiss, onClearAll }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <div style={styles.wrap}>
      <button style={styles.pill} onClick={() => setOpen((v) => !v)}>
        <span>↓ {items.length} more notification{items.length === 1 ? '' : 's'}</span>
        <span style={styles.caret}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={styles.drawer}>
          {items.map((b) => {
            const title = b.summary
              ? `${b.summary.count} new messages`
              : (b.message?.fromName || b.message?.fromAddress || 'Unknown');
            const subj = b.summary
              ? b.summary.messages.slice(0, 2).map((m) => m.subject).join(' · ')
              : (b.message?.subject || '');
            return (
              <div key={b.id} style={styles.row}>
                <span style={styles.dot(b.priority)} />
                <div style={styles.body}>
                  <div style={styles.title}>{title}{b.count > 1 ? ` ×${b.count}` : ''}</div>
                  <div style={styles.subj}>{subj}</div>
                </div>
                <button style={styles.link} onClick={() => onOpen(b)}>Open</button>
                <button style={styles.x} onClick={() => onDismiss(b.id)} aria-label="Dismiss">✕</button>
              </div>
            );
          })}
          <div style={styles.footer}>
            <button style={styles.clearAll} onClick={onClearAll}>Clear all</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  pill: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', padding: '6px 16px', border: 'none', background: 'transparent',
    color: '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
  caret: { fontSize: 12 },
  drawer: { maxHeight: 280, overflowY: 'auto', background: '#fff', borderTop: '1px solid #e5e7eb' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #f3f4f6' },
  dot: (p) => ({
    width: 8, height: 8, borderRadius: 4,
    background: p === 'high' ? '#dc2626' : p === 'medium' ? '#0078d4' : '#9ca3af',
    flexShrink: 0,
  }),
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subj: { fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  link: { background: 'transparent', border: 'none', color: '#0078d4', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  x: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#9ca3af' },
  footer: { padding: '6px 16px', textAlign: 'right' },
  clearAll: { background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
};
