import type { Track } from '../api/types';
import { PlaybackController } from '../player/PlaybackController';
import { QueueManager } from '../player/QueueManager';
import { usePlayerStore } from '../player/playerStore';

type Props = {
  tracks: Track[];
  contextId: string;
  showAlbum?: boolean;
};

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function TrackList({ tracks, contextId, showAlbum }: Props) {
  const current = usePlayerStore((s) => s.current);
  return (
    <table className="track-list">
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          {showAlbum && <th>Album</th>}
          <th>⏱</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tracks.map((t, i) => {
          const playing = current?.id === t.id;
          return (
            <tr key={t.id} className={playing ? 'playing' : ''}
                onDoubleClick={() => PlaybackController.playContext(contextId, tracks, i)}>
              <td>{i + 1}</td>
              <td>
                <button className="link" onClick={() => PlaybackController.playContext(contextId, tracks, i)}>
                  {t.title}
                </button>
                <div className="subtitle">{t.artist.name}</div>
              </td>
              {showAlbum && <td>{t.album.name}</td>}
              <td>{fmt(t.durationMs)}</td>
              <td>
                <button onClick={() => QueueManager.addNext(t)} title="Play next">⤴</button>
                <button onClick={() => QueueManager.append(t)} title="Add to queue">＋</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
