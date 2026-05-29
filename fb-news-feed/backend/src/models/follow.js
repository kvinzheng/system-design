module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define('Follow', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    followerId: { type: DataTypes.STRING, allowNull: false },
    followeeId: { type: DataTypes.STRING, allowNull: false },
  }, {
    indexes: [
      { fields: ['followerId'] },
      { fields: ['followeeId'] },
      { unique: true, fields: ['followerId', 'followeeId'] },
    ],
  });
  return Follow;
};
