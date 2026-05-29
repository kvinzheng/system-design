const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { emitNewPost, emitReactionChanged } = require('../realtime');

function getUserId(req) {
  return req.header('x-user-id') || 'demo-user';
}

async function reactionStats(postId) {
  const rows = await db.Reaction.findAll({ where: { postId } });
  return { count: rows.length, userIds: rows.map(r => r.userId) };
}

// POST /posts  { content: { text, imageUrl } }
router.post('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const content = req.body.content || {};
    if (!content.text && !content.imageUrl) {
      return res.status(400).json({ error: 'Post must have text or imageUrl' });
    }
    const user = await db.User.findByPk(userId);
    const post = await db.Post.create({ creatorId: userId, content });
    const payload = {
      ...post.toJSON(),
      creatorName: user ? user.name : userId,
      reactionCount: 0,
      viewerReacted: false,
    };
    // Fan-out to followers (and self) via socket.io
    emitNewPost(payload).catch(err => console.error('emitNewPost failed', err));
    res.json(payload);
  } catch (err) { next(err); }
});

// POST /posts/:id/react
router.post('/:id/react', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id;
    const type = req.body.type || 'like';
    const [reaction, created] = await db.Reaction.findOrCreate({
      where: { postId, userId },
      defaults: { type },
    });
    if (!created) await reaction.update({ type });
    const stats = await reactionStats(postId);
    emitReactionChanged({ postId, reactionCount: stats.count, userIds: stats.userIds });
    res.json({ ok: true, reactionCount: stats.count });
  } catch (err) { next(err); }
});

// DELETE /posts/:id/react
router.delete('/:id/react', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id;
    await db.Reaction.destroy({ where: { postId, userId } });
    const stats = await reactionStats(postId);
    emitReactionChanged({ postId, reactionCount: stats.count, userIds: stats.userIds });
    res.json({ ok: true, reactionCount: stats.count });
  } catch (err) { next(err); }
});

module.exports = router;
