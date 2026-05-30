// Top-level provider. Owns ALL state:
//   - banner stack (visible/overflow) via reducer
//   - spam shield mute set + hot-path Maps (refs)
//   - low-priority digest queue (ref + interval)
//   - prefs (focusMode/density/quietHours, persisted)
//   - active surface (for medium suppression)
//
// Wires everything together and exposes a single context value.
// Consumers call `useNotifications()` to read/write.

import React from 'react';
const { useReducer, useRef, useState, useEffect, useCallback, useMemo } = React;

import { NotificationContext } from './context.js';
import {
  stackReducer, initialStack, maxBanners, TTL_MS,
} from './internal/stackReducer.js';
import { evaluateSpam, SPAM_DEFAULTS } from './internal/spamShield.js';
import { loadPrefs, savePrefs, isInQuietHours } from './internal/prefs.js';
import { createOSBridge } from './internal/osBridge.js';
import { toast } from './internal/toastStore.js';

const MUTE_KEY_DEFAULT = 'priority-notif:muted-senders:v1';
const PREFS_KEY_DEFAULT = 'priority-notif:prefs:v1';

export default function NotificationProvider({
  children,
  prefsStorageKey = PREFS_KEY_DEFAULT,
  muteStorageKey = MUTE_KEY_DEFAULT,
  digestWindowMs = 60_000,
  digestTitle = (n) => `${n} low-priority notifications`,
  soundDebounceMs = 1500,
  requestOSPermission = false,
  spamShield: spamOverride = {},
  onBadge,
  onShieldVerdict,
}) {
  // ── Spam shield config (merged with defaults, stable across renders) ──
  const spamConfig = useMemo(
    () => ({ ...SPAM_DEFAULTS, ...spamOverride }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(spamOverride)],
  );

  // ── Prefs (focusMode / density / quietHours) ─────────────────────────
  const [prefs, setPrefsState] = useState(() => loadPrefs(prefsStorageKey));
  useEffect(() => { savePrefs(prefsStorageKey, prefs); }, [prefsStorageKey, prefs]);
  const setPrefs = useCallback((patch) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Stack state ───────────────────────────────────────────────────────
  const [stack, dispatch] = useReducer(stackReducer, initialStack);

  // Reapply cap when prefs change (focus/density swing)
  useEffect(() => {
    dispatch({ type: 'reapplyCap', cap: maxBanners(prefs) });
  }, [prefs]);

  // Aging loop — runs only when there's something to age
  useEffect(() => {
    if (!stack.visible.length && !stack.overflow.length) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 250);
    return () => clearInterval(id);
  }, [stack.visible.length, stack.overflow.length]);

  // ── Spam shield state (refs for hot-path Maps; state for mute set) ───
  const senderHitsRef = useRef(new Map());
  const fingerprintSeenRef = useRef(new Map());
  const [mutedSet, setMutedSet] = useState(() => loadMutes(muteStorageKey));
  useEffect(() => { saveMutes(muteStorageKey, mutedSet); }, [muteStorageKey, mutedSet]);

  const muteSender = useCallback((sender) => {
    setMutedSet((prev) => { const n = new Set(prev); n.add(sender); return n; });
  }, []);
  const unmuteSender = useCallback((sender) => {
    setMutedSet((prev) => { const n = new Set(prev); n.delete(sender); return n; });
  }, []);

  // ── Active surface (for medium suppression) ──────────────────────────
  const [activeSurface, setActiveSurface] = useState(null);
  const isViewingSurface = useCallback((s) => {
    if (!s) return false;
    if (typeof document === 'undefined') return false;
    return document.visibilityState === 'visible' && activeSurface === s;
  }, [activeSurface]);

  // ── OS bridge (audio + Web Notification API) ─────────────────────────
  const osRef = useRef(null);
  if (!osRef.current) osRef.current = createOSBridge({ soundDebounceMs });
  useEffect(() => {
    if (requestOSPermission) osRef.current.ensurePermission();
  }, [requestOSPermission]);

  // ── Low-priority digest queue ────────────────────────────────────────
  const digestRef = useRef([]);

  // Keep callbacks fresh without re-creating notify()
  const onBadgeRef = useRef(onBadge);
  const onShieldRef = useRef(onShieldVerdict);
  useEffect(() => { onBadgeRef.current = onBadge; }, [onBadge]);
  useEffect(() => { onShieldRef.current = onShieldVerdict; }, [onShieldVerdict]);

  // notify() is stable for the lifetime of the provider (reads via refs)
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  const mutedRef = useRef(mutedSet);
  useEffect(() => { mutedRef.current = mutedSet; }, [mutedSet]);
  const surfaceRef = useRef(activeSurface);
  useEffect(() => { surfaceRef.current = activeSurface; }, [activeSurface]);

  const notify = useCallback((input) => {
    const verdict = evaluateSpam(input, spamConfig, {
      mutedSenders: mutedRef.current,
      senderHits: senderHitsRef.current,
      fingerprintSeen: fingerprintSeenRef.current,
    });
    if (onShieldRef.current) {
      try { onShieldRef.current({ verdict: verdict.action, reason: verdict.reason, input }); } catch {}
    }
    if (verdict.action === 'drop') return null;

    const i = verdict.input;
    const priority = i.priority || 'medium';

    if (onBadgeRef.current) {
      try { onBadgeRef.current({ priority, item: i }); } catch {}
    }

    if (priority === 'low') {
      digestRef.current.push(i);
      return null;
    }

    // HIGH: always renders (persistent). OS push + sound.
    if (priority === 'high') {
      dispatch({
        type: 'add',
        input: { ...i, persistent: true },
        cap: maxBanners(prefsRef.current),
        suppress: false,
      });
      osRef.current.osNotify({
        title: `⭐ ${i.title}`,
        body: i.body || '',
        tag: i.groupKey || i.title,
        silent: false,
        onOpen: i.onOpen,
      });
      osRef.current.playBlip();
      return i;
    }

    // MEDIUM: render as a toast (slide-in bottom-right, auto-dismiss).
    // Suppress when user is on the relevant surface, or focus/quiet hours.
    const suppressForSurface = isViewingSurface(i.surface);
    const suppressForPrefs = prefsRef.current.focusMode || isInQuietHours(prefsRef.current);
    if (suppressForSurface || suppressForPrefs) return i;
    toast(i.title || '', {
      type: 'info',
      body: i.body,
      groupKey: i.groupKey || 'medium:rolling',
      duration: 5000,
    });
    osRef.current.osNotify({
      title: i.title,
      body: i.body || '',
      tag: i.groupKey || i.title,
      silent: true,
      onOpen: i.onOpen,
    });
    return i;
  }, [spamConfig, isViewingSurface]);

  // Digest flush loop — low-priority batch surfaces as a single toast.
  useEffect(() => {
    const id = setInterval(() => {
      const q = digestRef.current;
      if (!q.length) return;
      if (prefsRef.current.focusMode || isInQuietHours(prefsRef.current)) return;
      const batch = q.splice(0);
      toast(digestTitle(batch.length), {
        type: 'digest',
        body: batch.slice(0, 3).map((x) => x.title).filter(Boolean).join(' \u00b7 '),
        groupKey: `digest:${Date.now()}`,
        duration: 6000,
      });
    }, digestWindowMs);
    return () => clearInterval(id);
  }, [digestWindowMs, digestTitle]);

  // Hooks MUST be at top level — never inside a useMemo callback.
  const mutedSendersArr = useMemo(() => [...mutedSet], [mutedSet]);

  const value = useMemo(() => ({
    // mutations
    notify,
    dismiss:       (id) => dispatch({ type: 'dismiss', id }),
    clearOverflow: () => dispatch({ type: 'clearOverflow' }),
    pause:         (id) => dispatch({ type: 'pause', id }),
    resume:        (id) => dispatch({ type: 'resume', id }),
    muteSender,
    unmuteSender,
    setActiveSurface,
    setPrefs,
    // reads
    visible: stack.visible,
    overflow: stack.overflow,
    mutedSenders: mutedSendersArr,
    activeSurface,
    prefs,
    maxVisible: maxBanners(prefs),
  }), [
    notify, muteSender, unmuteSender, setPrefs,
    stack.visible, stack.overflow, mutedSendersArr, activeSurface, prefs,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// ── persistence helpers (kept local since they're trivial) ─────────────
function loadMutes(key) {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveMutes(key, set) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify([...set]));
    }
  } catch {}
}
