import React, { useEffect, useState } from 'react';
import { subscribe, dismissBanner, clearOverflow, pauseAging, resumeAging } from '../core/stack.js';
import Banner from './Banner.js';
import OverflowPill from './OverflowPill.js';
const h = React.createElement;

export default function NotificationOverlay({ style }) {
  const [state, setState] = useState({ visible: [], overflow: [], maxVisible: 3 });

  useEffect(() => subscribe(setState), []);

  if (!state.visible.length && !state.overflow.length) return null;

  return h('div', { style: { ...overlayStyle, ...(style || {}) } },
    ...state.visible.map((b) =>
      h(Banner, {
        key: b.id,
        priority: b.priority,
        title: b.title,
        body: b.body,
        summary: b.summary,
        count: b.count,
        onOpen: b.onOpen ? () => { b.onOpen(); dismissBanner(b.id); } : undefined,
        onDismiss: () => dismissBanner(b.id),
        onMouseEnter: () => pauseAging(b.id),
        onMouseLeave: () => resumeAging(b.id),
      })
    ),
    state.overflow.length > 0
      ? h('div', { style: { pointerEvents: 'auto' } },
          h(OverflowPill, {
            items: state.overflow,
            onDismiss: dismissBanner,
            onClearAll: clearOverflow,
          })
        )
      : null,
  );
}

const overlayStyle = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  zIndex: 40,
  display: 'flex',
  flexDirection: 'column-reverse',
  gap: 8,
  pointerEvents: 'none',
  maxHeight: 'calc(100vh - 100px)',
};
