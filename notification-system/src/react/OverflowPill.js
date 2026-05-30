import React, { useState } from 'react';
const h = React.createElement;

export default function OverflowPill({ items, onOpen, onDismiss, onClearAll }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return h('div', { style: styles.wrap },
    h('button', { style: styles.pill, onClick: () => setOpen((v) => !v) },
      h('span', null, `\u2193 ${items.length} more notification${items.length === 1 ? '' : 's'}`),
      h('span', { style: styles.caret }, open ? '\u25b4' : '\u25be'),
    ),
    open ? h('div', { style: styles.drawer },
      ...items.map((b) =>
        h('div', { key: b.id, style: styles.row },
          h('span', { style: styles.dot(b.priority) }),
          h('div', { style: styles.body },
            h('div', { style: styles.title }, `${b.title}${b.count > 1 ? ` \u00d7${b.count}` : ''}`),
            b.body ? h('div', { style: styles.subj }, b.body) : null,
          ),
          b.onOpen ? h('button', { style: styles.link, onClick: () => { b.onOpen(); onOpen && onOpen(b); } }, 'Open') : null,
          h('button', { style: styles.x, onClick: () => onDismiss(b.id), 'aria-label': 'Dismiss' }, '\u2715'),
        )
      ),
      h('div', { style: styles.footer },
        h('button', { style: styles.clearAll, onClick: onClearAll }, 'Clear all'),
      ),
    ) : null,
  );
}

const styles = {
  wrap: { borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', pointerEvents: 'auto', width: 360 },
  pill: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', padding: '8px 16px', border: 'none', background: '#f9fafb',
    color: '#374151', fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
  caret: { fontSize: 12 },
  drawer: { maxHeight: 280, overflowY: 'auto', background: '#fff', borderTop: '1px solid #e5e7eb' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #f3f4f6' },
  dot: (p) => ({
    width: 8, height: 8, borderRadius: 4,
    background: p === 'high' ? '#dc2626' : p === 'medium' ? '#2563eb' : '#9ca3af',
    flexShrink: 0,
  }),
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subj: { fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  link: { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  x: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#9ca3af' },
  footer: { padding: '6px 16px', textAlign: 'right' },
  clearAll: { background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
};
