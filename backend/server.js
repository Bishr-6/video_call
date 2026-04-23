import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['https://video-call-one-kappa.vercel.app', 'http://localhost:5173'];
    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow during transitions
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

const users = new Map();
const rooms = new Map();
let matchingQueue = []; // For random 1-on-1 chat

io.on('connection', (socket) => {
  socket.on('user:register', (data) => {
    users.set(socket.id, { id: socket.id, displayName: data.displayName || 'مستخدم', isDeaf: data.isDeaf || false, roomId: null });
    socket.emit('user:registered', { id: socket.id });
  });

  // --- AI Brain & Voice Logic ---
  socket.on('ai:process', async (data) => {
    const { text, roomId } = data;
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API Key is missing!');
      return;
    }

    try {
      // 1. Brain: Refine the raw sign words into a natural Arabic sentence
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert translator for Emirati Sign Language. Convert raw keywords into a natural, grammatically correct, and polite Arabic sentence suitable for a live voice call. Respond ONLY with the refined sentence in Arabic. No explanations." },
          { role: "user", content: `Raw keywords: ${text}` }
        ],
        max_tokens: 50,
      });

      const refinedText = completion.choices[0].message.content.trim();

      // 2. Voice: Convert refined text to Speech (Onyx - Deep Male Voice)
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: refinedText,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const audioBase64 = buffer.toString('base64');

      // 3. Send back to the room
      const payload = {
        senderId: socket.id,
        senderName: users.get(socket.id)?.displayName || 'مستخدم',
        text: refinedText,
        audio: `data:audio/mp3;base64,${audioBase64}`,
        type: 'sign'
      };

      // Emit to everyone in the room (including sender)
      io.to(roomId).emit('ai:result', payload);
      
    } catch (error) {
      console.error('AI Error:', error);
    }
  });

  // --- Random 1-on-1 Chat Logic ---
  socket.on('queue:join', () => {
    if (matchingQueue.includes(socket.id)) return;
    
    if (matchingQueue.length > 0) {
      const partnerId = matchingQueue.shift();
      const roomId = uuidv4().substring(0, 8);
      
      // Tell both users to join this room
      io.to(socket.id).emit('match:found', { roomId, partnerId });
      io.to(partnerId).emit('match:found', { roomId, partnerId: socket.id });
    } else {
      matchingQueue.push(socket.id);
      socket.emit('queue:waiting');
    }
  });

  socket.on('queue:leave', () => {
    matchingQueue = matchingQueue.filter(id => id !== socket.id);
  });

  // --- Private Room Logic ---
  socket.on('room:create', () => {
    const roomId = uuidv4().substring(0, 8);
    socket.emit('room:created', { roomId });
  });

  socket.on('room:join', (data) => {
    const { roomId } = data;
    const user = users.get(socket.id);
    if (!user) return;

    socket.join(roomId);
    user.roomId = roomId;

    if (!rooms.has(roomId)) rooms.set(roomId, { users: [] });
    const room = rooms.get(roomId);

    const existingUsers = room.users.map(id => ({
      id,
      displayName: users.get(id)?.displayName,
      isDeaf: users.get(id)?.isDeaf
    }));
    socket.emit('room:users', existingUsers);

    socket.to(roomId).emit('user:joined', { id: socket.id, displayName: user.displayName, isDeaf: user.isDeaf });
    room.users.push(socket.id);
  });

  socket.on('webrtc:signal', (data) => {
    const { to, signal } = data;
    io.to(to).emit('webrtc:signal', { from: socket.id, signal });
  });

  socket.on('transcription:send', (data) => {
    const { roomId, text, type } = data;
    socket.to(roomId).emit('transcription:received', { senderId: socket.id, senderName: users.get(socket.id)?.displayName, text, type });
  });

  socket.on('disconnect', () => {
    matchingQueue = matchingQueue.filter(id => id !== socket.id);
    const user = users.get(socket.id);
    if (user?.roomId) {
      socket.to(user.roomId).emit('user:left', { id: socket.id });
      const room = rooms.get(user.roomId);
      if (room) {
        room.users = room.users.filter(id => id !== socket.id);
        if (room.users.length === 0) rooms.delete(user.roomId);
      }
    }
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
