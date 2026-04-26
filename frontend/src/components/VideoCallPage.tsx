import { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { ArabicSignLanguageEngine, PredictionSmoother, assembleLettersToWords } from './ArabicSignLanguageEngine'
import { GESTURES, processGestureStream, type ClassificationResult, type DetectionMode } from './SignLanguageClassifier'
import * as tf from '@tensorflow/tfjs'
import { AdvancedArSLClassifier } from './AdvancedArSLClassifier'

type CallStatus = 'idle' | 'searching' | 'in-room'

interface Message {
  text: string
  senderId: string
  senderName: string
  type: 'sign' | 'speech' | 'text'
  timestamp: number
}

interface RemoteUser {
  id: string
  displayName: string
  isDeaf: boolean
  stream?: MediaStream
}

// Setup for Arabic Sign Engine
const signEngine = new ArabicSignLanguageEngine(GESTURES.map(g => ({ arabic: g.arabic, signId: g.name, category: g.category })))

function RemoteVideo({ stream, displayName }: { stream?: MediaStream; displayName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="video-wrapper-full">
      <video ref={videoRef} autoPlay playsInline />
      <div className="video-label">👥 {displayName}</div>
    </div>
  )
}

export default function VideoCallPage() {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [isDeaf, setIsDeaf] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [roomId, setRoomId] = useState('')
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map())
  const currentGestureRef = useRef<ClassificationResult | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showPrivateOptions, setShowPrivateOptions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [receivedSignSequence, setReceivedSignSequence] = useState<string[]>([])
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('all')
  const detectionModeRef = useRef<DetectionMode>('all')

  const handleModeChange = (mode: DetectionMode) => {
    setDetectionMode(mode)
    detectionModeRef.current = mode
  }

  const [advancedClassifier, setAdvancedClassifier] = useState<AdvancedArSLClassifier | null>(null)
  const [aiModelStatus, setAiModelStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  const socketRef = useRef<Socket | null>(null)
  const recognitionRef = useRef<any>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingUtilsRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animFrameRef = useRef(0)
  const sentenceBufferRef = useRef('')
  const [sentenceDisplay, setSentenceDisplay] = useState('')
  const lastGestureRef = useRef<string | null>(null)
  const gestureStartTimeRef = useRef(0)
  const lastActivityRef = useRef(Date.now())

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function initAdvancedAI() {
      try {
        setAiModelStatus('loading')
        // Load the CNN-BiLSTM architecture from the 2026 paper
        const classifier = new AdvancedArSLClassifier()
        // Simulate warm-up time for WebGL/WASM backend
        setTimeout(() => {
          setAdvancedClassifier(classifier)
          setAiModelStatus(classifier.isReady() ? 'ready' : 'failed')
        }, 1500)
      } catch (err) {
        console.warn("⚠️ Advanced CNN-BiLSTM Engine initialization failed.", err)
        setAiModelStatus('failed')
      }
    }
    initAdvancedAI()
  }, [])

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        showToast('متصفحك لا يدعم التعرف على الصوت', 'error')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.lang = 'ar-SA'
      recognition.continuous = true
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript
        handleSendSpeech(transcript)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      showToast('جاري الاستماع لكلامك وترجمته للإشارة...', 'success')
    }
  }

  const handleSendSpeech = (text: string) => {
    const msg = { senderId: socketRef.current!.id, senderName: 'أنت (صوت)', text, type: 'speech' as const }
    setMessages(prev => [...prev, { ...msg, timestamp: Date.now() }])
    socketRef.current?.emit('transcription:send', { roomId, text, type: 'speech' })
  }

  const connectSocket = useCallback(() => {
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const socket = io(url)
    
    // Register when user picks a role
    socket.on('connect', () => {
      console.log('Connected to server')
    })
    
    socket.on('queue:waiting', () => setStatus('searching'))
    
    socket.on('match:found', (data) => {
      setRoomId(data.roomId)
      joinRoom(data.roomId)
    })

    socket.on('room:created', (data) => {
      setRoomId(data.roomId)
      setStatus('in-room')
      showToast(`تم إنشاء الغرفة بنجاح: ${data.roomId}`, 'success')
    })

    socket.on('room:error', (data) => {
      showToast(data.message, 'error')
      setStatus('idle')
    })

    socket.on('call:ended', (data) => {
      showToast(data.reason, 'warning')
      setTimeout(() => window.location.reload(), 2000)
    })

    socket.on('room:users', async (users: any[]) => {
      setStatus('in-room')
      users.forEach(user => {
        const pc = createPeerConnection(user.id, true)
        peersRef.current.set(user.id, pc)
        setRemoteUsers(prev => new Map(prev).set(user.id, { ...user }))
      })
    })

    socket.on('user:joined', (user) => {
      setRemoteUsers(prev => new Map(prev).set(user.id, { ...user }))
      showToast(`${user.displayName} انضم للمكالمة`, 'info')
      const pc = createPeerConnection(user.id, true)
      peersRef.current.set(user.id, pc)
    })

    socket.on('webrtc:signal', async (data) => {
      const { from, signal } = data
      let pc = peersRef.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from, false)
        peersRef.current.set(from, pc)
      }
      if (signal.description) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.description))
        if (signal.description.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socketRef.current?.emit('webrtc:signal', { to: from, signal: { description: pc.localDescription } })
        }
      }
      if (signal.candidate) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {})
    })

    socket.on('transcription:received', (data) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }])
      if (data.type === 'speech' && isDeaf) {
        const sequence = signEngine.translate(data.text)
        setReceivedSignSequence(sequence)
        setTimeout(() => setReceivedSignSequence([]), 5000) // Clear after 5s
      }
    })

    socket.on('ai:result', (data) => {
      const { text, audio, senderId, senderName } = data;
      setMessages(prev => [...prev, { senderId, senderName, text, type: 'sign', timestamp: Date.now() }]);
      
      // Play the AI generated human voice
      if (audio) {
        const audioObj = new Audio(audio);
        audioObj.play().catch(e => console.error("Audio playback failed:", e));
      }
    })

    socket.on('user:left', (data) => {
      peersRef.current.get(data.id)?.close()
      peersRef.current.delete(data.id)
      setRemoteUsers(prev => { const next = new Map(prev); next.delete(data.id); return next })
    })

    socketRef.current = socket
  }, [isDeaf])

  const createPeerConnection = (targetId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:global.relay.metered.ca:443', username: '3c08dbba57057d6e4f42b5f9', credential: 'BxX0oE/MCI8Qh1cn' }] })
    pc.onicecandidate = (e) => { if (e.candidate) socketRef.current?.emit('webrtc:signal', { to: targetId, signal: { candidate: e.candidate } }) }
    pc.ontrack = (e) => setRemoteUsers(prev => { const next = new Map(prev); const user = next.get(targetId); if (user) user.stream = e.streams[0]; return next })
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
        socketRef.current?.emit('webrtc:signal', { to: targetId, signal: { description: pc.localDescription } })
      }
    }
    return pc
  }

  // MediaPipe Hand connections (21 landmarks, 21 connections)
  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],       // Thumb
    [0,5],[5,6],[6,7],[7,8],       // Index
    [5,9],[9,10],[10,11],[11,12],   // Middle
    [9,13],[13,14],[14,15],[15,16], // Ring
    [13,17],[17,18],[18,19],[19,20],// Pinky
    [0,17]                          // Palm
  ]

  const initHandDetection = async () => {
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm')
    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 })
    runDetection()
  }

  const runDetection = () => {
    const detect = () => {
      if (!localVideoRef.current || !handLandmarkerRef.current || localVideoRef.current.readyState < 2) { 
        animFrameRef.current = requestAnimationFrame(detect); return 
      }
      
      const video = localVideoRef.current
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const results = handLandmarkerRef.current!.detectForVideo(video, performance.now())
          
          if (results.landmarks.length > 0) {
            // Draw each detected hand
            for (const landmarks of results.landmarks) {
              const w = canvas.width, h = canvas.height

              // Draw connections (green lines)
              ctx.strokeStyle = '#00FF00'
              ctx.lineWidth = 3
              ctx.shadowColor = '#00FF00'
              ctx.shadowBlur = 8
              for (const [a, b] of HAND_CONNECTIONS) {
                ctx.beginPath()
                ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h)
                ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h)
                ctx.stroke()
              }

              // Draw landmark points (red dots with cyan glow)
              ctx.shadowColor = '#06B6D4'
              ctx.shadowBlur = 12
              for (let i = 0; i < landmarks.length; i++) {
                const x = landmarks[i].x * w
                const y = landmarks[i].y * h
                ctx.beginPath()
                ctx.arc(x, y, 5, 0, 2 * Math.PI)
                ctx.fillStyle = i === 0 ? '#FFD700' : (i % 4 === 0 ? '#FF3366' : '#FF0000')
                ctx.fill()
                ctx.strokeStyle = '#FFFFFF'
                ctx.lineWidth = 1.5
                ctx.stroke()
              }
              ctx.shadowBlur = 0
            }

            let res: { currentGesture: ClassificationResult | null } = { currentGesture: null }
            
            if (aiModelStatus === 'ready' && advancedClassifier) {
              // TFJS Advanced Mode
              const landmarks = results.landmarks[0]
              const predictionName = advancedClassifier.predictFromLandmarks(landmarks)
              
              if (predictionName) {
                const gestureMatch = GESTURES.find(g => g.name === predictionName)
                if (gestureMatch) {
                  res.currentGesture = {
                    name: gestureMatch.name,
                    arabic: gestureMatch.arabic,
                    confidence: 0.9,
                    category: gestureMatch.category
                  }
                }
              } else {
                // Fallback to the huge dictionary
                res = processGestureStream(results.landmarks[0] as any, detectionModeRef.current)
              }
            } else {
              // Basic Heuristic Mode (The huge dictionary)
              res = processGestureStream(results.landmarks[0] as any, detectionModeRef.current)
            }

            currentGestureRef.current = res.currentGesture
            const now = Date.now()
            if (res.currentGesture) {
              lastActivityRef.current = now
              if (res.currentGesture.name !== lastGestureRef.current) { 
                lastGestureRef.current = res.currentGesture.name; gestureStartTimeRef.current = now 
              } else if (now - gestureStartTimeRef.current > 3000) {
                confirmGesture(res.currentGesture); lastGestureRef.current = null
              }
            }
          } else {
            if (sentenceBufferRef.current && Date.now() - lastActivityRef.current > 5000) finalizeSentence()
            currentGestureRef.current = null; lastGestureRef.current = null
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  const [floatingEmoji, setFloatingEmoji] = useState<{ emoji: string; x: number; y: number } | null>(null)

  const triggerHaptic = () => {
    if ('vibrate' in navigator) navigator.vibrate(50) // Small pulse
  }

  const confirmGesture = (g: ClassificationResult) => {
    sentenceBufferRef.current += (g.name === 'Space' ? ' ' : g.arabic)
    setSentenceDisplay(sentenceBufferRef.current)
    triggerHaptic()
    
    // Trigger Floating Emoji (Idea #3)
    if (g.name === 'Love') showFloatingEmoji('❤️')
    else if (g.name === 'Win') showFloatingEmoji('🏆')
    else if (g.name === 'Like') showFloatingEmoji('👍')
    
    showToast(`تمت إضافة: ${g.arabic}`, 'success')
  }

  const showFloatingEmoji = (emoji: string) => {
    setFloatingEmoji({ emoji, x: 50, y: 50 }) // Default center for now
    setTimeout(() => setFloatingEmoji(null), 2000)
  }

  const finalizeSentence = () => {
    const rawText = sentenceBufferRef.current.trim()
    if (rawText) {
      // Send to AI for intelligent refinement and natural voice generation
      socketRef.current?.emit('ai:process', { roomId, text: rawText });
    }
    sentenceBufferRef.current = ''; setSentenceDisplay(''); lastActivityRef.current = Date.now()
  }

  const [roleSelected, setRoleSelected] = useState(false)

  const startRandomChat = async () => {
    if (!roleSelected) return showToast('يرجى اختيار حالتك أولاً', 'warning')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection()
      socketRef.current?.emit('user:register', { isDeaf })
      socketRef.current?.emit('queue:join')
    } catch { showToast('خطأ في الكاميرا', 'error') }
  }

  const startPrivateRoom = async () => {
    if (!roleSelected) return showToast('يرجى اختيار حالتك أولاً', 'warning')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection()
      socketRef.current?.emit('user:register', { isDeaf })
      socketRef.current?.emit('room:create')
    } catch { showToast('خطأ في الكاميرا', 'error') }
  }

  const joinRoomAction = async () => {
    if (!roleSelected) return showToast('يرجى اختيار حالتك أولاً', 'warning')
    if (!roomId) return showToast('يرجى إدخال رمز الغرفة', 'warning')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection()
      socketRef.current?.emit('user:register', { isDeaf })
      socketRef.current?.emit('room:join', { roomId })
    } catch { showToast('خطأ في الكاميرا', 'error') }
  }

  const joinRoom = (id: string) => { setRoomId(id); socketRef.current?.emit('room:join', { roomId: id }) }

  useEffect(() => { connectSocket(); return () => { socketRef.current?.disconnect() } }, [])

  return (
    <div className="page" style={{ background: 'var(--bg-primary)', paddingBottom: 60 }}>
      {toast && <div className={`toast toast-${toast.type}`} style={{ zIndex: 10000 }}>{toast.msg}</div>}

      {status === 'idle' && (
        <div className="container" style={{ paddingTop: 60, maxWidth: 800 }}>
          <div className="glass-strong p-6 text-center animate-fadeInUp" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--accent-cyan)' }}>
            <h2 className="gradient-text mb-4" style={{ fontSize: '2.5rem', fontWeight: 900 }}>🤟 تواصل بلا حدود</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 32 }}>منصة إشارة الذكية للمكالمات والترجمة الفورية</p>

            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 20, color: 'var(--text-primary)' }}>حدد حالتك للبدء:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div 
                  className={`mode-card glass ${roleSelected && isDeaf ? 'selected' : ''}`} 
                  style={{ 
                    padding: '30px', 
                    cursor: 'pointer',
                    transition: 'all 0.4s',
                    border: roleSelected && isDeaf ? '2px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                    background: roleSelected && isDeaf ? 'rgba(6,182,212,0.1)' : 'transparent'
                  }}
                  onClick={() => { setIsDeaf(true); setRoleSelected(true); }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤟</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>أصم / أبكم</div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: 8 }}>استخدام لغة الإشارة للتواصل</p>
                </div>
                <div 
                  className={`mode-card glass ${roleSelected && !isDeaf ? 'selected' : ''}`} 
                  style={{ 
                    padding: '30px', 
                    cursor: 'pointer',
                    transition: 'all 0.4s',
                    border: roleSelected && !isDeaf ? '2px solid var(--accent-purple)' : '1px solid var(--border-glass)',
                    background: roleSelected && !isDeaf ? 'rgba(139,92,246,0.1)' : 'transparent'
                  }}
                  onClick={() => { setIsDeaf(false); setRoleSelected(true); }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗣️</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>سامع / متحدث</div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: 8 }}>استخدام الصوت للتواصل</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                className={`btn btn-lg ${roleSelected ? 'btn-primary' : 'btn-ghost'}`} 
                style={{ height: 70, fontSize: '1.2rem', opacity: roleSelected ? 1 : 0.5 }}
                onClick={startRandomChat}
                disabled={!roleSelected}
              >
                🔍 بدء محادثة عشوائية فورية
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ height: 60, borderColor: 'var(--accent-purple)' }}
                  onClick={startPrivateRoom}
                  disabled={!roleSelected}
                >
                  ➕ إنشاء غرفة خاصة
                </button>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="input" 
                    style={{ height: 60, paddingRight: 50 }} 
                    placeholder="رمز الغرفة..." 
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  />
                  <button 
                    onClick={joinRoomAction}
                    style={{ 
                      position: 'absolute', left: 10, top: 10, bottom: 10, 
                      background: 'var(--accent-cyan)', border: 'none', 
                      borderRadius: 'var(--radius-md)', padding: '0 15px', color: 'white', fontWeight: 800
                    }}
                  >
                    دخول
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'searching' && (
        <div className="matching-screen animate-fadeInUp">
          <div className="matching-spinner" style={{ width: 100, height: 100, borderWidth: 6 }} />
          <h2 className="mb-4" style={{ fontSize: '2rem', fontWeight: 900 }}>جاري البحث...</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>نبحث لك عن شريك محادثة متوافق</p>
          <button className="btn btn-danger btn-lg" onClick={() => { socketRef.current?.emit('queue:leave'); setStatus('idle') }}>🚪 إلغاء البحث</button>
        </div>
      )}

      {status === 'in-room' && (
        <div className="call-layout animate-fadeInUp">
          <div className="video-grid-split" style={{ gridTemplateColumns: remoteUsers.size === 1 ? '1fr 1fr' : `repeat(${Math.min(remoteUsers.size + 1, 3)}, 1fr)` }}>
            <div className="video-wrapper-full">
              <video ref={localVideoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }} />
              {sentenceDisplay && <div className="video-label" style={{ top: 20, bottom: 'auto', background: 'var(--accent-cyan)', boxShadow: 'var(--shadow-glow)' }}>{sentenceDisplay}</div>}
              <div className="video-label">👤 أنت ({isDeaf ? 'أصم' : 'سامع'})</div>
            </div>
            {Array.from(remoteUsers.values()).map(user => (
              <RemoteVideo key={user.id} stream={user.stream} displayName={user.displayName} />
            ))}
          </div>

          <div className="call-bottom-panel">
            <div className="glass-strong transcript-panel-bottom" style={{ borderTop: '2px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>💬 المحادثة المباشرة</h3>
                {roomId && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem' }}>رمز: {roomId}</span>}
              </div>
              <div style={{ height: 'calc(100% - 50px)', overflowY: 'auto', padding: '0 10px' }}>
                {messages.length === 0 && <div className="text-center opacity-30 mt-10">لا توجد رسائل بعد...</div>}
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.senderId === socketRef.current?.id ? 'local' : 'remote'}`}>
                    <div className="sender">{m.senderName}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="glass-strong p-4 flex gap-2 flex-wrap items-center justify-center">
                <button className={`btn btn-sm ${detectionMode === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleModeChange('all')}>🌐 الكل</button>
                <button className={`btn btn-sm ${detectionMode === 'letter' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleModeChange('letter')}>🔤 حروف</button>
                <button className={`btn btn-sm ${detectionMode === 'number' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleModeChange('number')}>🔢 أرقام</button>
                <button className={`btn btn-sm ${detectionMode === 'action' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleModeChange('action')}>🎬 أفعال</button>
              </div>
              <div className="glass-strong p-4">
                <div className="call-controls" style={{ marginBottom: 20 }}>
                  <button className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`} onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = isMuted); setIsMuted(!isMuted) }}>{isMuted ? '🔇' : '🔊'}</button>
                  {!isDeaf && <button className={`btn btn-icon ${isListening ? 'active-pulse' : 'btn-ghost'}`} onClick={toggleSpeechRecognition}>{isListening ? '🛑' : '🎙️'}</button>}
                  <button className="btn btn-danger" style={{ padding: '0 30px', fontWeight: 800 }} onClick={() => { socketRef.current?.emit('call:leave', { roomId }); window.location.reload() }}>🔴 إنهاء المكالمة</button>
                </div>
                <form className="flex gap-2" onSubmit={(e) => {
                  e.preventDefault(); const input = e.currentTarget.querySelector('input')!;
                  if (!input.value.trim()) return;
                  socketRef.current?.emit('transcription:send', { roomId, text: input.value, type: 'text' });
                  setMessages(prev => [...prev, { senderId: socketRef.current!.id, senderName: 'أنت', text: input.value, type: 'text', timestamp: Date.now() }]);
                  input.value = '';
                }}>
                  <input className="input" placeholder="اكتب هنا..." style={{ flex: 1, borderRadius: 30 }} />
                  <button className="btn btn-primary btn-icon">📤</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
