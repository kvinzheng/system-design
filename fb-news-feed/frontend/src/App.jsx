import React, { useState } from 'react';
import Feed from './components/Feed';
import FollowPanel from './components/FollowPanel';
import UserSwitcher from './components/UserSwitcher';

function App() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div style={styles.brand}>News Feed</div>
        <UserSwitcher onChange={() => setReloadKey(k => k + 1)} />
      </header>
      <main style={styles.layout}>
        <div style={styles.feedCol}>
          <Feed reloadKey={reloadKey} />
        </div>
        <div style={styles.sideCol}>
          <FollowPanel key={reloadKey} onChange={() => setReloadKey(k => k + 1)} />
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  topbar: { background: '#fff', padding: '12px 24px', borderBottom: '1px solid #dadde1', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: 700, color: '#1877f2' },
  layout: { maxWidth: 1000, margin: '24px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 },
  feedCol: { minWidth: 0 },
  sideCol: {},
};

export default App;
