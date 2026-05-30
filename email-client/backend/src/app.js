const express = require('express');
const cors = require('cors');
const messagesRouter = require('./routes/messages');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/messages', messagesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
