import { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { processGestureStream, resetBuffer, type ClassificationResult } from './SignLanguageClassifier'

type CallStatus = 'idle' | 'connecting' | 'searching' | 'matched' | 'in-call'

interface Message {
  text: string
  sender: 'local' | 'remote'
  type: 'sign' | 'speech' | 'text'
  timestamp: number
}

export default function VideoCallPage() {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [isDeaf, setIsDeaf] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerName, setPartnerName] = useState('')
  const [partnerIsDeaf, setPartnerIsDeaf] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<ClassificationResult | null>(null)
  const [wordBuffer, setWordBuffer] = useState('')
  const [isMicListening, setIsMicListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const roomIdRef = useRef('')
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animFrameRef = useRef(0)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Connect to server
  const connectSocket = useCallback(() => {
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const socket = io(url, { reconnection: true, reconnectionDelay: 1000 })

    socket.on('connect', () => {
      socket.emit('user:register', {
        displayName: `مستخدم-${Date.now().toString().slice(-4)}`,
        isDeaf,
      })
      setStatus('connecting')
    })

    socket.on('user:registered', (data) => {
      showToast(`تم التسجيل: ${data.displayName}`, 'success')
      setStatus('idle')
    })

    socket.on('queue:waiting', () => {
      setStatus('searching')
      showToast('جاري البحث عن شخص...', 'info')
    })

    socket.on('match:found', async (data) => {
      roomIdRef.current = data.roomId
      setPartnerName(data.partnerName)
      setPartnerIsDeaf(data.partnerIsDeaf)
      setStatus('matched')
      showToast(`تم الاتصال مع ${data.partnerName}!`, 'success')

      // Start WebRTC
      await setupWebRTC(socket, data.isInitiator)
      setStatus('in-call')
    })

    socket.on('webrtc:offer', async ({ offer }) => {
      if (!peerRef.current) return
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerRef.current.createAnswer()
      await peerRef.current.setLocalDescription(answer)
      socket.emit('webrtc:answer', { roomId: roomIdRef.current, answer })
    })

    socket.on('webrtc:answer', async ({ answer }) => {
      if (!peerRef.current) return
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      if (!peerRef.current) return
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    })

    socket.on('transcription:received', (data) => {
      addMessage(data.text, 'remote', data.type || 'text')
      // Speak for deaf user
      if (isDeaf && 'speechSynthesis' in window && data.type === 'sign') {
        // Don't speak sign translations from remote
      }
      if (!isDeaf && data.type === 'sign' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(data.text)
        u.lang = 'ar-SA'; u.rate = 0.9
        speechSynthesis.speak(u)
      }
    })

    socket.on('partner:disconnected', () => {
      showToast('انقطع الاتصال مع الطرف الآخر', 'warning')
      cleanupCall()
      setStatus('idle')
    })

    socket.on('disconnect', () => {
      showToast('انقطع الاتصال بالسيرفر', 'error')
      cleanupCall()
      setStatus('idle')
    })

    socketRef.current = socket
  }, [isDeaf])

  const setupWebRTC = async (socket: Socket, isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:global.relay.metered.ca:443',
            username: '3c08dbba57057d6e4f42b5f9',
            credential: 'BxX0oE/MCI8Qh1cn'
          }
        ],
      })
      peerRef.current = pc

      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0]
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc:ice-candidate', { roomId: roomIdRef.current, candidate: e.candidate })
        }
      }

      if (isInitiator) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc:offer', { roomId: roomIdRef.current, offer })
      }

      // Start hand detection
      await initHandDetection()
    } catch (err) {
      console.error('WebRTC error:', err)
      showToast('خطأ في الكاميرا أو الميكروفون', 'error')
    }
  }

  const initHandDetection = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm'
      )
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })
      resetBuffer()
      runDetection()
    } catch (err) {
      console.error('MediaPipe error:', err)
    }
  }

  const runDetection = () => {
    const detect = () => {
      if (!localVideoRef.current || !handLandmarkerRef.current || localVideoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }
      const results = handLandmarkerRef.current.detectForVideo(localVideoRef.current, performance.now())

      // Draw landmarks
      if (canvasRef.current && localVideoRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = localVideoRef.current.videoWidth
          canvasRef.current.height = localVideoRef.current.videoHeight
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          const w = canvasRef.current.width, h = canvasRef.current.height
          results.landmarks.forEach(lms => {
            ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2; ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 6
            const conns = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]]
            conns.forEach(([a,b]) => { ctx.beginPath(); ctx.moveTo(lms[a].x*w,lms[a].y*h); ctx.lineTo(lms[b].x*w,lms[b].y*h); ctx.stroke() })
            ctx.shadowBlur = 0
            lms.forEach((l,i) => { ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#f59e0b' : '#06b6d4'; ctx.beginPath(); ctx.arc(l.x*w,l.y*h,4,0,Math.PI*2); ctx.fill() })
          })
        }
      }

      if (results.landmarks.length > 0) {
        const stream = processGestureStream(results.landmarks[0] as any)
        setCurrentGesture(stream.currentGesture)
        setWordBuffer(stream.currentWord)
        if (stream.confirmedWord) {
          addMessage(stream.confirmedWord, 'local', 'sign')
          socketRef.current?.emit('transcription:send', {
            roomId: roomIdRef.current,
            text: stream.confirmedWord,
            language: 'ar',
            type: 'sign',
          })
        }
      } else {
        setCurrentGesture(null)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  const addMessage = (text: string, sender: 'local' | 'remote', type: 'sign' | 'speech' | 'text') => {
    setMessages(prev => [...prev, { text, sender, type, timestamp: Date.now() }])
  }

  const cleanupCall = () => {
    cancelAnimationFrame(animFrameRef.current)
    peerRef.current?.close(); peerRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    roomIdRef.current = ''
    setMessages([])
    setCurrentGesture(null)
    setWordBuffer('')
    resetBuffer()
    stopSpeechRecognition()
  }

  const startSearch = () => {
    if (!socketRef.current?.connected) {
      connectSocket()
      setTimeout(() => socketRef.current?.emit('queue:join'), 1000)
    } else {
      socketRef.current.emit('queue:join')
    }
    setStatus('searching')
  }

  const stopSearch = () => {
    socketRef.current?.emit('queue:leave')
    cleanupCall()
    setStatus('idle')
  }

  const nextPartner = () => {
    socketRef.current?.emit('room:leave')
    cleanupCall()
    setStatus('searching')
    setTimeout(() => socketRef.current?.emit('queue:join'), 500)
  }

  const endCall = () => {
    socketRef.current?.emit('room:leave')
    cleanupCall()
    setStatus('idle')
  }

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCamOff })
    setIsCamOff(!isCamOff)
  }

  // Speech-to-text
  const startSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { showToast('المتصفح لا يدعم التعرف على الصوت', 'error'); return }
    const rec = new SR()
    rec.lang = 'ar-SA'; rec.continuous = true; rec.interimResults = false
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript
          addMessage(text, 'local', 'speech')
          socketRef.current?.emit('transcription:send', {
            roomId: roomIdRef.current, text, language: 'ar', type: 'speech',
          })
        }
      }
    }
    rec.onerror = () => { setIsMicListening(false) }
    rec.onend = () => { if (isMicListening) rec.start() }
    rec.start()
    recognitionRef.current = rec
    setIsMicListening(true)
  }

  const stopSpeechRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsMicListening(false)
  }

  useEffect(() => {
    connectSocket()
    return () => {
      cleanupCall()
      socketRef.current?.disconnect()
    }
  }, [])

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  // === RENDER ===
  return (
    <div className="page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Mode Selection - shown when idle */}
      {status === 'idle' && (
        <div className="matching-screen">
          <h2 className="gradient-text">📹 مكالمة فيديو ذكية</h2>
          <p>اختر نوع المستخدم ثم اضغط "ابدأ" للبحث عن شخص</p>

          <div className="mode-selector">
            <div className={`mode-card glass ${isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(true)}>
              <div className="icon">🤟</div>
              <div className="label">أصم / أبكم</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>أستخدم لغة الإشارة</div>
            </div>
            <div className={`mode-card glass ${!isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(false)}>
              <div className="icon">🗣️</div>
              <div className="label">سامع / متحدث</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>أتحدث بالصوت</div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={startSearch} style={{ marginTop: 24 }}>
            🚀 ابدأ البحث
          </button>

          <div style={{ marginTop: 32 }}>
            <div className="privacy-badge">🔒 اتصال مشفر P2P • لا نحفظ أي فيديو</div>
          </div>
        </div>
      )}

      {/* Searching */}
      {status === 'searching' && (
        <div className="matching-screen">
          <div className="matching-spinner" />
          <h2>جاري البحث عن شخص...</h2>
          <p>سيتم ربطك تلقائياً بأول شخص متاح</p>
          <button className="btn btn-danger" onClick={stopSearch} style={{ marginTop: 16 }}>
            ⏹️ إيقاف البحث
          </button>
        </div>
      )}

      {/* Connecting */}
      {status === 'connecting' && (
        <div className="matching-screen">
          <div className="matching-spinner" />
          <h2>جاري الاتصال بالسيرفر...</h2>
        </div>
      )}

      {/* In Call */}
      {(status === 'matched' || status === 'in-call') && (
        <div className="call-layout">
          {/* Videos */}
          <div>
            <div className="video-grid">
              {/* Local */}
              <div className="video-wrapper" style={{ border: '2px solid rgba(6,182,212,0.3)' }}>
                <video ref={localVideoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }} />
                <div className="video-label">👤 أنت {isDeaf ? '(أصم)' : '(سامع)'}</div>
              </div>
              {/* Remote */}
              <div className="video-wrapper" style={{ border: '2px solid rgba(139,92,246,0.3)' }}>
                <video ref={remoteVideoRef} autoPlay playsInline />
                {!remoteVideoRef.current?.srcObject && (
                  <div className="video-placeholder"><div className="icon">⏳</div><span>جاري الاتصال...</span></div>
                )}
                <div className="video-label">👥 {partnerName} {partnerIsDeaf ? '(أصم)' : '(سامع)'}</div>
              </div>
            </div>

            {/* Gesture Display */}
            {currentGesture && (
              <div className="glass gesture-display" style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>الإشارة الحالية</div>
                <div className="gesture-current gradient-text">{currentGesture.arabic}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{currentGesture.gesture} • ثقة: {Math.round(currentGesture.confidence * 100)}%</div>
                {wordBuffer && <div className="gesture-buffer">📝 {wordBuffer}</div>}
              </div>
            )}

            {/* Call Controls */}
            <div className="call-controls">
              <button className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleMute} title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button className={`btn btn-icon ${isCamOff ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleCam} title={isCamOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}>
                {isCamOff ? '📷' : '📹'}
              </button>
              <button className={`btn btn-icon ${isMicListening ? 'btn-danger' : 'btn-ghost'}`} onClick={isMicListening ? stopSpeechRecognition : startSpeechRecognition} title="تحويل الصوت لنص">
                {isMicListening ? '🔴' : '🎤'}
              </button>
              <button className="btn btn-primary" onClick={nextPartner}>⏭️ التالي</button>
              <button className="btn btn-danger" onClick={endCall}>📵 إنهاء</button>
            </div>
          </div>

          {/* Sidebar - Messages */}
          <div className="call-sidebar">
            <div className="glass-strong transcript-panel" style={{ flex: 1 }}>
              <h3>💬 المحادثة</h3>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: '0.85rem' }}>
                  {isDeaf ? 'أشِر بيدك وسيتم ترجمة إشاراتك تلقائياً' : 'تحدث بالميكروفون أو اكتب رسالة'}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.sender}`}>
                  <div className="sender">
                    {m.sender === 'local' ? '👤 أنت' : `👥 ${partnerName}`}
                    {m.type === 'sign' && ' 🤟'}{m.type === 'speech' && ' 🎤'}
                  </div>
                  <div>{m.text}</div>
                  <div className="time">{formatTime(m.timestamp)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick text input */}
            <div className="glass-strong" style={{ padding: 16 }}>
              <form onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.querySelector('input') as HTMLInputElement
                if (!input.value.trim()) return
                addMessage(input.value, 'local', 'text')
                socketRef.current?.emit('transcription:send', {
                  roomId: roomIdRef.current, text: input.value, language: 'ar', type: 'text',
                })
                input.value = ''
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="اكتب رسالة..." style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary btn-sm">📤</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
