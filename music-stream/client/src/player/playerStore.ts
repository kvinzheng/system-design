import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { Track } from '../api/types';

export type Repeat = 'off' | 'one' | 'all';

export type PersistedState = {
  contextId: string | null;
  contextTracks: Track[];
  contextIndex: number;
  userQueue: Track[];
  history: Track[];
  shuffle: boolean;
  shuffleOrder: number[] | null;
  repeat: Repeat;
  version: number;
  positionMs: number;
};

type RuntimeState = {
  current: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  buffering: boolean;
};

type Actions = {
  hydrate: () => Promise<void>;
  setRuntime: (patch: Partial<RuntimeState>) => void;
  setPersisted: (patch: Partial<PersistedState>, bumpVersion?: boolean) => void;
};

export type PlayerStore = PersistedState & RuntimeState & Actions;

const initial: PersistedState & RuntimeState = {
  contextId: null,
  contextTracks: [],
  contextIndex: -1,
  userQueue: [],
  history: [],
  shuffle: false,
  shuffleOrder: null,
  repeat: 'off',
  version: 0,
  positionMs: 0,

  current: null,
  isPlaying: false,
  durationMs: 0,
  buffering: false,
};

const IDB_KEY = 'music-stream/player-state-v1';

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initial,

  hydrate: async () => {
    const saved = await idbGet<PersistedState>(IDB_KEY);
    if (saved) {
      set({ ...saved });
      // restore current track ref without auto-playing (autoplay policy)
      const t = saved.contextTracks[saved.contextIndex] ?? null;
      set({ current: t, isPlaying: false });
    }
  },

  setRuntime: (patch) => set(patch as object),

  setPersisted: (patch, bumpVersion = true) => {
    const next = { ...get(), ...patch };
    if (bumpVersion) next.version = (get().version ?? 0) + 1;
    set(patch as object);
    if (bumpVersion) set({ version: next.version });

    // Persist a snapshot of *only* persisted fields.
    const snapshot: PersistedState = {
      contextId: next.contextId,
      contextTracks: next.contextTracks,
      contextIndex: next.contextIndex,
      userQueue: next.userQueue,
      history: next.history,
      shuffle: next.shuffle,
      shuffleOrder: next.shuffleOrder,
      repeat: next.repeat,
      version: next.version,
      positionMs: next.positionMs,
    };
    void idbSet(IDB_KEY, snapshot);
  },
}));
