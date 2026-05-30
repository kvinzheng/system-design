import type { Track } from '../api/types';
import { usePlayerStore } from './playerStore';

/**
 * QueueManager — pure logic over the player store.
 *
 *   effective queue = userQueue ++ remainingContextTracks (respecting shuffle)
 *
 * Switching context replaces contextTracks but preserves userQueue.
 */
export const QueueManager = {
  playContext(contextId: string, tracks: Track[], startIndex = 0) {
    const order = makeOrder(tracks.length, false);
    usePlayerStore.getState().setPersisted({
      contextId,
      contextTracks: tracks,
      contextIndex: startIndex,
      shuffleOrder: order,
      history: [],
      positionMs: 0,
    });
  },

  addNext(track: Track) {
    const s = usePlayerStore.getState();
    usePlayerStore.getState().setPersisted({ userQueue: [track, ...s.userQueue] });
  },

  append(track: Track) {
    const s = usePlayerStore.getState();
    usePlayerStore.getState().setPersisted({ userQueue: [...s.userQueue, track] });
  },

  remove(kind: 'user' | 'context', index: number) {
    const s = usePlayerStore.getState();
    if (kind === 'user') {
      const userQueue = s.userQueue.filter((_, i) => i !== index);
      usePlayerStore.getState().setPersisted({ userQueue });
    } else {
      const contextTracks = s.contextTracks.filter((_, i) => i !== index);
      let contextIndex = s.contextIndex;
      if (index < s.contextIndex) contextIndex--;
      usePlayerStore.getState().setPersisted({ contextTracks, contextIndex });
    }
  },

  reorderUserQueue(from: number, to: number) {
    const s = usePlayerStore.getState();
    const userQueue = [...s.userQueue];
    const [item] = userQueue.splice(from, 1);
    userQueue.splice(to, 0, item);
    usePlayerStore.getState().setPersisted({ userQueue });
  },

  toggleShuffle() {
    const s = usePlayerStore.getState();
    const shuffle = !s.shuffle;
    const order = makeOrder(s.contextTracks.length, shuffle, s.contextIndex);
    usePlayerStore.getState().setPersisted({ shuffle, shuffleOrder: order });
  },

  cycleRepeat() {
    const s = usePlayerStore.getState();
    const next = s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off';
    usePlayerStore.getState().setPersisted({ repeat: next });
  },

  /** Returns the next track to play (and mutates state to consume it). */
  consumeNext(): Track | null {
    const s = usePlayerStore.getState();

    if (s.repeat === 'one' && s.contextTracks[s.contextIndex]) {
      return s.contextTracks[s.contextIndex];
    }

    // 1. user queue takes priority
    if (s.userQueue.length > 0) {
      const [next, ...rest] = s.userQueue;
      const history = s.current ? [...s.history, s.current].slice(-100) : s.history;
      usePlayerStore.getState().setPersisted({ userQueue: rest, history, positionMs: 0 });
      return next;
    }

    // 2. advance in context
    const order = s.shuffleOrder ?? makeOrder(s.contextTracks.length, false);
    const positionInOrder = order.indexOf(s.contextIndex);
    let nextPosition = positionInOrder + 1;

    if (nextPosition >= order.length) {
      if (s.repeat === 'all') nextPosition = 0;
      else return null;
    }

    const nextIndex = order[nextPosition];
    const next = s.contextTracks[nextIndex];
    if (!next) return null;
    const history = s.current ? [...s.history, s.current].slice(-100) : s.history;
    usePlayerStore.getState().setPersisted({ contextIndex: nextIndex, history, positionMs: 0 });
    return next;
  },

  consumePrevious(): Track | null {
    const s = usePlayerStore.getState();
    const prev = s.history[s.history.length - 1];
    if (!prev) return null;
    const history = s.history.slice(0, -1);
    // put current back at head of user queue so we don't lose it
    const userQueue = s.current ? [s.current, ...s.userQueue] : s.userQueue;
    usePlayerStore.getState().setPersisted({ history, userQueue, positionMs: 0 });
    return prev;
  },
};

function makeOrder(n: number, shuffle: boolean, pinFirst = -1): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (!shuffle) return order;
  // Fisher–Yates
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (pinFirst >= 0) {
    const idx = order.indexOf(pinFirst);
    if (idx > 0) [order[0], order[idx]] = [order[idx], order[0]];
  }
  return order;
}
