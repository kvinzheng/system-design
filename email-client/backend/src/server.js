require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initDb } = require('./db');
const seed = require('./seed');
const realtime = require('./realtime');

const PORT = process.env.PORT || 4001;

initDb()
  .then(seed)
  .then(() => {
    const server = http.createServer(app);
    realtime.init(server);
    server.listen(PORT, () => console.log(`Email client backend on :${PORT} (with realtime)`));
  })
  .catch((err) => { console.error(err); process.exit(1); });
