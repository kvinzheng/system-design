import React from 'react';

const BG = { high: '#fef2f2', medium: '#eff6ff', low: '#f9fafb' };
const BORDER = { high: '#dc2626', medium: '#0078d4', low: '#9ca3af' };
const ICON = { high: '⭐', medium: '✉️', low: '·' };

export default function Banner({ priority, message, onOpen, onDismiss }) {
  return (
    <div style={{ ...styles.wrap, background: BG[priority], borderLeft: `4px solid ${BORDER[priority]}` }}>
      <span style={styles.icon}>{ICON[priority]}</span>
      <div style={styles.text}>
        <div style={styles.title}><b>{message.fromName || message.fromAddress}</b> · <span>{priority.toUpperCase()}</span></div>
        <div style={styles.subj}>{message.subject}</div>
      </div>
      <button onClick={onOpen} style={styles.open}>Open</button>
      <button onClick={onDismiss} style={styles.x}>✕</button>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #e5e7eb' },
  icon: { fontSize: 18 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, color: '#6b7280' },
  subj: { fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  open: { background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 },
  x: { background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#6b7280' },
};
