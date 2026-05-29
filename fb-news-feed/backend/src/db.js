const db = require('./models');

async function initDb() {
  await db.sequelize.sync({ alter: true });
}

module.exports = { db, initDb };
