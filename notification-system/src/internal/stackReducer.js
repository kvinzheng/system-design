// Pure reducer + helpers for the banner stack.
// State: { visible: Banner[], overflow: Banner[] }

import { densityCap } from './prefs.js';

export const TTL_MS = { high: Infinity, medium: 5000, low: 0 };
const OVERFLOW_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BANNER_HEIGHT_PX = 64;
const VIEWPORT_FRACTION = 0.3;

export const initialStack = { visible: [], overflow: [] };

export function maxBanners(prefs, viewportH = (typeof window !== 'undefined' ? window.innerHeight : 800)) {
  if (prefs.focusMode) return 1;
  let cap = Math.floor((viewportH * VIEWPORT_FRACTION) / BANNER_HEIGHT_PX);
  try {
    if (typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cap = Math.min(cap, 1);
    }
  } catch {}
  cap = Math.min(cap, densityCap(prefs.density));
  return Math.max(1, Math.min(cap, 5));
}

function defaultGroupKey(input) {
  if (input.priority === 'medium') return 'medium:rolling';
  if (input.summary) return `summary:${input.priority}:${Date.now()}`;
  return `${input.priority}:${input.title || ''}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
}

function evictionScore(b) {
  let s = 0;
  if (b.requiresAction) s += 10_000;
  if (b.priority === 'high') s += 100;
  if (b.priority === 'medium') s += 10;
  if (b.persistent) s += 5;
  s -= (Date.now() - b.lastTs) / 1000;
  return s;
}

// Reducer actions:
//   { type:'add', input, cap, suppress }   — add or coalesce
//   { type:'tick' }                         — age out visible → overflow, GC overflow
//   { type:'dismiss', id }
//   { type:'clearOverflow' }
//   { type:'reapplyCap', cap }              — when prefs change
//   { type:'pause', id } | { type:'resume', id }
export function stackReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const input = action.input;
      if (input.priority === 'low') return state; // low never enters banner stack
      const groupKey = input.groupKey || defaultGroupKey(input);
      const targetArr = action.suppress ? 'overflow' : 'visible';
      const existing = state[targetArr].find((b) => b.groupKey === groupKey);

      if (existing) {
        return {
          ...state,
          [targetArr]: state[targetArr].map((b) =>
            b.groupKey === groupKey
              ? {
                  ...b,
                  count: (b.count || 1) + 1,
                  lastTs: Date.now(),
                  ttlRemaining: TTL_MS[b.priority],
                  latestTitle: input.title || b.latestTitle,
                  latestBody: input.body || b.latestBody,
                  onOpen: input.onOpen || b.onOpen,
                }
              : b,
          ),
        };
      }

      const banner = {
        id: input.id || `${input.priority}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
        priority: input.priority,
        title: input.title || '',
        body: input.body || '',
        summary: input.summary,
        groupKey,
        surface: input.surface,
        onOpen: input.onOpen,
        meta: input.meta,
        count: 1,
        lastTs: Date.now(),
        persistent: input.persistent ?? (input.priority === 'high'),
        requiresAction: !!input.requiresAction,
        paused: false,
        ttlRemaining: TTL_MS[input.priority],
      };

      if (action.suppress) {
        return { ...state, overflow: [banner, ...state.overflow] };
      }

      let visible = [...state.visible, banner];
      let overflow = state.overflow;
      while (visible.length > action.cap) {
        let victimIdx = 0, victimScore = Infinity;
        for (let i = 0; i < visible.length; i++) {
          const s = evictionScore(visible[i]);
          if (s < victimScore) { victimScore = s; victimIdx = i; }
        }
        const victim = visible[victimIdx];
        visible = visible.filter((_, i) => i !== victimIdx);
        overflow = [victim, ...overflow];
      }
      return { visible, overflow };
    }

    case 'tick': {
      const now = Date.now();
      const survivors = [];
      let newOverflow = state.overflow;
      let changed = false;
      for (const b of state.visible) {
        if (b.persistent || b.requiresAction || b.ttlRemaining === Infinity || b.paused) {
          survivors.push(b);
          continue;
        }
        const next = b.ttlRemaining - 250;
        if (next <= 0) {
          newOverflow = [{ ...b, agedAt: now }, ...newOverflow];
          changed = true;
        } else {
          survivors.push({ ...b, ttlRemaining: next });
          changed = true;
        }
      }
      const filteredOverflow = newOverflow.filter(
        (b) => now - (b.agedAt || b.lastTs) < OVERFLOW_MAX_AGE_MS,
      );
      if (!changed && filteredOverflow.length === state.overflow.length) return state;
      return { visible: survivors, overflow: filteredOverflow };
    }

    case 'dismiss':
      return {
        visible: state.visible.filter((b) => b.id !== action.id),
        overflow: state.overflow.filter((b) => b.id !== action.id),
      };

    case 'clearOverflow':
      return state.overflow.length === 0 ? state : { ...state, overflow: [] };

    case 'reapplyCap': {
      let visible = state.visible;
      let overflow = state.overflow;
      let changed = false;
      while (visible.length > action.cap) {
        let victimIdx = 0, victimScore = Infinity;
        for (let i = 0; i < visible.length; i++) {
          const s = evictionScore(visible[i]);
          if (s < victimScore) { victimScore = s; victimIdx = i; }
        }
        const victim = visible[victimIdx];
        visible = visible.filter((_, i) => i !== victimIdx);
        overflow = [victim, ...overflow];
        changed = true;
      }
      return changed ? { visible, overflow } : state;
    }

    case 'pause':
      return {
        ...state,
        visible: state.visible.map((b) => b.id === action.id ? { ...b, paused: true } : b),
      };
    case 'resume':
      return {
        ...state,
        visible: state.visible.map((b) => b.id === action.id ? { ...b, paused: false } : b),
      };

    default:
      return state;
  }
}
