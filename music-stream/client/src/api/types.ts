export type ArtistRef = { id: string; name: string; image?: string };
export type AlbumRef  = { id: string; name: string; cover: string };

export type Track = {
  id: string;
  title: string;
  albumId: string;
  artistId: string;
  trackNumber: number;
  durationMs: number;
  streamUrl: string;
  explicit: boolean;
  artist: ArtistRef;
  album: AlbumRef;
};

export type Album = {
  id: string; name: string; year: number; cover: string;
  artist: ArtistRef;
  tracks: Track[];
};

export type Artist = {
  id: string; name: string; image: string;
  albums: { kind: 'album'; id: string; name: string; cover: string; artist?: string }[];
  topTracks: Track[];
};

export type Playlist = {
  id: string; name: string; curator: string; cover: string; description: string;
  tracks: Track[];
};

export type ShelfItem =
  | { kind: 'album';    id: string; name: string; cover: string; artist?: string }
  | { kind: 'artist';   id: string; name: string; cover: string }
  | { kind: 'playlist'; id: string; name: string; cover: string; curator?: string };

export type Shelf = { id: string; title: string; kind: ShelfItem['kind']; items: ShelfItem[] };

export type SearchResults = {
  tracks: Track[];
  albums: ShelfItem[];
  artists: ShelfItem[];
  playlists: ShelfItem[];
};

export type StreamInfo = {
  trackId: string; url: string; mimeType: string; expiresAt: number;
};
