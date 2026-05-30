const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data.sqlite',
  logging: false,
});

const Account = sequelize.define('Account', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
});

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  accountId: { type: DataTypes.STRING, allowNull: false }, // owner mailbox
  folder: { type: DataTypes.STRING, allowNull: false }, // inbox | sent | drafts | trash
  fromAddress: { type: DataTypes.STRING, allowNull: false },
  fromName: { type: DataTypes.STRING },
  toAddress: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, defaultValue: '' },
  body: { type: DataTypes.TEXT, defaultValue: '' },
  threadKey: { type: DataTypes.STRING },
  priority: { type: DataTypes.STRING, defaultValue: 'medium' }, // high | medium | low
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  receivedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  indexes: [
    { fields: ['accountId', 'folder', 'receivedAt'] },
    { fields: ['threadKey'] },
  ],
});

module.exports = { sequelize, Account, Message };
