import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Initialize OpenAI carefully to prevent crashes if key is missing
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("✅ OpenAI Initialized");
} else {
  console.warn("⚠️ Warning: OPENAI_API_KEY is missing. AI features will be disabled.");
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Eshara Backend', version: '2.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/debug', (req, res) => res.json({
  version: '2.0.0',
  openai_ready: !!openai,
  rapidapi_key_set: !!process.env.RAPIDAPI_KEY,
  deepgram_key_set: !!process.env.DEEPGRAM_API_KEY,
  n8n_webhook: process.env.N8N_WEBHOOK_URL ? 'set' : 'not set',
  node_env: process.env.NODE_ENV || 'not set',
  pipeline_mode: (!!process.env.RAPIDAPI_KEY && !!process.env.DEEPGRAM_API_KEY && !!openai) ? 'DIRECT' : 'DEMO'
}));

// ── Sign Language Pipeline (Direct - No n8n needed) ─────────────

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL || '';

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Step 1: Get audio URL via RapidAPI
async function getAudioUrl(videoUrl) {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) throw new Error('رابط YouTube غير صحيح');

  const res = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) throw new Error(`RapidAPI error: ${res.status}`);
  const data = await res.json();
  if (!data.link) throw new Error('لم يتم استخراج رابط الصوت');
  return data.link;
}

// Step 2: Transcribe audio with Deepgram
async function transcribeAudio(audioUrl) {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=ar&smart_format=true&punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: audioUrl }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error(`Deepgram error: ${res.status}`);
  const data = await res.json();
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  if (!transcript) throw new Error('لم يتم التعرف على الكلام في الفيديو');
  return transcript;
}

// Step 3: Convert to Sign Language Gloss via OpenAI
async function convertToSignGloss(transcript) {
  if (!openai) throw new Error('OpenAI غير متاح');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `أنت خبير متخصص في لغة الإشارة الإماراتية والعربية. مهمتك تحويل النصوص العربية إلى Sign Language Gloss.
اتبع هذه القواعد:
1. احذف: الحروف الجر (في، على، من، إلى)، الضمائر غير الضرورية، أدوات التعريف
2. أعد ترتيب الكلمات: الموضوع → الفعل → المفعول
3. استخدم المفرد بدل الجمع عند الإمكان
4. حلل المشاعر من السياق

أرجع JSON بهذه الحقول فقط:
- gloss: النص المحوّل لغة إشارة
- words_array: مصفوفة الكلمات الأساسية
- sentiment: positive أو negative أو neutral
- emotion: happy أو sad أو excited أو calm أو angry أو surprised
- topics: المواضيع الرئيسية (مصفوفة)
- sign_intensity: low أو medium أو high
- summary_arabic: ملخص قصير للمحتوى`
      },
      { role: 'user', content: `حوّل هذا النص إلى Sign Language Gloss: ${transcript}` }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.3
  });

  const raw = completion.choices[0].message.content;
  return JSON.parse(raw);
}

// Build final response object
function buildResponse(transcript, gpt, videoUrl) {
  const words = gpt.words_array || transcript.split(' ').slice(0, 10);
  const speed = gpt.emotion === 'excited' ? 1.4 : gpt.emotion === 'sad' ? 0.85 : 1.0;
  return {
    success: true,
    job_id: 'job_' + Date.now(),
    data: {
      transcript,
      sign_gloss: gpt.gloss || transcript,
      words_array: words,
      word_sequence: words.map((w, i) => ({ index: i, word: w, duration_ms: Math.max(500, w.length * 80), delay_ms: i * 600 })),
      sentiment: gpt.sentiment || 'neutral',
      emotion: gpt.emotion || 'calm',
      topics: gpt.topics || [],
      summary_arabic: gpt.summary_arabic || transcript.substring(0, 100),
      avatar_config: {
        expression: gpt.emotion || 'calm',
        speed,
        gesture_intensity: gpt.sign_intensity || 'medium',
        background_style: gpt.sentiment === 'positive' ? 'warm' : gpt.sentiment === 'negative' ? 'cool' : 'neutral'
      },
      total_words: words.length,
      estimated_duration_ms: words.length * 600,
      created_at: new Date().toISOString()
    }
  };
}

// Demo fallback
function buildDemoResponse() {
  const words = ['مرحبا', 'هذا', 'عرض', 'توضيحي', 'لغة', 'إشارة', 'عربية'];
  return {
    success: true, job_id: 'demo_' + Date.now(), demo_mode: true,
    data: {
      transcript: 'هذا مثال توضيحي — أضف مفاتيح API لتجربة الترجمة الحقيقية.',
      sign_gloss: 'مثال توضيحي لغة إشارة عربية',
      words_array: words,
      word_sequence: words.map((w, i) => ({ index: i, word: w, duration_ms: 700, delay_ms: i * 700 })),
      sentiment: 'neutral', emotion: 'calm', topics: ['تقنية', 'لغة إشارة'],
      summary_arabic: 'عرض توضيحي لميزة تحويل الفيديو إلى لغة الإشارة',
      avatar_config: { expression: 'calm', speed: 1.0, gesture_intensity: 'medium', background_style: 'neutral' },
      total_words: words.length, estimated_duration_ms: words.length * 700,
      created_at: new Date().toISOString()
    }
  };
}

app.post('/api/sign-translate', async (req, res) => {
  try {
    const { video_url, platform, language } = req.body;
    if (!video_url) return res.status(400).json({ success: false, error: 'video_url مطلوب' });

    console.log(`🎬 Processing video: ${video_url}`);

    // Try n8n first if it's a cloud URL
    if (N8N_WEBHOOK && !N8N_WEBHOOK.includes('localhost') && !N8N_WEBHOOK.includes('127.0.0.1')) {
      try {
        const n8nRes = await fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url, platform: platform || 'youtube', language: language || 'ar' }),
          signal: AbortSignal.timeout(60000)
        });
        if (n8nRes.ok) {
          const data = await n8nRes.json();
          console.log('✅ n8n pipeline success');
          return res.json(data);
        }
      } catch (e) {
        console.warn('⚠️ n8n failed, falling back to direct pipeline:', e.message);
      }
    }

    // Direct pipeline (no n8n needed)
    if (RAPIDAPI_KEY && DEEPGRAM_API_KEY && openai) {
      console.log('🔄 Using direct pipeline...');
      
      // Step 1: Get audio URL
      console.log('🎵 Step 1: Extracting audio...');
      const audioUrl = await getAudioUrl(video_url);
      
      // Step 2: Transcribe
      console.log('🗣️ Step 2: Transcribing with Deepgram...');
      const transcript = await transcribeAudio(audioUrl);
      console.log(`📝 Transcript: ${transcript.substring(0, 100)}...`);
      
      // Step 3: Convert to sign language
      console.log('🧠 Step 3: Converting to sign gloss with GPT...');
      const gptResult = await convertToSignGloss(transcript);
      
      const response = buildResponse(transcript, gptResult, video_url);
      console.log('✅ Direct pipeline success!');
      return res.json(response);
    }

    // Fallback to demo
    console.log('⚠️ Missing API keys - returning demo response');
    res.json(buildDemoResponse());

  } catch (error) {
    console.error('❌ Pipeline error:', error?.message);
    // Return demo on any error
    res.json({ ...buildDemoResponse(), error_detail: error?.message });
  }
});
// ─────────────────────────────────────────────────────────────────



const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for Socket.io to fix CORS issues
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
