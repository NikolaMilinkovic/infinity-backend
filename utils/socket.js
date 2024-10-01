const { Server } = require('socket.io');
const CustomError = require('./CustomError')

let io;

const setupSocket = (server) => {
  io = new Server(server);

  io.on('connection', (socket) => {
    console.log('> User connected: ', socket.id);

    socket.on('disconnect', () =>{
      console.log('> User disconnected: ', socket.id);
    })
  
  })

  return io;
}

const getSocketInstance = () => {
  if(!io){
    return console.error('Socket instance not found. Call setupSocket first.');
  }
  return io;
}

module.exports = { setupSocket, getSocketInstance };