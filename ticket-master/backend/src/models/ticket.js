module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    seatSection: { type: DataTypes.STRING },
    seatRow: { type: DataTypes.STRING },
    seatNumber: { type: DataTypes.STRING },
    price: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('available', 'reserved', 'sold'), defaultValue: 'available' },
  });
  return Ticket;
};
