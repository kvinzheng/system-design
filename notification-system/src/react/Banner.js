import React from 'react';
const h = React.createElement;

const BG     = { high: '#fef2f2', medium: '#eff6ff', low: '#f9fafb' };
const BORDER = { high: '#dc2626', medium: '#2563eb', low: '#9ca3af' };
const ICON   = { high: '\u2b50', medium: '\ud83d\udd14', low: '\u00b7' };

export default function Banner(props) {
  const { priority, title, body, summary, count, onOpen, onDismiss, onMouseEnter, onMouseLeave } = props;
  const isSummary = !!summary;
  const isRollingMedium = priority === 'medium' && count > 1 && !isSummary;
  const ariaLive = priority === 'high' ? 'assertive' : 'polite';

  const displayTitle = isRollingMedium
    ? `${count} new notifications`
    : (title || 'Notification');

  return h('div', {
    role: 'status', 'aria-live': ariaLive, onMouseEnter, onMouseLeave,
    style: { ...styles.card, background: BG[priority], borderLeft: `4px solid ${BORDER[priority]}` },
  },
    h('span', { style: styles.icon, 'aria-hidden': true }, ICON[priority]),
    h('div', { style: styles.text },
      h('div', { style: styles.titleRow },
        h('b', null, displayTitle),
        !isRollingMedium && !isSummary && count > 1
          ? h('span', { style: styles.countPill }, `\u00d7${count}`)
          : null,
        h('span', { style: styles.tier }, priority.toUpperCase()),
      ),
      body ? h('div', { style: styles.body }, body) : null,
    ),
    h('div', { style: styles.actions },
      onOpen ? h('button', { onClick: onOpen, style: styles.open }, 'Open') : null,
      h('button', { onClick: onDismiss, style: styles.x, 'aria-label': 'Dismiss' }, '\u2715'),
    ),
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
  titleRow: { fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 },
  tier: { fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.4 },
  countPill: { background: '#111827', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 },
  body: { fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
  actions: { display: 'flex', alignItems: 'center', gap: 4 },
  open: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  x: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#6b7280', padding: '6px 4px' },
};
