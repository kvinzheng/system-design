module.exports = (sequelize, DataTypes) => {
  const Venue = sequelize.define('Venue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING },
    capacity: { type: DataTypes.INTEGER },
    seatMap: { type: DataTypes.JSONB },
  });
  return Venue;
};
