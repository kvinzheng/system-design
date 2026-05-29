const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { Op } = require('sequelize');

function getUserId(req) {
  return req.header('x-user-id') || 'demo-user';
}

// GET /feed?pageSize=10&cursor=<ISO timestamp>
router.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const follows = await db.Follow.findAll({ where: { followerId: userId } });
    const creatorIds = [userId, ...follows.map(f => f.followeeId)];

    const where = { creatorId: { [Op.in]: creatorIds } };
    if (cursor) where.createdAt = { [Op.lt]: cursor };

    const posts = await db.Post.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize + 1,
    });

    const hasMore = posts.length > pageSize;
    const items = hasMore ? posts.slice(0, pageSize) : posts;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    const ids = items.map(p => p.id);
    const reactions = ids.length
      ? await db.Reaction.findAll({ where: { postId: { [Op.in]: ids } } })
      : [];

    const creatorIdsInPage = [...new Set(items.map(p => p.creatorId))];
    const creators = creatorIdsInPage.length
      ? await db.User.findAll({ where: { id: { [Op.in]: creatorIdsInPage } } })
      : [];
    const creatorMap = Object.fromEntries(creators.map(u => [u.id, u.name]));

    const enriched = items.map(p => {
      const postReactions = reactions.filter(r => r.postId === p.id);
      return {
        ...p.toJSON(),
        creatorName: creatorMap[p.creatorId] || p.creatorId,
        reactionCount: postReactions.length,
        viewerReacted: postReactions.some(r => r.userId === userId),
      };
    });

    res.json({ items: enriched, nextCursor });
  } catch (err) { next(err); }
});

module.exports = router;
