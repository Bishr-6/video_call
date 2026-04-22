import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ============================================
// Middleware
// ============================================
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ============================================
// In-memory data stores
// ============================================
const users = new Map();          // socketId -> { userId, displayName, status }
const rooms = new Map();          // roomId -> { users: [socketId, socketId], createdAt }
const matchingQueue = [];         // Array of socketIds waiting to be matched

// ============================================
// REST Endpoints
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeUsers: users.size,
    activeRooms: rooms.size,
    queueLength: matchingQueue.length,
  });
});

app.get('/api/stats', (_req, res) => {
  res.json({
    activeUsers: users.size,
    activeRooms: rooms.size,
    queueLength: matchingQueue.length,
  });
});

// ============================================
// Socket.IO
// ============================================
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // ------------------------------------------
  // User Registration
  // ------------------------------------------
  socket.on('user:register', (data) => {
    const userId = uuidv4();
    const user = {
      userId,
      socketId: socket.id,
      displayName: data.displayName || `User-${userId.slice(0, 4)}`,
      isDeaf: data.isDeaf || false,
      status: 'online',
    };
    users.set(socket.id, user);
    socket.emit('user:registered', { userId, displayName: user.displayName });
    console.log(`👤 Registered: ${user.displayName} (deaf: ${user.isDeaf})`);
  });

  // ------------------------------------------
  // Omegle-Style Matching Queue
  // ------------------------------------------
  socket.on('queue:join', () => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error:msg', { message: 'Please register first' });
      return;
    }

    // Don't add if already in queue
    if (matchingQueue.includes(socket.id)) {
      socket.emit('queue:already');
      return;
    }

    // Remove from any existing room first
    leaveCurrentRoom(socket);

    // Try to match with someone in the queue
    if (matchingQueue.length > 0) {
      const partnerSocketId = matchingQueue.shift();
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);

      if (!partnerSocket || !users.has(partnerSocketId)) {
        // Partner disconnected, try next or add to queue
        matchingQueue.push(socket.id);
        socket.emit('queue:waiting', { position: matchingQueue.length });
        return;
      }

      // Create a room for both users
      const roomId = uuidv4();
      const room = {
        roomId,
        users: [socket.id, partnerSocketId],
        createdAt: Date.now(),
      };
      rooms.set(roomId, room);

      // Join socket.io room
      socket.join(roomId);
      partnerSocket.join(roomId);

      // Update user statuses
      users.get(socket.id).status = 'in-call';
      users.get(partnerSocketId).status = 'in-call';

      const partnerUser = users.get(partnerSocketId);
      const currentUser = users.get(socket.id);

      // Notify both users
      socket.emit('match:found', {
        roomId,
        partnerId: partnerSocketId,
        partnerName: partnerUser.displayName,
        partnerIsDeaf: partnerUser.isDeaf,
        isInitiator: true,
      });

      partnerSocket.emit('match:found', {
        roomId,
        partnerId: socket.id,
        partnerName: currentUser.displayName,
        partnerIsDeaf: currentUser.isDeaf,
        isInitiator: false,
      });

      console.log(`🤝 Matched: ${currentUser.displayName} <-> ${partnerUser.displayName} in room ${roomId}`);
    } else {
      // No one to match with, add to queue
      matchingQueue.push(socket.id);
      socket.emit('queue:waiting', { position: matchingQueue.length });
      console.log(`⏳ ${user.displayName} added to queue (position: ${matchingQueue.length})`);
    }
  });

  socket.on('queue:leave', () => {
    const idx = matchingQueue.indexOf(socket.id);
    if (idx !== -1) {
      matchingQueue.splice(idx, 1);
      socket.emit('queue:left');
      console.log(`🚪 User left queue: ${socket.id}`);
    }
  });

  // ------------------------------------------
  // WebRTC Signaling
  // ------------------------------------------
  socket.on('webrtc:offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc:offer', { offer, from: socket.id });
  });

  socket.on('webrtc:answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc:answer', { answer, from: socket.id });
  });

  socket.on('webrtc:ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('webrtc:ice-candidate', { candidate, from: socket.id });
  });

  // ------------------------------------------
  // Transcription / Translation relay
  // ------------------------------------------
  socket.on('transcription:send', ({ roomId, text, language, type }) => {
    socket.to(roomId).emit('transcription:received', {
      text,
      language,
      type, // 'sign' | 'speech' | 'text'
      from: socket.id,
      timestamp: Date.now(),
    });
  });

  // ------------------------------------------
  // Room / Call Management
  // ------------------------------------------
  socket.on('room:leave', () => {
    leaveCurrentRoom(socket);
  });

  socket.on('room:next', () => {
    // Leave current room and rejoin queue (like Omegle "Next")
    leaveCurrentRoom(socket);
    // Re-join the queue
    socket.emit('queue:rejoin');
  });

  // ------------------------------------------
  // Disconnect
  // ------------------------------------------
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    leaveCurrentRoom(socket);

    // Remove from queue
    const idx = matchingQueue.indexOf(socket.id);
    if (idx !== -1) matchingQueue.splice(idx, 1);

    // Remove user
    users.delete(socket.id);
  });
});

// ============================================
// Helper Functions
// ============================================
function leaveCurrentRoom(socket) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.includes(socket.id)) {
      // Notify partner
      const partnerId = room.users.find((id) => id !== socket.id);
      if (partnerId) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit('partner:disconnected');
          // Update partner status
          const partnerUser = users.get(partnerId);
          if (partnerUser) partnerUser.status = 'online';
        }
      }

      // Leave socket.io room
      socket.leave(roomId);

      // Delete room
      rooms.delete(roomId);

      // Update status
      const user = users.get(socket.id);
      if (user) user.status = 'online';

      console.log(`🚪 Room ${roomId} closed`);
      break;
    }
  }
}

// ============================================
// Start Server
// ============================================
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  🤝 Smart Sign Language Communication       ║
║  ──────────────────────────────────────────  ║
║  Server running on port ${PORT}                ║
║  CORS: ${CORS_ORIGIN}              ║
║  Health: http://localhost:${PORT}/health        ║
╚══════════════════════════════════════════════╝
  `);
});
