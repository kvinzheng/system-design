import React from 'react';

const LABELS = { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', outbox: 'Outbox', trash: 'Trash' };
const ICONS = { inbox: '📥', sent: '📤', drafts: '📝', outbox: '⏳', trash: '🗑️' };

export default function Sidebar({ folders, active, counts, onSelect }) {
  return (
    <nav style={styles.nav}>
      {folders.map((f) => (
        <button key={f}
          onClick={() => onSelect(f)}
          style={{ ...styles.item, ...(f === active ? styles.active : {}) }}>
          <span>{ICONS[f]} {LABELS[f]}</span>
          {counts[f] > 0 && <span style={styles.count}>{counts[f]}</span>}
        </button>
      ))}
    </nav>
  );
}

const styles = {
  nav: { background: '#fafafa', borderRight: '1px solid #e5e7eb', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 6, fontSize: 14 },
  active: { background: '#e0eaff', fontWeight: 700, color: '#0078d4' },
  count: { background: '#0078d4', color: '#fff', borderRadius: 10, padding: '0 8px', fontSize: 12, fontWeight: 700 },
};
