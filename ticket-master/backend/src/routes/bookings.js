const express = require('express');
const router = express.Router();
const { db } = require('../db');
const redis = require('../services/redis');
const stripe = require('../services/stripe');

// POST /bookings/:eventId
router.post('/:eventId', async (req, res) => {
  const { ticketIds, paymentToken, userId } = req.body;
  const eventId = req.params.eventId;
  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'No tickets selected' });
  }
  // Distributed lock: reserve tickets in Redis
  const lockKeys = ticketIds.map(id => `lock:ticket:${id}`);
  const locks = await Promise.all(lockKeys.map(key => redis.set(key, userId, 'NX', 'EX', 600)));
  if (locks.some(l => l !== 'OK')) {
    // Release any acquired locks
    await Promise.all(lockKeys.map((key, i) => locks[i] === 'OK' ? redis.del(key) : null));
    return res.status(409).json({ error: 'Some tickets are already reserved' });
  }
  // Transactional booking
  const t = await db.sequelize.transaction();
  try {
    const tickets = await db.Ticket.findAll({ where: { id: ticketIds, status: 'available', eventId }, transaction: t, lock: t.LOCK.UPDATE });
    if (tickets.length !== ticketIds.length) throw new Error('Some tickets unavailable');
    await Promise.all(tickets.map(ticket => ticket.update({ status: 'reserved' }, { transaction: t })));
    const totalPrice = tickets.reduce((sum, t) => sum + t.price, 0);
    const booking = await db.Booking.create({ userId, totalPrice, status: 'in-progress' }, { transaction: t });
    await booking.addTickets(tickets, { transaction: t });
    // Stripe payment (mocked)
    // const charge = await stripe.charges.create({ ... });
    await t.commit();
    res.json({ bookingId: booking.id });
  } catch (err) {
    await t.rollback();
    await Promise.all(lockKeys.map(key => redis.del(key)));
    res.status(409).json({ error: err.message });
  }
});

module.exports = router;
