// Video catalog. In production this would live in a database (Postgres/DynamoDB)
// and media URLs would point at a CDN origin serving HLS manifests + segments
// produced by a transcoding pipeline (FFmpeg → ABR ladder).
//
// For this reference implementation we point at publicly-hosted test HLS streams
// so the app is runnable with zero infra.

const TEARS_OF_STEEL =
  'https://test-streams.mux.dev/tos_ismc/main.m3u8';
const BIG_BUCK_BUNNY =
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const SINTEL =
  'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8';
const APPLE_BIPBOP =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8';
const ELEPHANTS_DREAM =
  'https://test-streams.mux.dev/pts_shift/master.m3u8';
const LL_HLS =
  'https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8';

/**
 * @typedef Video
 * @property {string} id
 * @property {string} title
 * @property {string} synopsis
 * @property {string} genre
 * @property {number} year
 * @property {string} maturityRating
 * @property {number} runtimeSeconds
 * @property {string} posterUrl       Vertical card art
 * @property {string} backdropUrl     Wide hero art
 * @property {string} logoUrl         Title treatment (optional)
 * @property {string} hlsUrl          Master HLS manifest
 * @property {{lang: string, label: string}[]} audioTracks
 * @property {{lang: string, label: string}[]} subtitles
 */

/** @type {Video[]} */
export const VIDEOS = [
  {
    id: 'tos',
    title: 'Tears of Steel',
    synopsis:
      'In an apocalyptic future, a group of soldiers and scientists takes refuge in Amsterdam to try to stop an army of robots that threatens the planet.',
    genre: 'Sci-Fi',
    year: 2012,
    maturityRating: 'PG-13',
    runtimeSeconds: 734,
    posterUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Tears_of_Steel_-_Poster.png/220px-Tears_of_Steel_-_Poster.png',
    backdropUrl:
      'https://mango.blender.org/wp-content/uploads/2012/09/01_thom_celia_bridge.jpg',
    logoUrl: '',
    hlsUrl: TEARS_OF_STEEL,
    audioTracks: [
      { lang: 'en', label: 'English' },
      { lang: 'es', label: 'Spanish' },
    ],
    subtitles: [
      { lang: 'en', label: 'English' },
      { lang: 'es', label: 'Español' },
      { lang: 'fr', label: 'Français' },
    ],
  },
  {
    id: 'bbb',
    title: 'Big Buck Bunny',
    synopsis:
      'A giant rabbit with a heart bigger than himself takes revenge on three rodents who tormented a butterfly and his forest friends.',
    genre: 'Animation',
    year: 2008,
    maturityRating: 'G',
    runtimeSeconds: 596,
    posterUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg',
    backdropUrl:
      'https://peach.blender.org/wp-content/uploads/bbb-splash.png',
    logoUrl: '',
    hlsUrl: BIG_BUCK_BUNNY,
    audioTracks: [{ lang: 'en', label: 'English' }],
    subtitles: [
      { lang: 'en', label: 'English' },
      { lang: 'es', label: 'Español' },
    ],
  },
  {
    id: 'sintel',
    title: 'Sintel',
    synopsis:
      'A lonely young woman, Sintel, helps and befriends a dragon, whom she calls Scales. But when he is kidnapped by an adult dragon, Sintel embarks on a dangerous quest to find her lost friend.',
    genre: 'Fantasy',
    year: 2010,
    maturityRating: 'PG',
    runtimeSeconds: 888,
    posterUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Sintel_poster.jpg/220px-Sintel_poster.jpg',
    backdropUrl:
      'https://durian.blender.org/wp-content/uploads/2010/06/sintel_wallpaper4_1920.jpg',
    logoUrl: '',
    hlsUrl: SINTEL,
    audioTracks: [{ lang: 'en', label: 'English' }],
    subtitles: [
      { lang: 'en', label: 'English' },
      { lang: 'fr', label: 'Français' },
    ],
  },
  {
    id: 'bipbop',
    title: 'Apple BipBop',
    synopsis:
      'Apple\'s reference advanced HLS test stream — perfect for showcasing adaptive bitrate switching across many renditions.',
    genre: 'Demo',
    year: 2019,
    maturityRating: 'G',
    runtimeSeconds: 1800,
    posterUrl:
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400',
    backdropUrl:
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1920',
    logoUrl: '',
    hlsUrl: APPLE_BIPBOP,
    audioTracks: [{ lang: 'en', label: 'English' }],
    subtitles: [{ lang: 'en', label: 'English' }],
  },
  {
    id: 'ed',
    title: 'Elephants Dream',
    synopsis:
      'At the center of the world stands a giant machine, and within it, two characters — Emo and Proog — embark on a strange journey.',
    genre: 'Animation',
    year: 2006,
    maturityRating: 'PG',
    runtimeSeconds: 654,
    posterUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_both.jpg/220px-Elephants_Dream_s5_both.jpg',
    backdropUrl:
      'https://orange.blender.org/wp-content/themes/orange/images/media/gallery/s6_proog.jpg',
    logoUrl: '',
    hlsUrl: ELEPHANTS_DREAM,
    audioTracks: [{ lang: 'en', label: 'English' }],
    subtitles: [{ lang: 'en', label: 'English' }],
  },
  {
    id: 'llhls',
    title: 'Live Edge',
    synopsis:
      'A low-latency HLS test stream demonstrating live event playback with discontinuities and DAI ad markers.',
    genre: 'Live',
    year: 2024,
    maturityRating: 'TV-14',
    runtimeSeconds: 0,
    posterUrl:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400',
    backdropUrl:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1920',
    logoUrl: '',
    hlsUrl: LL_HLS,
    audioTracks: [{ lang: 'en', label: 'English' }],
    subtitles: [],
  },
];

export const getVideo = (id) => VIDEOS.find((v) => v.id === id);
