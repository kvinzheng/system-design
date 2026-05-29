export interface Video {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  year: number;
  maturityRating: string;
  runtimeSeconds: number;
  posterUrl: string;
  backdropUrl: string;
  logoUrl: string;
  hlsUrl: string;
  audioTracks: { lang: string; label: string }[];
  subtitles: { lang: string; label: string; src?: string }[];
}

export interface Row {
  id: string;
  title: string;
  videos: Video[];
}
