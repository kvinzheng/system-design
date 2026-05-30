import type {
  Album, Artist, Playlist, SearchResults, Shelf, StreamInfo,
} from './types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export const api = {
  home:     ()           => get<{ shelves: Shelf[] }>('/home'),
  album:    (id: string) => get<Album>(`/albums/${id}`),
  artist:   (id: string) => get<Artist>(`/artists/${id}`),
  playlist: (id: string) => get<Playlist>(`/playlists/${id}`),
  search:   (q: string)  => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  stream:   (id: string) => get<StreamInfo>(`/tracks/${id}/stream`),

  pushQueue: async (state: unknown, version: number) => {
    const r = await fetch(`${BASE}/queue`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-user-id': 'demo' },
      body: JSON.stringify({ version, state }),
    });
    return r.json() as Promise<{ ok: boolean; accepted: boolean }>;
  },
};
