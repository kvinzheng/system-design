import React, { useState } from 'react';
import { createPost } from '../api';

function PostComposer({ onPost }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImage = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // For demo: just send text, skip image upload logic
      await createPost({ text });
      setText('');
      setImage(null);
      if (onPost) onPost();
    } catch (err) {
      setError('Failed to post');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        style={{ width: '100%' }}
      />
      <input type="file" accept="image/*" onChange={handleImage} />
      <button type="submit" disabled={loading || !text.trim()}>Post</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}

export default PostComposer;
