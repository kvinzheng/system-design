import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { TrackList } from '../components/TrackList';
import { PlaybackController } from '../player/PlaybackController';

export function Playlist() {
  const { id = '' } = useParams();
  const { data, loading, error } = useAsync(() => api.playlist(id), [id]);
  if (loading) return <div className="status">Loading…</div>;
  if (error || !data) return <div className="status">Playlist not found</div>;

  return (
    <div className="page">
      <header className="detail-hero">
        <img src={data.cover} alt="" />
        <div>
          <div className="kind">Playlist</div>
          <h1>{data.name}</h1>
          <p>{data.description}</p>
          <div className="subtitle">{data.curator} · {data.tracks.length} tracks</div>
          <button className="play-big"
                  onClick={() => PlaybackController.playContext(`playlist:${data.id}`, data.tracks, 0)}>
            ▶ Play
          </button>
        </div>
      </header>
      <TrackList tracks={data.tracks} contextId={`playlist:${data.id}`} showAlbum />
    </div>
  );
}
