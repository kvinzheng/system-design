# priority-notifications

Generic **three-tier (high / medium / low)** notification system. Framework-free
core + optional React adapter. Implements the canonical production matrix:

| Tier | Per-item toast | OS push | Sound | Coalescing | Aging | Suppression |
|---|---|---|---|---|---|---|
| **High** | persistent banner per `groupKey` | yes | debounced | per `(groupKey)` | never | only Focus mode |
| **Medium** | one rolling banner ("12 new …") | silent, tab-hidden only | no | global rolling | 5s TTL | **active surface, Focus, quiet hours** |
| **Low** | none | none | no | n/a | n/a | digested every N minutes |

The package knows nothing about your domain. There is no `message`, no
`subject`, no `inbox`. Items are plain `{priority, title, body, surface, …}`.

---

## Install

This is a local-workspace package. Either:

- Drop the `src/` directory into your app, or
- Add a `file:../notification-system` dependency in your `package.json`.

React is a peer dependency (>= 17). Required only if you use the React adapter.

## Quick start (React)

```jsx
import { configure, notify, setActiveSurface } from 'priority-notifications';
import { NotificationOverlay, SettingsPopover } from 'priority-notifications/react';

configure({
  storageKey: 'myapp:notif:prefs',
  digestWindowMs: 60 * 60 * 1000,       // hourly low-priority digest
  requestOSPermission: true,
  onBadge: ({ priority }) => bumpBadge(priority),
});

function App() {
  return (
    <>
      <NotificationOverlay />
      <button onClick={() =>
        notify({
          priority: 'high',
          title: 'Server down',
          body: 'prod-api-1 stopped responding',
          groupKey: 'alerts:prod-api-1',
          onOpen: () => router.push('/alerts/prod-api-1'),
        })
      }>simulate alert</button>
    </>
  );
}
```

## API

### `configure(options)`

| option | type | default | description |
|---|---|---|---|
| `storageKey` | string | `'priority-notif:prefs:v1'` | localStorage key for user prefs |
| `digestWindowMs` | number | `60_000` | window for low-priority digest |
| `digestTitle` | `(count) => string` | `'N low-priority notifications'` | customize digest banner title |
| `soundDebounceMs` | number | `1500` | minimum gap between high-priority sound cues |
| `requestOSPermission` | boolean | `false` | call `Notification.requestPermission()` on init |
| `onBadge` | `({priority, item}) => void` | — | called on every `notify()` for badge UIs |

### `notify(input)`

The single entry point.

```ts
notify({
  priority: 'high' | 'medium' | 'low',
  title: string,
  body?: string,
  surface?: string,    // suppress medium toast when active surface matches
  groupKey?: string,   // coalescing key. defaults: 'medium:rolling' for medium
  onOpen?: () => void, // called when user clicks "Open"
  persistent?: boolean,// override (default: true for high)
  requiresAction?: boolean, // never evicted
  meta?: object,       // free-form payload
});
```

### `setActiveSurface(surface)`

Tell the system what the user is currently looking at. Used by medium-tier
suppression. Pass any string identity your app uses (e.g. `'inbox'`,
`'feed'`, `'channel:42'`, `'pr:1234'`). Pass `null` when nothing is "active".

### Stack control (rarely needed directly)

```js
import {
  subscribe, getState, addBanner,
  dismissBanner, clearOverflow, pauseAging, resumeAging,
} from 'priority-notifications';
```

`subscribe(listener)` receives `{ visible: Banner[], overflow: Banner[], maxVisible: number }`
on every state change. Most apps just mount `<NotificationOverlay />` instead.

### Preferences

```js
import { getPrefs, setPrefs, subscribePrefs } from 'priority-notifications';

setPrefs({ focusMode: true });
setPrefs({ density: 'compact' });                    // 'compact' | 'normal' | 'spacious'
setPrefs({ quietHours: { start: 22, end: 7 } });     // 10pm–7am
```

Or just mount `<SettingsPopover />`.

---

## Behavior details

### Coalescing
- **High**: caller-provided `groupKey` (default: unique per call). Repeated
  notifies with the same `groupKey` increment `count` on the existing banner.
- **Medium**: always group key `'medium:rolling'`. 12 mediums in a 500ms
  window → **one** toast: *"12 new notifications"*.
- **Low**: never produces a toast; queued for digest.

### Stack management
- Cap is `min(floor(viewport × 0.3 / 64px), densityCap, 5)`.
- Focus mode caps to 1.
- `prefers-reduced-motion` caps to 1.
- When over cap, the lowest-scoring banner is evicted to the overflow drawer.
- Score: `requiresAction +10000`, `high +100`, `medium +10`, `persistent +5`,
  minus age in seconds.
- Hovering a banner pauses aging.
- Overflow auto-sweeps anything older than 24h.

### Surface suppression
If `notify({ surface: 'inbox', priority: 'medium' })` is called while
`setActiveSurface('inbox')` is set and the tab is visible, **no toast** is
emitted. The medium OS push is also skipped. (High is never suppressed by
surface — high is always urgent.)

### Digest
Low-priority items are buffered. Every `digestWindowMs` (default 60s — use
~1h in prod), if the buffer is non-empty, one summary banner fires:
*"12 low-priority items in the last hour"*. The buffer is then cleared.

---

## Try the demo (no build)

```sh
open notification-system/demo/index.html
```

The demo uses esm.sh + in-browser Babel. It loads instantly, requires no
`npm install`, and demonstrates:

1. Single high / medium / low notifications
2. Bursts (coalescing into single banners)
3. Surface-active suppression (switch the "Viewing" dropdown)
4. Focus / density / quiet-hours preferences
5. Badge counter wiring

---

## Files

```
notification-system/
├── package.json
├── README.md
├── demo/index.html            ← self-contained runnable demo
└── src/
    ├── index.js               ← public API (core)
    ├── core/
    │   ├── configure.js
    │   ├── notify.js          ← public notify() + per-tier policy
    │   ├── stack.js           ← banner stack, coalescing, eviction, aging
    │   ├── lowDigest.js       ← windowed low-priority batching
    │   ├── prefs.js           ← user prefs (focus/density/quiet hours)
    │   ├── uiContext.js       ← active-surface tracking
    │   └── osBridge.js        ← Web Notification + audio cue
    └── react/
        ├── index.js
        ├── NotificationOverlay.jsx
        ├── Banner.jsx
        ├── OverflowPill.jsx
        └── SettingsPopover.jsx
```

The email-client app under `/email-client/` is the original consumer that
shaped this module. Its `notifications.js`, `notificationStack.js`,
`lowDigest.js`, `prefs.js`, and `uiContext.js` are now superseded by this
package — keep them for reference or refactor to import from here.
