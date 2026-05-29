const { db } = require('./db');

async function seed() {
  const count = await db.User.count();
  if (count > 0) return;
  const users = await db.User.bulkCreate([
    { id: 'demo-user', name: 'You (Demo)' },
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
    { id: 'carol', name: 'Carol' },
  ]);
  await db.Post.bulkCreate([
    { creatorId: 'alice', content: { text: 'Hello world from Alice!' } },
    { creatorId: 'bob', content: { text: 'Bob here — nice day for coding.' } },
    { creatorId: 'carol', content: { text: 'Check out this view!', imageUrl: 'https://picsum.photos/seed/carol/600/300' } },
    { creatorId: 'alice', content: { text: 'Another post from Alice.' } },
  ]);
  await db.Follow.bulkCreate([
    { followerId: 'demo-user', followeeId: 'alice' },
    { followerId: 'demo-user', followeeId: 'bob' },
  ]);
}

module.exports = seed;
