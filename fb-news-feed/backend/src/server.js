require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initDb } = require('./db');
const seed = require('./seed');
const realtime = require('./realtime');

const PORT = process.env.PORT || 4000;

initDb()
  .then(seed)
  .then(() => {
    const server = http.createServer(app);
    realtime.init(server);
    server.listen(PORT, () => {
      console.log(`FB News Feed backend running on port ${PORT} (with realtime)`);
    });
  })
  .catch(err => {
    console.error('Failed to start backend:', err);
    process.exit(1);
  });
