// Express app entry point
const express = require('express');
const cors = require('cors');
const feedRouter = require('./routes/feed');
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/feed', feedRouter);
app.use('/posts', postsRouter);
app.use('/users', usersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
