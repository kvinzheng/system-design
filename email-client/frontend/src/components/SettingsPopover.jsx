import React, { useEffect, useState } from 'react';
import { getPrefs, setPrefs, subscribePrefs } from '../prefs';

export default function SettingsPopover({ onClose }) {
  const [prefs, setLocal] = useState(getPrefs());

  useEffect(() => subscribePrefs(setLocal), []);

  const update = (patch) => setPrefs(patch);

  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.popover} role="dialog" aria-label="Notification preferences">
        <div style={styles.title}>Notification preferences</div>

        <Section label="Density">
          <select
            value={prefs.density}
            onChange={(e) => update({ density: e.target.value })}
            style={styles.select}
          >
            <option value="compact">Compact (1 banner)</option>
            <option value="normal">Normal (up to 3)</option>
            <option value="spacious">Spacious (up to 5)</option>
          </select>
        </Section>

        <Section label="Focus mode">
          <label style={styles.row}>
            <input
              type="checkbox"
              checked={prefs.focusMode}
              onChange={(e) => update({ focusMode: e.target.checked })}
            />
            <span style={styles.help}>Only high-priority interrupts. Medium goes silently to overflow.</span>
          </label>
        </Section>

        <Section label="Quiet hours">
          <label style={styles.row}>
            <input
              type="checkbox"
              checked={!!prefs.quietHours}
              onChange={(e) =>
                update({ quietHours: e.target.checked ? { start: 22, end: 7 } : null })
              }
            />
            <span style={styles.help}>Silence non-urgent mail during these hours.</span>
          </label>
          {prefs.quietHours && (
            <div style={styles.timeRow}>
              <span>From</span>
              <select
                value={prefs.quietHours.start}
                onChange={(e) =>
                  update({ quietHours: { ...prefs.quietHours, start: Number(e.target.value) } })
                }
                style={styles.select}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
              <span>to</span>
              <select
                value={prefs.quietHours.end}
                onChange={(e) =>
                  update({ quietHours: { ...prefs.quietHours, end: Number(e.target.value) } })
                }
                style={styles.select}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          )}
        </Section>

        <div style={styles.footer}>
          <button style={styles.done} onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.label}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  scrim: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 50 },
  popover: {
    position: 'fixed', top: 60, right: 16, width: 340, background: '#fff',
    color: '#111', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
    padding: 16, zIndex: 51,
  },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  section: { marginBottom: 14 },
  label: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, fontWeight: 700 },
  row: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 },
  help: { color: '#6b7280', fontSize: 12 },
  select: { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 },
  footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
  done: { background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 },
};
