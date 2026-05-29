import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import { availabilityRouter } from './routes/availability.js';
import { ordersRouter } from './routes/orders.js';
import { dcsRouter } from './routes/dcs.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/availability', availabilityRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dcs', dcsRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`[lds-server] listening on http://localhost:${PORT}`);
});
