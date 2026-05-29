module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    creatorId: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.JSON, allowNull: false },
  }, {
    indexes: [
      { fields: ['creatorId', 'createdAt'] },
      { fields: ['createdAt'] },
    ],
  });
  return Post;
};
