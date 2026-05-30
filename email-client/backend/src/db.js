const { sequelize } = require('./models');

async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
}

module.exports = { sequelize, initDb };
