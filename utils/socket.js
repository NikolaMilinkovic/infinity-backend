const { Server } = require('socket.io');
const CustomError = require('./CustomError')

let io;

const setupSocket = (server) => {
  io = new Server(server);

  io.on('connection', (socket) => {

    clients[socket.id] = socket;

    console.log(`> User connected: ${socket.id}`);


    // DISCONNECT 
    socket.on('disconnect', (reason) => {
      console.log(`> User disconnected: ${socket.id} - Reason: ${reason}`);
      delete clients[socket.id];
    });

    // RECONNECT
    socket.on('reconnect', () => {
      console.log(`> User reconnected: ${socket.id}`);
      // socket.emit('requestLastUpdated', { message: 'Send lastUpdated timestamp' });
    });

    // ERROR
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