import { api } from '../api/client';
import { usePlayerStore } from './playerStore';

let pending = false;
let lastSyncedVersion = -1;

/** Debounced push of queue state to server; runs on online + on store changes. */
export function startSync() {
  const tryPush = async () => {
    if (pending || !navigator.onLine) return;
    const s = usePlayerStore.getState();
    if (s.version === lastSyncedVersion) return;
    pending = true;
    try {
      const r = await api.pushQueue(snapshot(s), s.version);
      if (r.accepted) lastSyncedVersion = s.version;
    } catch { /* ignore — will retry */ }
    finally { pending = false; }
  };

  // Push whenever version changes
  let prevVersion = usePlayerStore.getState().version;
  usePlayerStore.subscribe((s) => {
    if (s.version !== prevVersion) {
      prevVersion = s.version;
      void tryPush();
    }
  });

  window.addEventListener('online',  () => void tryPush());
  window.addEventListener('offline', () => console.info('[sync] offline'));
}

function snapshot(s: ReturnType<typeof usePlayerStore.getState>) {
  return {
    contextId: s.contextId,
    contextIndex: s.contextIndex,
    userQueueIds: s.userQueue.map((t) => t.id),
    contextTrackIds: s.contextTracks.map((t) => t.id),
    shuffle: s.shuffle,
    repeat: s.repeat,
    positionMs: s.positionMs,
  };
}
