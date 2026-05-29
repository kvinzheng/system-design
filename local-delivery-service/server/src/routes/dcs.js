import { Router } from 'express';
import { nearbyDcs } from '../services/nearby.js';

export const dcsRouter = Router();

dcsRouter.get('/nearby', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }
  res.json({ dcs: nearbyDcs(lat, lng) });
});
