const { Server } = require('socket.io');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    const accountId = socket.handshake.query.accountId || 'me';
    socket.join(`account:${accountId}`);
  });
  return io;
}

function emitNewMail(message) {
  if (!io) return;
  io.to(`account:${message.accountId}`).emit('mail:new', message);
}

module.exports = { init, emitNewMail };
