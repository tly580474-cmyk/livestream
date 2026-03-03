const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomService = require('./services/roomService');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomService.getRoomCount() });
});

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (callback) => {
    const room = roomService.createRoom(socket.id);
    socket.join(room.id);
    console.log(`[Room] Created room ${room.id} by ${socket.id}`);
    callback({ success: true, roomId: room.id });
  });

  // Join an existing room
  socket.on('join-room', (roomId, callback) => {
    const result = roomService.joinRoom(roomId, socket.id);
    if (!result.success) {
      callback({ success: false, error: result.error });
      return;
    }
    socket.join(roomId);
    console.log(`[Room] User ${socket.id} joined room ${roomId}`);
    // Notify the room creator that a peer has joined
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });
    callback({ success: true, roomId });
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ roomId, offer }) => {
    console.log(`[Signal] Offer from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('offer', { offer, from: socket.id });
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ roomId, answer }) => {
    console.log(`[Signal] Answer from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('answer', { answer, from: socket.id });
  });

  // WebRTC signaling: ICE candidate
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
    const affectedRooms = roomService.removeUser(socket.id);
    affectedRooms.forEach((roomId) => {
      socket.to(roomId).emit('peer-left', { peerId: socket.id });
      console.log(`[Room] Notified room ${roomId} that peer ${socket.id} left`);
    });
  });

  // Manual leave room
  socket.on('leave-room', (roomId) => {
    roomService.leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit('peer-left', { peerId: socket.id });
    console.log(`[Room] User ${socket.id} left room ${roomId}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Signaling server running on port ${PORT}`);
  console.log(`[Server] Accessible on local network: http://<your-ip>:${PORT}`);
});
