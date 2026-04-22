import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// ============================================
// Data Structures & Utilities
// ============================================

// في الذاكرة فقط - لا توجد نسخ دائمة
const activeSessions = new Map();
const userSockets = new Map();

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
};

// ============================================
// REST API Routes
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
  });
});

// معلومات الجلسة (آمنة - لا توجد بيانات حساسة)
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // إرجاع معلومات آمنة فقط
  res.json({
    sessionId,
    createdAt: session.createdAt,
    participantCount: session.participants.length,
  });
});

// ============================================
// WebSocket Events
// ============================================

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // إنشاء مستخدم جديد
  socket.on('user:join', (userData) => {
    const userId = uuidv4();
    const userInfo = {
      socketId: socket.id,
      userId,
      displayName: userData.displayName || `User-${userId.substring(0, 4)}`,
      joinedAt: Date.now(),
    };

    userSockets.set(socket.id, userInfo);
    socket.emit('user:joined', { userId, socketId: socket.id });
    logger.info(`User joined: ${userInfo.displayName}`);
  });

  // إنشاء جلسة فيديو جديدة
  socket.on('session:create', (data) => {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      initiatorSocketId: socket.id,
      participants: [socket.id],
      createdAt: Date.now(),
      isActive: true,
    };

    activeSessions.set(sessionId, session);
    socket.emit('session:created', { sessionId });
    logger.info(`Session created: ${sessionId}`);
  });

  // الانضمام إلى جلسة موجودة
  socket.on('session:join', (data) => {
    const { sessionId } = data;
    const session = activeSessions.get(sessionId);

    if (!session) {
      socket.emit('session:error', { error: 'Session not found' });
      return;
    }

    if (session.participants.length >= 2) {
      socket.emit('session:error', { error: 'Session is full (max 2 participants)' });
      return;
    }

    session.participants.push(socket.id);
    socket.join(sessionId);

    // إخطار المشارك الآخر
    const initiatorSocket = io.sockets.sockets.get(session.initiatorSocketId);
    if (initiatorSocket) {
      initiatorSocket.emit('session:user-joined', {
        sessionId,
        participantSocketId: socket.id,
      });
    }

    socket.emit('session:joined', { sessionId });
    logger.info(`User joined session: ${sessionId}`);
  });

  // إرسال WebRTC Offer
  socket.on('rtc:offer', (data) => {
    const { sessionId, offer, targetSocketId } = data;
    const targetSocket = io.sockets.sockets.get(targetSocketId);

    if (targetSocket) {
      targetSocket.emit('rtc:offer', {
        sessionId,
        offer,
        senderSocketId: socket.id,
      });
      logger.info(`WebRTC offer sent from ${socket.id} to ${targetSocketId}`);
    }
  });

  // إرسال WebRTC Answer
  socket.on('rtc:answer', (data) => {
    const { sessionId, answer, targetSocketId } = data;
    const targetSocket = io.sockets.sockets.get(targetSocketId);

    if (targetSocket) {
      targetSocket.emit('rtc:answer', {
        sessionId,
        answer,
        senderSocketId: socket.id,
      });
      logger.info(`WebRTC answer sent from ${socket.id} to ${targetSocketId}`);
    }
  });

  // إرسال ICE Candidates
  socket.on('rtc:ice-candidate', (data) => {
    const { sessionId, candidate, targetSocketId } = data;
    const targetSocket = io.sockets.sockets.get(targetSocketId);

    if (targetSocket) {
      targetSocket.emit('rtc:ice-candidate', {
        sessionId,
        candidate,
        senderSocketId: socket.id,
      });
    }
  });

  // إرسال البيانات المترجمة (نصوص فقط - لا فيديو!)
  socket.on('transcription:send', (data) => {
    const { sessionId, text, timestamp, language } = data;
    const session = activeSessions.get(sessionId);

    if (session) {
      // إرسال إلى المشارك الآخر فقط
      session.participants.forEach((participantSocketId) => {
        if (participantSocketId !== socket.id) {
          const participantSocket = io.sockets.sockets.get(participantSocketId);
          if (participantSocket) {
            participantSocket.emit('transcription:received', {
              text,
              timestamp,
              language,
              senderSocketId: socket.id,
            });
          }
        }
      });

      logger.info(`Transcription sent in session ${sessionId}: "${text.substring(0, 20)}..."`);
    }
  });

  // إنهاء الجلسة
  socket.on('session:end', (data) => {
    const { sessionId } = data;
    const session = activeSessions.get(sessionId);

    if (session) {
      session.isActive = false;

      // إخطار جميع المشاركين
      session.participants.forEach((participantSocketId) => {
        const participantSocket = io.sockets.sockets.get(participantSocketId);
        if (participantSocket) {
          participantSocket.emit('session:ended', {
            sessionId,
            endedBy: socket.id,
          });
        }
      });

      // حذف الجلسة من الذاكرة
      activeSessions.delete(sessionId);
      logger.info(`Session ended and deleted: ${sessionId}`);
    }

    socket.leave(sessionId);
  });

  // ============================================
  // Privacy & Cleanup
  // ============================================

  socket.on('disconnect', () => {
    const userInfo = userSockets.get(socket.id);

    if (userInfo) {
      logger.info(`User disconnected: ${userInfo.displayName}`);
      userSockets.delete(socket.id);

      // إنهاء أي جلسات نشطة
      activeSessions.forEach((session, sessionId) => {
        if (session.participants.includes(socket.id)) {
          session.isActive = false;
          activeSessions.delete(sessionId);

          // إخطار المشاركين الآخرين
          session.participants.forEach((participantSocketId) => {
            if (participantSocketId !== socket.id) {
              const participantSocket = io.sockets.sockets.get(participantSocketId);
              if (participantSocket) {
                participantSocket.emit('session:user-disconnected', { sessionId });
              }
            }
          });
        }
      });
    }
  });

  // إدارة الأخطاء
  socket.on('error', (error) => {
    logger.error(`Socket error from ${socket.id}: ${error.message}`);
  });
});

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info('✅ WebSocket server ready');
  logger.info('🔒 All data is processed locally - no permanent storage');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received, shutting down gracefully...');
  activeSessions.clear();
  userSockets.clear();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
