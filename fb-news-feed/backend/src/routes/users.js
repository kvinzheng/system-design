const express = require('express');
const router = express.Router();
const { db } = require('../db');

function getUserId(req) {
  return req.header('x-user-id') || 'demo-user';
}

// GET /users  (list all users for demo)
router.get('/', async (req, res, next) => {
  try {
    const viewerId = getUserId(req);
    const users = await db.User.findAll({ order: [['name', 'ASC']] });
    const follows = await db.Follow.findAll({ where: { followerId: viewerId } });
    const followedSet = new Set(follows.map(f => f.followeeId));
    res.json(users.map(u => ({
      ...u.toJSON(),
      followed: followedSet.has(u.id),
      isSelf: u.id === viewerId,
    })));
  } catch (err) { next(err); }
});

// PUT /users/:id/follow
router.put('/:id/follow', async (req, res, next) => {
  try {
    const followerId = getUserId(req);
    const followeeId = req.params.id;
    if (followerId === followeeId) return res.status(400).json({ error: "Can't follow self" });
    await db.Follow.findOrCreate({ where: { followerId, followeeId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /users/:id/follow
router.delete('/:id/follow', async (req, res, next) => {
  try {
    const followerId = getUserId(req);
    await db.Follow.destroy({ where: { followerId, followeeId: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
