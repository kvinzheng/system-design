import React from 'react';

export default function OverflowPill({ count, open, onToggle, items, onDismiss, onClearAll }) {
  return (
    <div style={styles.wrap}>
      <button onClick={onToggle} style={styles.pill} aria-expanded={open}>
        {open ? '\u25b2' : '\u2193'}{' '}
        {`${count} more notification${count === 1 ? '' : 's'}`}
      </button>
      {open && (
        <div style={styles.tray}>
          {items.slice(0, 10).map((b) => (
            <div key={b.id} style={styles.item}>
              <span style={{ ...styles.dot, background: dotColor(b.priority) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.title}>{b.title}</div>
                {b.body && <div style={styles.body}>{b.body}</div>}
              </div>
              <button onClick={() => onDismiss(b.id)} style={styles.x}>{'\u2715'}</button>
            </div>
          ))}
          {items.length > 0 && (
            <button onClick={onClearAll} style={styles.clear}>Clear all</button>
          )}
        </div>
      )}
    </div>
  );
}

function dotColor(p) { return p === 'high' ? '#dc2626' : p === 'medium' ? '#2563eb' : '#9ca3af'; }

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, pointerEvents: 'auto' },
  pill: { background: '#fff', color: '#111', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer' },
  tray: { width: 360, background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', padding: 8, color: '#111' },
  item: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 8, borderBottom: '1px solid #f1f5f9' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  title: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' },
  body: { fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis' },
  x: { background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 },
  clear: { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 8, width: '100%', textAlign: 'right' },
};
