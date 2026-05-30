import React, { useEffect, useState } from 'react';
import { getUsers, followUser, unfollowUser, getCurrentUserId } from '../api';

export default function FollowPanel({ onChange }) {
  const [users, setUsers] = useState([]);

  const load = async () => setUsers(await getUsers());
  useEffect(() => { load(); }, []);

  const toggle = async (u) => {
    if (u.followed) await unfollowUser(u.id);
    else await followUser(u.id);
    await load();
    onChange?.();
  };

  return (
    <aside style={styles.card}>
      <h3 style={styles.title}>People</h3>
      <div style={styles.viewer}>Signed in as: <b>{getCurrentUserId()}</b></div>
      <ul style={styles.list}>
        {users.map(u => (
          <li key={u.id} style={styles.item}>
            <span>{u.name} {u.isSelf && <em style={{ color: '#888' }}>(you)</em>}</span>
            {!u.isSelf && (
              <button onClick={() => toggle(u)} style={u.followed ? styles.followingBtn : styles.followBtn}>
                {u.followed ? 'Following' : 'Follow'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #dadde1', borderRadius: 8, padding: 16, position: 'sticky', top: 16 },
  title: { margin: '0 0 8px', fontSize: 16 },
  viewer: { fontSize: 12, color: '#65676b', marginBottom: 12 },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0', fontSize: 14 },
  followBtn: { background: '#1877f2', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  followingBtn: { background: '#e4e6eb', color: '#050505', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
};
