import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { TrackList } from '../components/TrackList';
import { PlaybackController } from '../player/PlaybackController';

export function Album() {
  const { id = '' } = useParams();
  const { data, loading, error } = useAsync(() => api.album(id), [id]);
  if (loading) return <div className="status">Loading…</div>;
  if (error || !data) return <div className="status">Album not found</div>;

  return (
    <div className="page">
      <header className="detail-hero">
        <img src={data.cover} alt="" />
        <div>
          <div className="kind">Album</div>
          <h1>{data.name}</h1>
          <div className="subtitle">{data.artist.name} · {data.year} · {data.tracks.length} tracks</div>
          <button className="play-big"
                  onClick={() => PlaybackController.playContext(`album:${data.id}`, data.tracks, 0)}>
            ▶ Play
          </button>
        </div>
      </header>
      <TrackList tracks={data.tracks} contextId={`album:${data.id}`} />
    </div>
  );
}
