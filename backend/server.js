import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import ytdl from '@distube/ytdl-core';
import youtubeTranscriptPkg from 'youtube-transcript';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { finished } from 'stream/promises';

dotenv.config();

const app = express();

// Prevent silent crashes on Railway and show root cause
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err);
});

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("✅ OpenAI Initialized");
} else {
  console.warn("⚠️ Warning: OPENAI_API_KEY is missing.");
}

// ✅ CORS Configuration for Production
// - Allow exact origins + any Vercel subdomain (preview & production)
// - Allow explicit CORS_ORIGIN from env (Railway variable)
const allowedOrigins = new Set([
  'https://video-call-one-kappa.vercel.app',
  'https://videocall-production-2b33.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);
if (process.env.CORS_ORIGIN) allowedOrigins.add(process.env.CORS_ORIGIN);

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow non-browser clients (curl/mobile)
  if (allowedOrigins.has(origin)) return true;
  // Allow Vercel preview/prod domains
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
  } catch {
    // ignore invalid Origin
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── External Datasets Registry (sources) ─────────────────────────
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getDatasetsConfig() {
  // Possible layouts:
  // 1) repoRoot/backend/server.js + repoRoot/ml_pipeline/datasets_config.json
  // 2) backend as deploy root: /app/server.js + /app/ml_pipeline/datasets_config.json
  const candidates = [
    path.join(path.resolve(__dirname, '..'), 'ml_pipeline', 'datasets_config.json'),
    path.join(path.resolve(__dirname), 'ml_pipeline', 'datasets_config.json'),
    path.join(process.cwd(), 'ml_pipeline', 'datasets_config.json'),
  ];
  for (const cfgPath of candidates) {
    const cfg = safeReadJson(cfgPath);
    if (cfg) return { cfgPath, cfg };
  }
  // return first candidate for debugging
  const cfgPath = candidates[0];
  return { cfgPath, cfg: null };
}

const SOURCES_CATALOG = {
  KArSL: {
    link: 'https://www.kaggle.com/datasets/umdmemphis/kasl-arabic-sign-language-lexicon',
    formats: ['mp4', 'skeleton', 'depth'],
  },
  ArASL2018: {
    link: 'https://data.mendeley.com/datasets/z8zr0t4jhb/4',
    formats: ['jpg', 'png'],
  },
  ArYSL: {
    link: 'https://figshare.com/articles/ArYSL_Arabic_Sign_Language_Dataset/7440476',
    formats: ['jpg', 'png'],
  },
  ArabSign: {
    link: null,
    formats: ['mp4', 'skeleton', 'depth'],
    note: 'يتطلب مراسلة الباحث (حسب موقع المصدر)',
  },
  AASL: {
    link: 'https://universe.roboflow.com/',
    formats: ['jpg', 'png'],
  },
};

function buildSourcesList() {
  const { cfg } = getDatasetsConfig();
  const datasets = Array.isArray(cfg?.datasets) ? cfg.datasets : [];
  return datasets.map((d) => {
    const extra = SOURCES_CATALOG[d.name] || {};
    return {
      name: d.name,
      description: d.description || '',
      type: d.type || 'unknown',
      priority: typeof d.priority === 'number' ? d.priority : null,
      enabled: !!d.enabled,
      input_dir: d.input_dir || '',
      link: extra.link ?? null,
      formats: extra.formats ?? [],
      note: extra.note ?? null,
      requires_landmarks: d.type === 'images' || d.type === 'videos',
      has_skeleton: d.type === 'skeleton' || (d.config && d.config.skeleton_available === true),
    };
  });
}

// ── Health Check ─────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Eshara Backend', version: '4.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/debug', (req, res) => res.json({
  version: '4.0.0',
  openai_ready: !!openai,
  node_env: process.env.NODE_ENV || 'not set',
  cors_origin_env: process.env.CORS_ORIGIN || null,
  pipeline: 'YouTube Transcript → Whisper → GPT-4o-mini'
}));

// Sources registry for frontend pages
app.get('/api/sources', (req, res) => {
  const { cfgPath, cfg } = getDatasetsConfig();
  if (!cfg) {
    return res.status(500).json({
      success: false,
      error: 'datasets_config.json غير موجود أو غير صالح',
      cfg_path: cfgPath,
    });
  }
  return res.json({
    success: true,
    version: cfg.version || 'unknown',
    sources: buildSourcesList(),
  });
});

