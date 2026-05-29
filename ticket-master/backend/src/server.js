require('dotenv').config();
const app = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Ticketmaster backend running on port ${PORT}`);
  });
});
