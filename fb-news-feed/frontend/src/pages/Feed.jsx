import React, { useEffect, useState } from 'react';
import { getFeed } from '../api';
import PostComposer from './PostComposer';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (reset = false) => {
    setLoading(true);
    const res = await getFeed({ pageSize: 10, cursor: reset ? null : cursor });
    setPosts(reset ? res.data.items : [...posts, ...res.data.items]);
    setCursor(res.data.nextCursor);
    setHasMore(!!res.data.nextCursor);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed(true);
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <h2>News Feed</h2>
      <PostComposer onPost={() => fetchFeed(true)} />
      {posts.map(post => (
        <div key={post.id} style={{ border: '1px solid #ccc', margin: 8, padding: 8 }}>
          <div><b>{post.creatorId}</b>:</div>
          <div>{JSON.stringify(post.content)}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{new Date(post.createdAt).toLocaleString()}</div>
        </div>
      ))}
      {hasMore && <button onClick={() => fetchFeed()}>Load More</button>}
      {loading && <div>Loading...</div>}
    </div>
  );
}

export default Feed;
