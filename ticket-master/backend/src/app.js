// Express app entry point
const express = require('express');
const cors = require('cors');
const eventsRouter = require('./routes/events');
const bookingsRouter = require('./routes/bookings');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/events', eventsRouter);
app.use('/bookings', bookingsRouter);

// Production error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
