module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    totalPrice: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('in-progress', 'confirmed', 'cancelled'), defaultValue: 'in-progress' },
  });
  return Booking;
};
