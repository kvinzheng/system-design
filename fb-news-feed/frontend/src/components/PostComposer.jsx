import React, { useState } from 'react';
import { createPost } from '../api';

export default function PostComposer({ onPosted }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageUrl.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const post = await createPost({ text: text.trim(), imageUrl: imageUrl.trim() || undefined });
      setText('');
      setImageUrl('');
      onPosted?.(post);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.card}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        style={styles.textarea}
      />
      <input
        value={imageUrl}
        onChange={e => setImageUrl(e.target.value)}
        placeholder="Image URL (optional)"
        style={styles.input}
      />
      <div style={styles.row}>
        <button type="submit" disabled={submitting || (!text.trim() && !imageUrl.trim())} style={styles.btn}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
        {error && <span style={styles.error}>{error}</span>}
      </div>
    </form>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #dadde1', borderRadius: 8, padding: 16, marginBottom: 16 },
  textarea: { width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: 10, fontSize: 15, resize: 'vertical', boxSizing: 'border-box' },
  input: { width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: 8, marginTop: 8, fontSize: 13, boxSizing: 'border-box' },
  row: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 },
  btn: { background: '#1877f2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#d00', fontSize: 13 },
};
