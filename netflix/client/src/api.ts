import type { Row, Video } from './types';

const json = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json() as Promise<T>;
  });

export const api = {
  billboard: () => json<Video>('/api/billboard'),
  rows: () => json<Row[]>('/api/rows'),
  video: (id: string) => json<Video>(`/api/videos/${id}`),
};
