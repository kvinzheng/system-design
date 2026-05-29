module.exports = (sequelize, DataTypes) => {
  const Performer = sequelize.define('Performer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    profileUrl: { type: DataTypes.STRING },
  });
  return Performer;
};