// ══════════════════════════════════════════════════════════════════
// ██  SIGN LANGUAGE PIPELINE v4.0  ████████████████████████████████
// ══════════════════════════════════════════════════════════════════

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

// ── METHOD 1: YouTube Transcript (FREE) ──────────────────────────
async function getYouTubeTranscript(videoId) {
  try {
    console.log('  📝 Method 1: YouTube Transcript (free)...');
    const YoutubeTranscript =
      youtubeTranscriptPkg?.YoutubeTranscript ||
      youtubeTranscriptPkg?.default?.YoutubeTranscript ||
      youtubeTranscriptPkg?.default ||
      youtubeTranscriptPkg;

    if (!YoutubeTranscript?.fetchTranscript) {
      console.log('  ⚠️ youtube-transcript: fetchTranscript not available');
      return null;
    }

    const languages = ['ar', 'en', 'fr', 'es'];
    
    for (const lang of languages) {
      try {
        const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
        if (items?.length > 0) {
          const text = items.map(i => i.text).join(' ');
          console.log(`  ✅ Got transcript [${lang}] (${items.length} segments, ${text.length} chars)`);
          return { text, lang };
        }
      } catch (e) { /* try next */ }
    }
    
    // Try without language
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items?.length > 0) {
      const text = items.map(i => i.text).join(' ');
      console.log(`  ✅ Got transcript [auto] (${items.length} segments)`);
      return { text, lang: 'auto' };
    }
  } catch (e) {
    console.log(`  ❌ YouTube Transcript: ${e.message?.substring(0, 100)}`);
  }
  return null;
}

