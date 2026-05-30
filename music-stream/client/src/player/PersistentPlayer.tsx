import { useEffect, useRef } from 'react';
import { usePlayerStore } from './playerStore';
import { PlaybackController } from './PlaybackController';
import { QueueManager } from './QueueManager';

const fmt = (ms: number) => {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function PersistentPlayer({ onOpenQueue }: { onOpenQueue: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { current, isPlaying, positionMs, durationMs, buffering, shuffle, repeat } =
    usePlayerStore();

  useEffect(() => {
    if (audioRef.current) PlaybackController.attach(audioRef.current);
  }, []);

  return (
    <footer className="player">
      <audio ref={audioRef} preload="metadata" />
      <div className="player-track">
        {current ? (
          <>
            <img src={current.album.cover} alt="" />
            <div>
              <div className="title">{current.title}</div>
              <div className="subtitle">{current.artist.name}</div>
            </div>
          </>
        ) : (
          <div className="subtitle">Nothing playing</div>
        )}
      </div>

      <div className="player-controls">
        <div className="buttons">
          <button onClick={() => QueueManager.toggleShuffle()}
                  className={shuffle ? 'active' : ''} title="Shuffle">⇋</button>
          <button onClick={() => PlaybackController.previous()} title="Previous">⏮</button>
          <button className="play" onClick={() => PlaybackController.toggle()} disabled={!current}>
            {buffering ? '…' : isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={() => PlaybackController.next()} title="Next">⏭</button>
          <button onClick={() => QueueManager.cycleRepeat()}
                  className={repeat !== 'off' ? 'active' : ''} title={`Repeat: ${repeat}`}>
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>
        <div className="progress">
          <span>{fmt(positionMs)}</span>
          <input
            type="range" min={0} max={durationMs || 0} value={positionMs}
            onChange={(e) => PlaybackController.seek(Number(e.target.value))}
          />
          <span>{fmt(durationMs)}</span>
        </div>
      </div>

      <div className="player-extras">
        <button onClick={onOpenQueue} title="Queue">≡ Queue</button>
        <input
          type="range" min={0} max={1} step={0.01} defaultValue={1}
          onChange={(e) => PlaybackController.setVolume(Number(e.target.value))}
        />
      </div>
    </footer>
  );
}
