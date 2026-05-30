import React, { useEffect, useState } from 'react';
import { getUsers, getCurrentUserId, setCurrentUserId } from '../api';

export default function UserSwitcher({ onChange }) {
  const [users, setUsers] = useState([]);
  const [current, setCurrent] = useState(getCurrentUserId());

  useEffect(() => { getUsers().then(setUsers).catch(() => {}); }, [current]);

  const switchTo = (id) => {
    setCurrentUserId(id);
    setCurrent(id);
    onChange?.(id);
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>Viewing as</span>
      <select value={current} onChange={(e) => switchTo(e.target.value)} style={styles.select}>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: '#65676b' },
  select: { padding: '6px 8px', borderRadius: 6, border: '1px solid #dadde1', fontSize: 13, background: '#fff' },
};
