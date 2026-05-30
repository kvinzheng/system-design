// Shared Redis client. ioredis handles cluster/sentinel transparently; we use
// a single node in dev. All operations here are O(1) — Redis is the hot path.

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableAutoPipelining: true,   // coalesces concurrent commands into one TCP write
  maxRetriesPerRequest: 3,
});

redis.on('error', (e) => console.error('[redis]', e.message));

module.exports = { redis };
