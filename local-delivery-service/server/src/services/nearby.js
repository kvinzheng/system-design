import { db } from '../db.js';

// 1-hour drive-time proxy. Real system would call a Travel-Time service.
const MAX_MILES = Number(process.env.LDS_MAX_MILES || 50);
const EARTH_R_MI = 3958.8;

export function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_MI * Math.asin(Math.sqrt(a));
}

const listDcs = db.prepare('SELECT id, name, lat, lng FROM distribution_centers');

export function nearbyDcs(lat, lng, maxMiles = MAX_MILES) {
  // For 10k DCs this is fine in-memory; production would use a geo index (PostGIS, S2, geohash).
  return listDcs
    .all()
    .map((dc) => ({ ...dc, distance: haversineMiles(lat, lng, dc.lat, dc.lng) }))
    .filter((dc) => dc.distance <= maxMiles)
    .sort((a, b) => a.distance - b.distance);
}
