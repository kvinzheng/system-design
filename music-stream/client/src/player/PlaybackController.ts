import type { Track } from '../api/types';
import { api } from '../api/client';
import { usePlayerStore } from './playerStore';
import { QueueManager } from './QueueManager';

/**
 * PlaybackController — singleton that owns the <audio> element.
 * UI dispatches intents here; never touches <audio> directly.
 */
class Controller {
  private audio: HTMLAudioElement | null = null;
  private loadedTrackId: string | null = null;
  private prefetchedNextId: string | null = null;

  attach(el: HTMLAudioElement) {
    if (this.audio === el) return;
    this.audio = el;

    el.addEventListener('play',  () => usePlayerStore.getState().setRuntime({ isPlaying: true }));
    el.addEventListener('pause', () => usePlayerStore.getState().setRuntime({ isPlaying: false }));
    el.addEventListener('waiting', () => usePlayerStore.getState().setRuntime({ buffering: true }));
    el.addEventListener('playing', () => usePlayerStore.getState().setRuntime({ buffering: false }));
    el.addEventListener('loadedmetadata', () => {
      usePlayerStore.getState().setRuntime({ durationMs: el.duration * 1000 });
    });
    el.addEventListener('timeupdate', () => {
      const posMs = el.currentTime * 1000;
      usePlayerStore.getState().setRuntime({ positionMs: posMs });
      // Persist position only occasionally
      if (Math.floor(el.currentTime) % 3 === 0) {
        usePlayerStore.getState().setPersisted({ positionMs: posMs }, false);
      }
      // Prefetch next track's stream URL near the end
      const remaining = el.duration - el.currentTime;
      if (remaining > 0 && remaining < 15) this.prefetchNext();
    });
    el.addEventListener('ended', () => this.next());
    el.addEventListener('error', () => {
      usePlayerStore.getState().setRuntime({ buffering: false, isPlaying: false });
    });

    this.setupMediaSession();
  }

  async playTrack(track: Track) {
    await this.loadAndPlay(track);
  }

  async playContext(contextId: string, tracks: Track[], startIndex = 0) {
    QueueManager.playContext(contextId, tracks, startIndex);
    await this.loadAndPlay(tracks[startIndex]);
  }

  async toggle() {
    if (!this.audio) return;
    if (this.audio.paused) await this.audio.play().catch(() => {});
    else this.audio.pause();
  }

  async next() {
    const t = QueueManager.consumeNext();
    if (t) await this.loadAndPlay(t);
    else this.stop();
  }

  async previous() {
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const t = QueueManager.consumePrevious();
    if (t) await this.loadAndPlay(t);
  }

  seek(positionMs: number) {
    if (!this.audio) return;
    this.audio.currentTime = positionMs / 1000;
  }

  setVolume(v: number) {
    if (this.audio) this.audio.volume = Math.max(0, Math.min(1, v));
  }

  private stop() {
    if (this.audio) this.audio.pause();
    usePlayerStore.getState().setRuntime({ isPlaying: false, current: null });
  }

  private async loadAndPlay(track: Track) {
    if (!this.audio) return;
    usePlayerStore.getState().setRuntime({ current: track, buffering: true });

    try {
      const info = await api.stream(track.id);
      this.audio.src = info.url;
      this.loadedTrackId = track.id;
      this.prefetchedNextId = null;
      await this.audio.play();
      this.updateMediaSessionMetadata(track);
    } catch (err) {
      console.error('playback failed', err);
      usePlayerStore.getState().setRuntime({ buffering: false, isPlaying: false });
    }
  }

  private async prefetchNext() {
    const s = usePlayerStore.getState();
    const next = s.userQueue[0] ?? s.contextTracks[nextIndex(s.contextIndex, s)];
    if (!next || next.id === this.prefetchedNextId) return;
    this.prefetchedNextId = next.id;
    api.stream(next.id).catch(() => { this.prefetchedNextId = null; });
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => this.toggle());
    navigator.mediaSession.setActionHandler('pause', () => this.toggle());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
  }

  private updateMediaSessionMetadata(t: Track) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist.name,
      album: t.album.name,
      artwork: [{ src: t.album.cover, sizes: '400x400', type: 'image/svg+xml' }],
    });
  }
}

function nextIndex(idx: number, s: ReturnType<typeof usePlayerStore.getState>): number {
  const order = s.shuffleOrder ?? s.contextTracks.map((_, i) => i);
  const pos = order.indexOf(idx);
  return order[pos + 1] ?? -1;
}

export const PlaybackController = new Controller();
