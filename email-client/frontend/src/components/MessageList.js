import React from 'react';

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

function priorityDot(p) {
  if (p === 'high') return <span title="High priority" style={{ color: '#dc2626', marginRight: 6 }}>●</span>;
  if (p === 'low') return <span title="Low priority" style={{ color: '#9ca3af', marginRight: 6 }}>○</span>;
  return null;
}

export default function MessageList({ items, selectedId, onSelect, loading }) {
  return (
    <div style={styles.wrap}>
      {loading && <div style={styles.status}>Loading…</div>}
      {!loading && items.length === 0 && <div style={styles.status}>No messages</div>}
      {items.map((m) => {
        const isSel = m.id === selectedId;
        return (
          <button key={m.id}
            onClick={() => onSelect(m)}
            style={{ ...styles.row, ...(isSel ? styles.selected : {}), ...(m.read ? {} : styles.unread) }}>
            <div style={styles.rowTop}>
              <span style={styles.from}>
                {priorityDot(m.priority)}
                {m.fromName || m.fromAddress}
              </span>
              <span style={styles.time}>{formatTime(m.receivedAt)}</span>
            </div>
            <div style={styles.subject}>{m.subject || '(no subject)'}</div>
            <div style={styles.snippet}>{(m.body || '').slice(0, 80)}</div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  wrap: { background: '#fff', borderRight: '1px solid #e5e7eb', overflowY: 'auto' },
  status: { padding: 24, color: '#6b7280', textAlign: 'center' },
  row: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f3f4f6', background: 'transparent', cursor: 'pointer' },
  selected: { background: '#e0eaff' },
  unread: { background: '#f5faff' },
  rowTop: { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  from: { fontWeight: 600 },
  time: { color: '#6b7280', fontSize: 12 },
  subject: { fontSize: 13, margin: '2px 0', color: '#111' },
  snippet: { fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
