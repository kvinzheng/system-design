// Socket.io realtime layer.
// Clients connect with ?userId=<id> and are joined to room `user:<id>`.
// Server-side helpers emit to follower rooms (fan-out on write).

const { Server } = require('socket.io');
const { db } = require('./db');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId || 'demo-user';
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
    // Anyone can subscribe to a post's reaction stream
    socket.on('post:subscribe', (postId) => {
      if (postId) socket.join(`post:${postId}`);
    });
    socket.on('post:unsubscribe', (postId) => {
      if (postId) socket.leave(`post:${postId}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Fan-out a new post to the author and everyone who follows them.
async function emitNewPost(post) {
  if (!io) return;
  const followers = await db.Follow.findAll({ where: { followeeId: post.creatorId } });
  const recipients = new Set([post.creatorId, ...followers.map(f => f.followerId)]);
  for (const uid of recipients) {
    io.to(`user:${uid}`).emit('post:new', post);
  }
}

// Broadcast reaction change to subscribers of that post.
function emitReactionChanged(payload) {
  if (!io) return;
  io.to(`post:${payload.postId}`).emit('reaction:changed', payload);
}

module.exports = { init, getIo, emitNewPost, emitReactionChanged };
