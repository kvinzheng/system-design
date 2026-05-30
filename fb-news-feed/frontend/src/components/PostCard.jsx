import React, { useEffect, useState } from 'react';
import { reactToPost, unreactToPost, getCurrentUserId } from '../api';
import { socket as initialSocket, onSocketSwap } from '../socket';

export default function PostCard({ post }) {
  const [liked, setLiked] = useState(post.viewerReacted);
  const [count, setCount] = useState(post.reactionCount);
  const [pending, setPending] = useState(false);

  // Subscribe to live reaction updates for this post
  useEffect(() => {
    const onReaction = (payload) => {
      if (payload.postId !== post.id) return;
      setCount(payload.reactionCount);
      if (Array.isArray(payload.userIds)) {
        setLiked(payload.userIds.includes(getCurrentUserId()));
      }
    };
    const attach = (s) => { s.emit('post:subscribe', post.id); s.on('reaction:changed', onReaction); };
    const detach = (s) => { s.emit('post:unsubscribe', post.id); s.off('reaction:changed', onReaction); };
    let current = initialSocket;
    attach(current);
    const off = onSocketSwap((next) => { detach(current); current = next; attach(current); });
    return () => { detach(current); off(); };
  }, [post.id]);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(c => c + (nextLiked ? 1 : -1));
    try {
      if (nextLiked) await reactToPost(post.id);
      else await unreactToPost(post.id);
    } catch (e) {
      // rollback
      setLiked(!nextLiked);
      setCount(c => c + (nextLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  };

  return (
    <article style={styles.card}>
      <header style={styles.header}>
        <div style={styles.avatar}>{(post.creatorName || '?')[0].toUpperCase()}</div>
        <div>
          <div style={styles.name}>{post.creatorName || post.creatorId}</div>
          <div style={styles.time}>{new Date(post.createdAt).toLocaleString()}</div>
        </div>
      </header>
      {post.content?.text && <p style={styles.text}>{post.content.text}</p>}
      {post.content?.imageUrl && (
        <img src={post.content.imageUrl} alt="" style={styles.image} loading="lazy" />
      )}
      <footer style={styles.footer}>
        <button onClick={toggle} style={{ ...styles.likeBtn, color: liked ? '#1877f2' : '#65676b' }}>
          {liked ? '👍 Liked' : '👍 Like'} {count > 0 && `(${count})`}
        </button>
      </footer>
    </article>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #dadde1', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#1877f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  name: { fontWeight: 600, color: '#050505' },
  time: { fontSize: 12, color: '#65676b' },
  text: { margin: '8px 0', whiteSpace: 'pre-wrap', color: '#050505' },
  image: { width: '100%', borderRadius: 6, marginTop: 8 },
  footer: { marginTop: 12, paddingTop: 8, borderTop: '1px solid #eee' },
  likeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', fontWeight: 600, fontSize: 14 },
};
