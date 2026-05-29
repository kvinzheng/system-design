import { VIDEOS } from './catalog.js';

// In production: powered by a recommendation service (collaborative filtering /
// learned-to-rank model). Here we just slice the catalog into themed rows.
export const ROWS = [
  {
    id: 'trending',
    title: 'Trending Now',
    videoIds: ['tos', 'sintel', 'bbb', 'bipbop', 'ed', 'llhls'],
  },
  {
    id: 'continue',
    title: 'Continue Watching',
    videoIds: ['bbb', 'ed'],
  },
  {
    id: 'scifi',
    title: 'Sci-Fi & Fantasy',
    videoIds: ['tos', 'sintel', 'ed'],
  },
  {
    id: 'animation',
    title: 'Animated Worlds',
    videoIds: ['bbb', 'sintel', 'ed'],
  },
  {
    id: 'demo',
    title: 'Streaming Tech Showcases',
    videoIds: ['bipbop', 'llhls', 'tos'],
  },
];

export const expandRow = (row) => ({
  id: row.id,
  title: row.title,
  videos: row.videoIds
    .map((id) => VIDEOS.find((v) => v.id === id))
    .filter(Boolean),
});
