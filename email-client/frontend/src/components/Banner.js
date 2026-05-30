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
  const isRollingMedium = priority === 'medium' && count > 1;
  const ariaLive = priority === 'high' ? 'assertive' : 'polite';

  const title = isSummary
    ? `${summary.count} new messages`
    : isRollingMedium
      ? `${count} new messages`
      : (message?.fromName || message?.fromAddress || 'New message');

  const subj = isSummary
    ? summary.messages.slice(0, 2).map((m) => m.subject).join(' · ') +
      (summary.count > 2 ? ` …+${summary.count - 2}` : '')
    : isRollingMedium
      ? (message?.subject || '')
      : (message?.subject || '');

  return (
    <div
      role="status"
      aria-live={ariaLive}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ ...styles.card, background: BG[priority], borderLeft: `4px solid ${BORDER[priority]}` }}
    >
      <span style={styles.icon} aria-hidden>{ICON[priority]}</span>
      <div style={styles.text}>
        <div style={styles.title}>
          <b>{title}</b>
          {!isRollingMedium && !isSummary && count > 1 && (
            <span style={styles.countPill}>×{count}</span>
          )}
          <span style={styles.tier}>{priority.toUpperCase()}</span>
        </div>
        <div style={styles.subj}>{subj}</div>
      </div>
      <div style={styles.actions}>
        <button onClick={onOpen} style={styles.open}>Open</button>
        <button onClick={onDismiss} style={styles.x} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    pointerEvents: 'auto', width: 360,
  },
  icon: { fontSize: 18 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 },
  tier: { fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.4 },
  countPill: { background: '#111827', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 },
  subj: { fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
  actions: { display: 'flex', alignItems: 'center', gap: 4 },
  open: { background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  x: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#6b7280', padding: '6px 4px' },
};
