import React from 'react';
import { useNotifications } from '../context.js';
const h = React.createElement;

export default function SettingsPopover({ onClose }) {
  const { prefs, setPrefs } = useNotifications();

  return h(React.Fragment, null,
    h('div', { style: styles.scrim, onClick: onClose }),
    h('div', { style: styles.popover, role: 'dialog', 'aria-label': 'Notification preferences' },
      h('div', { style: styles.title }, 'Notification preferences'),

      h(Section, { label: 'Density' },
        h('select', {
          value: prefs.density,
          onChange: (e) => setPrefs({ density: e.target.value }),
          style: styles.select,
        },
          h('option', { value: 'compact' }, 'Compact (1 banner)'),
          h('option', { value: 'normal' }, 'Normal (up to 3)'),
          h('option', { value: 'spacious' }, 'Spacious (up to 5)'),
        ),
      ),

      h(Section, { label: 'Focus mode' },
        h('label', { style: styles.row },
          h('input', {
            type: 'checkbox',
            checked: prefs.focusMode,
            onChange: (e) => setPrefs({ focusMode: e.target.checked }),
          }),
          h('span', { style: styles.help }, 'Only high-priority interrupts. Medium goes silently to overflow.'),
        ),
      ),

      h(Section, { label: 'Quiet hours' },
        h('label', { style: styles.row },
          h('input', {
            type: 'checkbox',
            checked: !!prefs.quietHours,
            onChange: (e) => setPrefs({ quietHours: e.target.checked ? { start: 22, end: 7 } : null }),
          }),
          h('span', { style: styles.help }, 'Silence non-urgent notifications during these hours.'),
        ),
      ),

      h('div', { style: styles.footer },
        h('button', { style: styles.done, onClick: onClose }, 'Done'),
      ),
    ),
  );
}

function Section({ label, children }) {
  return h('div', { style: styles.section },
    h('div', { style: styles.label }, label),
    children,
  );
}

const styles = {
  scrim: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 50 },
  popover: { position: 'fixed', top: 60, right: 16, width: 340, background: '#fff', color: '#111', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: 16, zIndex: 51 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  section: { marginBottom: 14 },
  label: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, fontWeight: 700 },
  row: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  help: { color: '#6b7280', fontSize: 12 },
  select: { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 },
  footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
  done: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 },
};
