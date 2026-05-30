import React from 'react';
import Banner from './Banner.js';
import OverflowPill from './OverflowPill.js';
import { useNotifications } from '../context.js';
const h = React.createElement;

export default function NotificationOverlay() {
  const { visible, overflow, dismiss, pause, resume, clearOverflow } = useNotifications();
  const [showOverflow, setShowOverflow] = React.useState(false);

  return h('div', { style: styles.root, 'aria-label': 'Notifications' },
    visible.map((b) =>
      h(Banner, {
        key: b.id,
        banner: b,
        onOpen: b.onOpen,
        onDismiss: () => dismiss(b.id),
        onMouseEnter: () => pause(b.id),
        onMouseLeave: () => resume(b.id),
      }),
    ),
    overflow.length > 0
      ? h(OverflowPill, {
          count: overflow.length,
          open: showOverflow,
          onToggle: () => setShowOverflow((v) => !v),
          items: overflow,
          onDismiss: dismiss,
          onClearAll: () => { clearOverflow(); setShowOverflow(false); },
        })
      : null,
  );
}

const styles = {
  root: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 1000,
    display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
  },
};
