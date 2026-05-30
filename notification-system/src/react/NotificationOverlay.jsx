import React, { useEffect, useState } from 'react';
import { subscribe, dismissBanner, clearOverflow, pauseAging, resumeAging } from '../core/stack';
import Banner from './Banner';
import OverflowPill from './OverflowPill';

// Drop-in floating overlay (bottom-right). Subscribes to the stack and
// renders every visible banner plus an overflow pill.
//
// Props are optional positional overrides — by default it anchors at
// bottom: 16, right: 16 with column-reverse stacking (newest on top).
export default function NotificationOverlay({ style }) {
  const [state, setState] = useState({ visible: [], overflow: [], maxVisible: 3 });

  useEffect(() => subscribe(setState), []);

  if (!state.visible.length && !state.overflow.length) return null;

  return (
    <div style={{ ...overlayStyle, ...(style || {}) }}>
      {state.visible.map((b) => (
        <Banner
          key={b.id}
          priority={b.priority}
          title={b.title}
          body={b.body}
          summary={b.summary}
          count={b.count}
          onOpen={b.onOpen ? () => { b.onOpen(); dismissBanner(b.id); } : undefined}
          onDismiss={() => dismissBanner(b.id)}
          onMouseEnter={() => pauseAging(b.id)}
          onMouseLeave={() => resumeAging(b.id)}
        />
      ))}
      {state.overflow.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <OverflowPill
            items={state.overflow}
            onDismiss={dismissBanner}
            onClearAll={clearOverflow}
          />
        </div>
      )}
    </div>
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
