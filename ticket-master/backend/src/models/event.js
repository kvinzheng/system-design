module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    date: { type: DataTypes.DATE, allowNull: false },
    type: { type: DataTypes.STRING },
  });
  return Event;
};
