const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_URI, {
  logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize, Sequelize);
db.Event = require('./event')(sequelize, Sequelize);
db.Performer = require('./performer')(sequelize, Sequelize);
db.Venue = require('./venue')(sequelize, Sequelize);
db.Ticket = require('./ticket')(sequelize, Sequelize);
db.Booking = require('./booking')(sequelize, Sequelize);

// Associations
// User-Booking
// Event-Performer-Venue-Ticket
// Booking-Ticket

db.User.hasMany(db.Booking);
db.Booking.belongsTo(db.User);

db.Event.belongsTo(db.Venue);
db.Event.belongsTo(db.Performer);
db.Event.hasMany(db.Ticket);
db.Ticket.belongsTo(db.Event);

db.Booking.belongsToMany(db.Ticket, { through: 'BookingTickets' });
db.Ticket.belongsToMany(db.Booking, { through: 'BookingTickets' });

module.exports = db;
