// Mock catalog. In production this would come from a DB + CDN.
// Audio uses public SoundHelix samples so the demo works without local files.

const SOUNDHELIX = (n) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const artists = {
  a_aurora: { id: 'a_aurora', name: 'Aurora Vale', image: cover('Aurora Vale', '#6d28d9') },
  a_kestrel: { id: 'a_kestrel', name: 'Kestrel', image: cover('Kestrel', '#0e7490') },
  a_lumen:   { id: 'a_lumen',   name: 'Lumen', image: cover('Lumen', '#be185d') },
  a_north:   { id: 'a_north',   name: 'North Drift', image: cover('North Drift', '#15803d') },
};

export const albums = {
  al_horizon: {
    id: 'al_horizon', name: 'Horizon Lines', artistId: 'a_aurora', year: 2024,
    cover: cover('Horizon Lines', '#6d28d9'),
    trackIds: ['t1', 't2', 't3'],
  },
  al_drift: {
    id: 'al_drift', name: 'Drift', artistId: 'a_kestrel', year: 2023,
    cover: cover('Drift', '#0e7490'),
    trackIds: ['t4', 't5'],
  },
  al_glow: {
    id: 'al_glow', name: 'Glowfield', artistId: 'a_lumen', year: 2025,
    cover: cover('Glowfield', '#be185d'),
    trackIds: ['t6', 't7', 't8'],
  },
  al_north: {
    id: 'al_north', name: 'Cold Compass', artistId: 'a_north', year: 2022,
    cover: cover('Cold Compass', '#15803d'),
    trackIds: ['t9', 't10'],
  },
};

export const tracks = {
  t1:  track('t1',  'Open Sky',        'al_horizon', 'a_aurora', 1, 240000, SOUNDHELIX(1)),
  t2:  track('t2',  'Pale Light',      'al_horizon', 'a_aurora', 2, 215000, SOUNDHELIX(2)),
  t3:  track('t3',  'Long Way Home',   'al_horizon', 'a_aurora', 3, 198000, SOUNDHELIX(3)),
  t4:  track('t4',  'Slow Current',    'al_drift',   'a_kestrel', 1, 263000, SOUNDHELIX(4)),
  t5:  track('t5',  'Estuary',         'al_drift',   'a_kestrel', 2, 221000, SOUNDHELIX(5)),
  t6:  track('t6',  'Filament',        'al_glow',    'a_lumen',   1, 187000, SOUNDHELIX(6)),
  t7:  track('t7',  'Halogen',         'al_glow',    'a_lumen',   2, 244000, SOUNDHELIX(7)),
  t8:  track('t8',  'Lantern',         'al_glow',    'a_lumen',   3, 209000, SOUNDHELIX(8)),
  t9:  track('t9',  'True North',      'al_north',   'a_north',   1, 232000, SOUNDHELIX(9)),
  t10: track('t10', 'Magnetic',        'al_north',   'a_north',   2, 256000, SOUNDHELIX(10)),
};

export const playlists = {
  p_focus: {
    id: 'p_focus', name: 'Deep Focus', curator: 'Editorial',
    cover: cover('Deep Focus', '#1f2937'),
    description: 'Quiet, melodic tracks for getting things done.',
    trackIds: ['t2', 't6', 't4', 't8', 't1'],
  },
  p_drive: {
    id: 'p_drive', name: 'Night Drive', curator: 'Editorial',
    cover: cover('Night Drive', '#111827'),
    description: 'Synth-tinged tracks for empty highways.',
    trackIds: ['t9', 't7', 't10', 't3', 't5'],
  },
  p_chill: {
    id: 'p_chill', name: 'Chill Mix', curator: 'For You',
    cover: cover('Chill Mix', '#0f172a'),
    description: 'Easy-listening picks based on recent plays.',
    trackIds: ['t2', 't5', 't8', 't6'],
  },
};

export const home = {
  shelves: [
    { id: 'sh_made', title: 'Made for you', kind: 'playlist',
      itemIds: ['p_chill', 'p_focus', 'p_drive'] },
    { id: 'sh_new', title: 'New releases',  kind: 'album',
      itemIds: ['al_glow', 'al_horizon', 'al_drift', 'al_north'] },
    { id: 'sh_artists', title: 'Featured artists', kind: 'artist',
      itemIds: ['a_aurora', 'a_lumen', 'a_kestrel', 'a_north'] },
  ],
};

function track(id, title, albumId, artistId, num, durationMs, streamUrl) {
  return { id, title, albumId, artistId, trackNumber: num, durationMs, streamUrl, explicit: false };
}

function cover(label, color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <rect width='100%' height='100%' fill='${color}'/>
    <text x='50%' y='50%' fill='white' font-family='system-ui' font-size='28'
          text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
