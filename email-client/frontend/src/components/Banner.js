import React from 'react';

const BG = { high: '#fef2f2', medium: '#eff6ff', low: '#f9fafb' };
const BORDER = { high: '#dc2626', medium: '#0078d4', low: '#9ca3af' };
const ICON = { high: '⭐', medium: '✉️', low: '·' };

export default function Banner({
  priority,
  message,
  summary,
  count,
  onOpen,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}) {
  const isSummary = !!summary;
  const ariaLive = priority === 'high' ? 'assertive' : 'polite';

  const title = isSummary
    ? `${summary.count} new messages`
    : (message.fromName || message.fromAddress);

  const subj = isSummary
    ? summary.messages.slice(0, 3).map((m) => m.subject).join(' · ') +
      (summary.count > 3 ? ` …+${summary.count - 3}` : '')
    : message.subject;

  return (
    <div
      role="status"
      aria-live={ariaLive}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ ...styles.wrap, background: BG[priority], borderLeft: `4px solid ${BORDER[priority]}` }}
    >
      <span style={styles.icon} aria-hidden>{ICON[priority]}</span>
      <div style={styles.text}>
        <div style={styles.title}>
          <b>{title}</b> · <span>{priority.toUpperCase()}</span>
          {count > 1 && <span style={styles.countPill}>×{count}</span>}
        </div>
        <div style={styles.subj}>{subj}</div>
      </div>
      <button onClick={onOpen} style={styles.open}>Open</button>
      <button onClick={onDismiss} style={styles.x} aria-label="Dismiss">✕</button>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #e5e7eb' },
  icon: { fontSize: 18 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 },
  countPill: { background: '#111827', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 },
  subj: { fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  open: { background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 },
  x: { background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#6b7280' },
};