// ── METHOD 2: OpenAI Whisper ($0.006/min) ────────────────────────
async function whisperTranscribe(videoId) {
  if (!openai) return null;
  
  const tmpFile = path.join(os.tmpdir(), `eshara_${videoId}_${Date.now()}.webm`);
  
  try {
    console.log('  🎤 Method 2: Whisper ($0.006/min)...');
    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Download audio
    console.log('    ⬇️ Downloading audio...');
    const stream = ytdl(fullUrl, { filter: 'audioonly', quality: 'lowestaudio' });
    const writeStream = fs.createWriteStream(tmpFile);
    stream.pipe(writeStream);
    await finished(writeStream);
    
    const fileSize = fs.statSync(tmpFile).size;
    console.log(`    📦 Downloaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (fileSize < 1000) {
      throw new Error('Audio file too small — video may be blocked');
    }
    
    // Whisper API (max 25MB)
    if (fileSize > 25 * 1024 * 1024) {
      throw new Error('Audio too large for Whisper (>25MB)');
    }
    
    console.log('    🧠 Transcribing with Whisper...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: 'whisper-1',
      language: 'ar',
      response_format: 'text'
    });
    
    fs.unlinkSync(tmpFile);
    
    if (transcription && transcription.length > 5) {
      console.log(`  ✅ Whisper: "${transcription.substring(0, 100)}..."`);
      return transcription;
    }
  } catch (e) {
    console.log(`  ❌ Whisper: ${e.message?.substring(0, 100)}`);
    try { fs.unlinkSync(tmpFile); } catch {}
  }
  return null;
}

// ── METHOD 3: Metadata Fallback ──────────────────────────────────
async function getVideoMetadata(videoId) {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const meta = await res.json();
      return { title: meta.title || '', author: meta.author_name || '' };
    }
  } catch (e) { /* ignore */ }
  return { title: 'فيديو', author: '' };
}

// ── GPT: Convert to Sign Language Gloss ──────────────────────────
async function convertToSignGloss(text, sourceLang) {
  if (!openai) throw new Error('OpenAI غير متاح');

  const sources = buildSourcesList();
  const sourcesNote = sources.length
    ? `مصادر الإشارات المتاحة في النظام (مرجعية): ${sources.map(s => s.name).join(', ')}.`
    : '';

  const langNote = sourceLang && sourceLang !== 'ar' 
    ? `النص الأصلي باللغة ${sourceLang === 'en' ? 'الإنجليزية' : sourceLang}. ترجمه أولاً للعربية ثم حوّله.` 
    : '';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `أنت خبير في لغة الإشارة العربية والإماراتية. ${langNote}
${sourcesNote}
مهمتك:
1. إذا كان النص بلغة غير العربية، ترجمه للعربية أولاً
2. حوّل النص إلى Sign Language Gloss (احذف حروف الجر والأدوات)
3. رتّب: موضوع → فعل → مفعول
4. حلل المشاعر والموضوعات

أرجع JSON:
- gloss: النص بلغة الإشارة
- words_array: مصفوفة الكلمات (max 15)
- sentiment: positive/negative/neutral
- emotion: happy/sad/excited/calm/angry/surprised
- topics: المواضيع (مصفوفة)
- sign_intensity: low/medium/high
- summary_arabic: ملخص بالعربية`
      },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.3
  });

  return JSON.parse(completion.choices[0].message.content);
}

// ── Build Response ───────────────────────────────────────────────
function buildResponse(transcript, gpt, source) {
  const words = gpt.words_array || transcript.split(' ').slice(0, 15);
  const speed = gpt.emotion === 'excited' ? 1.4 : gpt.emotion === 'sad' ? 0.85 : 1.0;
  return {
    success: true,
    job_id: 'job_' + Date.now(),
    source,
    data: {
      transcript: transcript.substring(0, 500),
      sign_gloss: gpt.gloss || transcript,
      words_array: words,
      word_sequence: words.map((w, i) => ({ index: i, word: w, duration_ms: Math.max(500, w.length * 80), delay_ms: i * 600 })),
      sentiment: gpt.sentiment || 'neutral',
      emotion: gpt.emotion || 'calm',
      topics: gpt.topics || [],
      summary_arabic: gpt.summary_arabic || '',
      avatar_config: {
        expression: gpt.emotion || 'calm', speed,
        gesture_intensity: gpt.sign_intensity || 'medium',
        background_style: gpt.sentiment === 'positive' ? 'warm' : gpt.sentiment === 'negative' ? 'cool' : 'neutral'
      },
      total_words: words.length,
      estimated_duration_ms: words.length * 600,
      created_at: new Date().toISOString()
    }
  };
}

// ── API ROUTE ────────────────────────────────────────────────────
app.post('/api/sign-translate', async (req, res) => {
  try {
    const { video_url } = req.body;
    if (!video_url) return res.status(400).json({ success: false, error: 'video_url مطلوب' });
    if (!openai) return res.status(500).json({ success: false, error: 'OpenAI not configured' });

    const videoId = extractYouTubeId(video_url);
    if (!videoId) return res.status(400).json({ success: false, error: 'رابط YouTube غير صحيح' });

    console.log(`\n🎬 ═══ Processing: ${videoId} ═══`);

    let transcript = null;
    let source = 'unknown';
    let lang = 'ar';

    // 1. YouTube Transcript (FREE)
    const ytResult = await getYouTubeTranscript(videoId);
    if (ytResult) { transcript = ytResult.text; source = 'youtube_transcript'; lang = ytResult.lang; }

    // 2. Whisper (CHEAP)
    if (!transcript) {
      transcript = await whisperTranscribe(videoId);
      if (transcript) { source = 'whisper'; lang = 'ar'; }
    }

    // 3. Metadata (FREE, last resort)
    if (!transcript) {
      const meta = await getVideoMetadata(videoId);
      transcript = `عنوان الفيديو: ${meta.title}. القناة: ${meta.author}. أنشئ محتوى لغة إشارة مناسباً.`;
      source = 'metadata';
    }

    console.log(`📊 Source: ${source} | Lang: ${lang}`);

    // Convert to Sign Language
    console.log('🧠 GPT: Converting to Sign Language...');
    const gptResult = await convertToSignGloss(transcript, lang);
    const response = buildResponse(transcript, gptResult, source);
    response.sources = buildSourcesList();

    console.log(`✅ ═══ Done! ${response.data.words_array.length} words ═══\n`);
    return res.json(response);

  } catch (error) {
    console.error('❌ Pipeline error:', error?.message);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// ██  SOCKET.IO (Video Call)  █████████████████████████████████████
// ══════════════════════════════════════════════════════════════════

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const users = new Map();
const rooms = new Map();
let matchingQueue = [];

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
