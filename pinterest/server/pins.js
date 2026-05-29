// Deterministic pin generator so the feed is stable across requests.
// Each pin ships with intrinsic width/height so the client can compute
// the masonry layout BEFORE the image bytes have loaded (no layout shift).

const TITLES = [
  "Mountain sunrise", "City at night", "Cozy coffee corner", "Minimal workspace",
  "Forest trail", "Ocean waves", "Vintage car", "Modern architecture",
  "Street food", "Cherry blossoms", "Desert dunes", "Snowy cabin",
  "Abstract art", "Pastel interior", "Plant shelf", "Bookshelf goals",
  "Sunset skyline", "Foggy morning", "Neon alley", "Rainy window",
];

const USERS = [
  "alex", "mira", "kenji", "sofia", "leo", "ada", "yuki", "noor", "ivan", "zara",
];

// Simple seeded PRNG (mulberry32) for deterministic generation.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePins(count) {
  const rand = mulberry32(42);
  const pins = [];

  for (let i = 0; i < count; i++) {
    // Intrinsic image dimensions — varied to exercise the masonry layout.
    const width = 400;
    const aspectRatios = [0.6, 0.75, 1, 1.2, 1.4, 1.6, 1.8];
    const ratio = aspectRatios[Math.floor(rand() * aspectRatios.length)];
    const height = Math.round(width * ratio);

    // picsum.photos returns a real image at the requested size, seeded for stability.
    const seed = i + 1;
    const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

    pins.push({
      id: `pin_${seed}`,
      title: TITLES[Math.floor(rand() * TITLES.length)],
      author: USERS[Math.floor(rand() * USERS.length)],
      imageUrl,
      width,
      height,
      likes: Math.floor(rand() * 5000),
    });
  }

  return pins;
}
