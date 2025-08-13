const { Server } = require('socket.io');
const io = new Server(3000, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join', ({ jobId }) => socket.join(jobId));
  socket.on('leave', ({ jobId }) => socket.leave(jobId));

  socket.on('statusUpdate', (data) => {
    io.to(data.id).emit('statusUpdate', data);
  });
  socket.on('locationUpdate', (data) => {
    io.to(data.id).emit('locationUpdate', data);
  });
});

console.log('Socket.io server running on port 3000');