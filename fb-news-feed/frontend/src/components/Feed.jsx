import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFeed } from '../api';
import { socket as initialSocket, onSocketSwap } from '../socket';
import PostCard from './PostCard';
import PostComposer from './PostComposer';

export default function Feed({ reloadKey }) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async (reset = false) => {
    if (loading) return;
    if (!reset && !hasMore) return;
    setLoading(true);
    setError('');
    try {
      const data = await getFeed({ pageSize: 10, cursor: reset ? undefined : cursor || undefined });
      setPosts(prev => {
        const merged = reset ? data.items : [...prev, ...data.items];
        // dedupe by id (sockets may have already prepended this post)
        const seen = new Set();
        return merged.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      });
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (e) {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  // initial + reload on key change
  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    loadMore(true);
    // eslint-disable-next-line
  }, [reloadKey]);

  // infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '200px' });
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore]);

  // realtime: prepend posts pushed from server (dedupe by id)
  useEffect(() => {
    const onNew = (post) => {
      setPosts(prev => (prev.some(p => p.id === post.id) ? prev : [post, ...prev]));
    };
    const attach = (s) => s.on('post:new', onNew);
    const detach = (s) => s.off('post:new', onNew);
    let current = initialSocket;
    attach(current);
    const off = onSocketSwap((next) => {
      detach(current);
      current = next;
      attach(current);
    });
    return () => { detach(current); off(); };
  }, []);

  const handlePosted = (post) => {
    // Optimistic local insert; socket event will be deduped above.
    setPosts(prev => (prev.some(p => p.id === post.id) ? prev : [post, ...prev]));
  };

  return (
    <section>
      <PostComposer onPosted={handlePosted} />
      {posts.map(p => <PostCard key={p.id} post={p} />)}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && <div style={styles.status}>Loading…</div>}
      {!loading && !hasMore && posts.length > 0 && <div style={styles.status}>You're all caught up</div>}
      {!loading && posts.length === 0 && (
        <div style={styles.status}>No posts yet. Follow people or create one!</div>
      )}
      {error && <div style={styles.error}>{error}</div>}
    </section>
  );
}

const styles = {
  status: { textAlign: 'center', color: '#65676b', padding: 16 },
  error: { textAlign: 'center', color: '#d00', padding: 16 },
};
