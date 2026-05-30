import React from 'react';
import Banner from './Banner.jsx';
import OverflowPill from './OverflowPill.jsx';
import Toaster from './Toaster.jsx';
import { useNotifications } from '../context.js';

export default function NotificationOverlay() {
  const { visible, overflow, dismiss, pause, resume, clearOverflow } = useNotifications();
  const [showOverflow, setShowOverflow] = React.useState(false);

  // High-priority banners pin top-right (persistent).
  // Medium + low-digest render via <Toaster /> bottom-right.
  return (
    <>
      <div style={styles.root} aria-label="High-priority notifications">
        {visible.map((b) => (
          <Banner
            key={b.id}
            banner={b}
            onOpen={b.onOpen}
            onDismiss={() => dismiss(b.id)}
            onMouseEnter={() => pause(b.id)}
            onMouseLeave={() => resume(b.id)}
          />
        ))}
        {overflow.length > 0 && (
          <OverflowPill
            count={overflow.length}
            open={showOverflow}
            onToggle={() => setShowOverflow((v) => !v)}
            items={overflow}
            onDismiss={dismiss}
            onClearAll={() => { clearOverflow(); setShowOverflow(false); }}
          />
        )}
      </div>
      <Toaster />
    </>
  );
}

const styles = {
  root: {
    position: 'fixed', right: 16, top: 16, zIndex: 1000,
    display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
  },
};
