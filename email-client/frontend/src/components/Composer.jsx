import React, { useState } from 'react';
import { sendMessage, isOnline } from '../api';
import { queueMessage } from '../outbox';

export default function Composer({ initial = {}, onClose, onSent }) {
  const [to, setTo] = useState(initial.to || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.body || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!to.trim()) { setErr('Recipient required'); return; }
    setBusy(true); setErr('');
    const payload = { to, subject, body };
    try {
      if (isOnline()) await sendMessage(payload);
      else queueMessage(payload);
      onSent?.();
    } catch (e) {
      // Network died mid-send → fall back to outbox
      queueMessage(payload);
      onSent?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>New message {!isOnline() && <em style={styles.offlineTag}>— offline, will queue in Outbox</em>}</h3>
          <button onClick={onClose} style={styles.x}>✕</button>
        </div>
        <input style={styles.input} placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
        <input style={styles.input} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea style={styles.body} placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
        {err && <div style={styles.err}>{err}</div>}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.btn}>Cancel</button>
          <button onClick={submit} style={styles.btnPrimary} disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        </div>
        <div style={styles.hint}>
          Tip: send to <code>echo@example.com</code> to trigger an auto-reply (great for testing notifications).
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { width: 560, maxWidth: '95vw', background: '#fff', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  offlineTag: { color: '#b45309', fontWeight: 400, fontSize: 13 },
  x: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 },
  body: { padding: 10, border: '1px solid #d1d5db', borderRadius: 6, minHeight: 180, fontFamily: 'inherit', fontSize: 14 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btn: { padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 },
  btnPrimary: { padding: '8px 16px', border: 'none', borderRadius: 6, background: '#0078d4', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  err: { color: '#b91c1c', fontSize: 13 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
};
