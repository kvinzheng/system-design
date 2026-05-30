import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/Card';
import { TrackList } from '../components/TrackList';
import type { SearchResults } from '../api/types';

export function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.search(q.trim());
        setResults(r);
        setParams({ q: q.trim() }, { replace: true });
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, setParams]);

  return (
    <div className="page">
      <input
        autoFocus
        className="search-input"
        value={q}
        placeholder="Search tracks, albums, artists, playlists…"
        onChange={(e) => setQ(e.target.value)}
      />
      {loading && <div className="status">Searching…</div>}

      {results && (
        <>
          {results.tracks.length > 0 && (
            <section className="shelf">
              <h2>Tracks</h2>
              <TrackList tracks={results.tracks} contextId={`search:${q}`} showAlbum />
            </section>
          )}
          {results.artists.length > 0 && (
            <section className="shelf">
              <h2>Artists</h2>
              <div className="shelf-grid">{results.artists.map((a) => <Card key={a.id} item={a} />)}</div>
            </section>
          )}
          {results.albums.length > 0 && (
            <section className="shelf">
              <h2>Albums</h2>
              <div className="shelf-grid">{results.albums.map((a) => <Card key={a.id} item={a} />)}</div>
            </section>
          )}
          {results.playlists.length > 0 && (
            <section className="shelf">
              <h2>Playlists</h2>
              <div className="shelf-grid">{results.playlists.map((p) => <Card key={p.id} item={p} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
