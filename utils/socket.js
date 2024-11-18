const { Server } = require('socket.io');
const CustomError = require('./CustomError')

let io;

const setupSocket = (server) => {
  io = new Server(server);

  io.on('connection', (socket) => {
    console.log(`> User connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`> User disconnected: ${socket.id}`);
    });
    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });

  return io;
}

const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket instance not found. Call setupSocket first.');
  }
  return io;
};

module.exports = { setupSocket, getSocketInstance };