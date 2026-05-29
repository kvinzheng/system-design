module.exports = (sequelize, DataTypes) => {
  const Reaction = sequelize.define('Reaction', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    postId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, defaultValue: 'like' },
  }, {
    indexes: [
      { unique: true, fields: ['postId', 'userId'] },
      { fields: ['postId'] },
    ],
  });
  return Reaction;
};
