// Server-side mirror of notification-system/src/internal/spamShield.js.
// Same three defenses (mute / dedupe / rate-limit), backed by Redis so they
// work ACROSS pods. Pure async function. Caller decides what to do with the
// verdict.
//
// Why mirror the frontend?  Because attackers and bugs skip the JS layer.
// Defense in depth: backend is authoritative, frontend is the polish.

const crypto = require('crypto');
const { redis } = require('./redis');

const WINDOW_S = 60;
const MAX_PER_SENDER = 5;
const DEDUPE_TTL_S = 30;
const TRUSTED = new Set(['pagerduty@example.com', 'alice@example.com']);

function fp(input) {
  return crypto
    .createHash('sha1')
    .update(`${input.subject || ''}|${(input.body || '').slice(0, 200)}`)
    .digest('base64url')
    .slice(0, 16);
}

async function evaluate(input) {
  const userId = input.accountId;
  const sender = input.fromAddress || '';
  const now = Date.now();

  // 1. MUTE  — per-user set of blocked senders
  if (sender && (await redis.sismember(`mutes:${userId}`, sender))) {
    return { action: 'drop', reason: `muted:${sender}` };
  }

  // 2. DEDUPE  — atomic SETNX with TTL
  const ok = await redis.set(
    `dedupe:${userId}:${fp(input)}`,
    '1',
    'NX',
    'EX',
    DEDUPE_TTL_S,
  );
  if (!ok) return { action: 'drop', reason: 'duplicate' };

  // 3. RATE LIMIT  — per-(sender,user) sliding minute bucket
  if (sender && !TRUSTED.has(sender)) {
    const minute = Math.floor(now / 60_000);
    const key = `bucket:${sender}:${userId}:${minute}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_S + 30);
    if (count > MAX_PER_SENDER && input.priority !== 'high') {
      // Same trick as the frontend: don't drop, demote. The user still sees
      // it later, batched into a digest, instead of being interrupted.
      return {
        action: 'downgrade',
        reason: `rate-limit:${count}/${WINDOW_S}s`,
        input: { ...input, priority: 'low' },
      };
    }
  }

  return { action: 'pass', input };
}

module.exports = { evaluate, fp };
