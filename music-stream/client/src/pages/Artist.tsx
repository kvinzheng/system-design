import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { Card } from '../components/Card';
import { TrackList } from '../components/TrackList';
import { PlaybackController } from '../player/PlaybackController';

export function Artist() {
  const { id = '' } = useParams();
  const { data, loading, error } = useAsync(() => api.artist(id), [id]);
  if (loading) return <div className="status">Loading…</div>;
  if (error || !data) return <div className="status">Artist not found</div>;

  return (
    <div className="page">
      <header className="detail-hero">
        <img src={data.image} alt="" />
        <div>
          <div className="kind">Artist</div>
          <h1>{data.name}</h1>
          <button className="play-big"
                  onClick={() => PlaybackController.playContext(`artist:${data.id}`, data.topTracks, 0)}>
            ▶ Play top tracks
          </button>
        </div>
      </header>

      <section className="shelf">
        <h2>Top tracks</h2>
        <TrackList tracks={data.topTracks} contextId={`artist:${data.id}`} showAlbum />
      </section>

      <section className="shelf">
        <h2>Albums</h2>
        <div className="shelf-grid">
          {data.albums.map((a) => <Card key={a.id} item={a as any} />)}
        </div>
      </section>
    </div>
  );
}
