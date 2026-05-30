const express = require('express');
const { Op } = require('sequelize');
const { Message, Account } = require('../models');
const { threadKeyFor } = require('../threading');
const { classify } = require('../priority');
const { emitNewMail } = require('../realtime');

const router = express.Router();

function getAccountId(req) {
  return req.header('x-account-id') || 'me';
}

// GET /messages?folder=inbox&q=...&cursor=ISO&pageSize=25
router.get('/', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const folder = req.query.folder || 'inbox';
    const pageSize = Math.min(parseInt(req.query.pageSize) || 25, 100);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
    const q = (req.query.q || '').trim();

    const where = { accountId, folder };
    if (cursor) where.receivedAt = { [Op.lt]: cursor };
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.and] = [{
        [Op.or]: [
          { subject: like },
          { body: like },
          { fromAddress: like },
          { fromName: like },
        ],
      }];
    }

    const rows = await Message.findAll({
      where,
      order: [['receivedAt', 'DESC']],
      limit: pageSize + 1,
    });

    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore ? items[items.length - 1].receivedAt.toISOString() : null;
    res.json({ items, nextCursor });
  } catch (err) { next(err); }
});

// GET /messages/:id
router.get('/:id', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const msg = await Message.findOne({ where: { id: req.params.id, accountId } });
    if (!msg) return res.status(404).json({ error: 'Not found' });
    res.json(msg);
  } catch (err) { next(err); }
});

// PATCH /messages/:id  { read?, folder? }
router.patch('/:id', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const msg = await Message.findOne({ where: { id: req.params.id, accountId } });
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const patch = {};
    if (typeof req.body.read === 'boolean') patch.read = req.body.read;
    if (typeof req.body.folder === 'string') patch.folder = req.body.folder;
    await msg.update(patch);
    res.json(msg);
  } catch (err) { next(err); }
});

// DELETE /messages/:id  (permanent delete from trash; otherwise moves to trash)
router.delete('/:id', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const msg = await Message.findOne({ where: { id: req.params.id, accountId } });
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.folder === 'trash') {
      await msg.destroy();
      return res.json({ ok: true, deleted: true });
    }
    await msg.update({ folder: 'trash' });
    res.json({ ok: true, trashed: true });
  } catch (err) { next(err); }
});

// POST /messages/send  { to, subject, body, clientId? }
// Stubs SMTP: writes a copy to the sender's "sent" folder and (if recipient is a local
// account, e.g. echo demo) also delivers it. We always create a sent copy.
router.post('/send', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const account = await Account.findByPk(accountId);
    if (!account) return res.status(400).json({ error: 'Unknown account' });
    const { to, subject = '', body = '' } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing "to"' });

    const now = new Date();
    const threadKey = threadKeyFor(subject);

    const sent = await Message.create({
      accountId,
      folder: 'sent',
      fromName: account.name,
      fromAddress: account.email,
      toAddress: to,
      subject,
      body,
      threadKey,
      read: true,
      receivedAt: now,
    });

    // Simulated "echo": deliver back to the same account's inbox.
    if (to === account.email || to.toLowerCase() === 'echo@example.com') {
      const echoSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
      const echo = await Message.create({
        accountId,
        folder: 'inbox',
        fromName: account.name,
        fromAddress: account.email,
        toAddress: account.email,
        subject: echoSubject,
        body: `(auto-echo)\n\n${body}`,
        threadKey,
        priority: classify({ fromAddress: account.email, subject: echoSubject, body }),
        read: false,
        receivedAt: new Date(now.getTime() + 1000),
      });
      emitNewMail(echo.toJSON());
    }

    res.json(sent);
  } catch (err) { next(err); }
});

// POST /messages/sync  → simulate an IMAP fetch by injecting a fresh inbox message.
// Query ?priority=high|medium|low to force, otherwise rotates for demo purposes.
router.post('/sync', async (req, res, next) => {
  try {
    const accountId = getAccountId(req);
    const account = await Account.findByPk(accountId);
    if (!account) return res.status(400).json({ error: 'Unknown account' });
    const forced = req.query.priority;
    const presets = {
      high:   { fromName: 'Alice (VIP)', fromAddress: 'alice@example.com', subject: 'URGENT: production is down', body: 'Pager went off. Need eyes ASAP.' },
      medium: { fromName: 'Bob',         fromAddress: 'bob@example.com',   subject: 'Re: design doc draft',       body: 'Took another pass — see comments.' },
      low:    { fromName: 'LinkedIn',    fromAddress: 'jobs@linkedin.com', subject: 'Weekly newsletter digest',   body: 'New jobs near you. Unsubscribe link below.' },
    };
    const choice = presets[forced] || presets[['high','medium','low'][Math.floor(Math.random()*3)]];
    const msg = await Message.create({
      accountId,
      folder: 'inbox',
      ...choice,
      toAddress: account.email,
      threadKey: threadKeyFor(choice.subject),
      priority: classify(choice),
      read: false,
      receivedAt: new Date(),
    });
    emitNewMail(msg.toJSON());
    res.json({ delivered: 1, message: msg });
  } catch (err) { next(err); }
});

module.exports = router;
