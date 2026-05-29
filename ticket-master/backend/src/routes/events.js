const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /events/:eventId
router.get('/:eventId', async (req, res) => {
  const event = await db.Event.findByPk(req.params.eventId, {
    include: [db.Venue, db.Performer, db.Ticket],
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// GET /events/search
router.get('/search', async (req, res) => {
  const { keyword = '', start, end, pageSize = 10, page = 1 } = req.query;
  const where = {};
  if (keyword) where.name = { [db.Sequelize.Op.iLike]: `%${keyword}%` };
  if (start || end) where.date = {};
  if (start) where.date[db.Sequelize.Op.gte] = new Date(start);
  if (end) where.date[db.Sequelize.Op.lte] = new Date(end);
  const events = await db.Event.findAndCountAll({
    where,
    limit: +pageSize,
    offset: (+page - 1) * +pageSize,
    order: [['date', 'ASC']],
  });
  res.json({
    events: events.rows,
    total: events.count,
    page: +page,
    pageSize: +pageSize,
  });
});

module.exports = router;
