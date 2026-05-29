import express from 'express';
import cors from 'cors';
import { store } from './store';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/documents', (_req, res) => {
  res.json(store.list());
});

app.get('/api/documents/:id', (req, res) => {
  const doc = store.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const { title, content } = req.body ?? {};
  const doc = store.create({ title, content });
  res.status(201).json(doc);
});

app.put('/api/documents/:id', (req, res) => {
  const { title, content } = req.body ?? {};
  const doc = store.update(req.params.id, { title, content });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

app.delete('/api/documents/:id', (req, res) => {
  const ok = store.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
});
