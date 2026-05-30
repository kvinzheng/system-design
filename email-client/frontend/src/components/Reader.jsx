import React from 'react';

export default function Reader({ message, onDelete, onReply }) {
  if (!message) {
    return <div style={styles.empty}>Select a message to read</div>;
  }
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.subject}>{message.subject || '(no subject)'}</h2>
          <div style={styles.from}>
            <b>{message.fromName || message.fromAddress}</b> &lt;{message.fromAddress}&gt;
          </div>
          <div style={styles.meta}>
            to {message.toAddress} · {new Date(message.receivedAt).toLocaleString()}
            {message.priority && <span style={styles[`prio_${message.priority}`]}> · {message.priority.toUpperCase()}</span>}
          </div>
        </div>
        <div style={styles.actions}>
          {!message._queued && <button style={styles.btn} onClick={() => onReply(message)}>↩ Reply</button>}
          <button style={styles.btnDanger} onClick={() => onDelete(message)}>🗑 {message.folder === 'trash' ? 'Delete' : 'Trash'}</button>
        </div>
      </div>
      <pre style={styles.body}>{message.body}</pre>
    </div>
  );
}

const styles = {
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' },
  wrap: { background: '#fff', overflowY: 'auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 16 },
  subject: { margin: '0 0 6px', fontSize: 20 },
  from: { fontSize: 14 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  prio_high: { color: '#dc2626', fontWeight: 700 },
  prio_medium: { color: '#0078d4', fontWeight: 600 },
  prio_low: { color: '#6b7280' },
  actions: { display: 'flex', gap: 8 },
  btn: { padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 },
  btnDanger: { padding: '6px 12px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 600 },
  body: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, margin: 0 },
};
