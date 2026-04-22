const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Robust CORS for Express
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['https://video-call-one-kappa.vercel.app', 'http://localhost:5173'];
    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error('CORS Not Allowed'));
    }
  },
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://video-call-one-kappa.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const users = new Map(); // socket.id -> userInfo
const rooms = new Map(); // roomId -> { users: [id1, id2, ...] }

io.on('connection', (socket) => {
  console.log(`🔗 New Connection: ${socket.id}`);

  socket.on('user:register', (data) => {
    users.set(socket.id, {
      id: socket.id,
      displayName: data.displayName || 'مستخدم',
      isDeaf: data.isDeaf || false,
      roomId: null
    });
    socket.emit('user:registered', { id: socket.id });
  });

  // Create a specific room
  socket.on('room:create', () => {
    const roomId = uuidv4().substring(0, 8);
    socket.emit('room:created', { roomId });
  });

  // Join a room (Manual or Random)
  socket.on('room:join', (data) => {
    const { roomId } = data;
    const user = users.get(socket.id);
    if (!user) return;

    // Leave previous room if any
    if (user.roomId) {
      socket.leave(user.roomId);
      const oldRoom = rooms.get(user.roomId);
      if (oldRoom) {
        oldRoom.users = oldRoom.users.filter(id => id !== socket.id);
        if (oldRoom.users.length === 0) rooms.delete(user.roomId);
      }
    }

    socket.join(roomId);
    user.roomId = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [] });
    }
    const room = rooms.get(roomId);

    // Tell the new user about existing users
    const existingUsers = room.users.map(id => ({
      id,
      displayName: users.get(id)?.displayName,
      isDeaf: users.get(id)?.isDeaf
    }));
    socket.emit('room:users', existingUsers);

    // Tell existing users about the new user
    socket.to(roomId).emit('user:joined', {
      id: socket.id,
      displayName: user.displayName,
      isDeaf: user.isDeaf
    });

    room.users.push(socket.id);
    console.log(`🏠 ${user.displayName} joined room: ${roomId}`);
  });

  // Generic WebRTC Signaling Relay
  socket.on('webrtc:signal', (data) => {
    const { to, signal } = data;
    io.to(to).emit('webrtc:signal', {
      from: socket.id,
      signal
    });
  });

  socket.on('transcription:send', (data) => {
    const { roomId, text, type } = data;
    socket.to(roomId).emit('transcription:received', {
      senderId: socket.id,
      senderName: users.get(socket.id)?.displayName,
      text,
      type
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      socket.to(user.roomId).emit('user:left', { id: socket.id });
      const room = rooms.get(user.roomId);
      if (room) {
        room.users = room.users.filter(id => id !== socket.id);
        if (room.users.length === 0) rooms.delete(user.roomId);
      }
    }
    users.delete(socket.id);
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
