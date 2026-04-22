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
  const [isMicListening, setIsMicListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Smart sentence logic state
  const lastGestureRef = useRef<string | null>(null)
  const gestureStartTimeRef = useRef<number>(0)
  const lastActivityTimeRef = useRef<number>(Date.now())
  const sentenceBufferRef = useRef<string>('')
  const [sentenceDisplay, setSentenceDisplay] = useState('')

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

  const handleGestureLogic = (gesture: ClassificationResult | null) => {
    const now = Date.now()
    if (!gesture) {
      if (sentenceBufferRef.current && now - lastActivityTimeRef.current > 5000) {
        finalizeSentence()
      }
      lastGestureRef.current = null
      return
    }
    lastActivityTimeRef.current = now
    if (gesture.name !== lastGestureRef.current) {
      lastGestureRef.current = gesture.name
      gestureStartTimeRef.current = now
    } else {
      if (now - gestureStartTimeRef.current > 3000) {
        confirmGesture(gesture)
        lastGestureRef.current = null 
      }
    }
  }

  const confirmGesture = (gesture: ClassificationResult) => {
    if (gesture.name === 'Space') {
      sentenceBufferRef.current += ' '
    } else {
      sentenceBufferRef.current += gesture.arabic
    }
    setSentenceDisplay(sentenceBufferRef.current)
    showToast(`تمت إضافة: ${gesture.arabic}`, 'success')
  }

  const finalizeSentence = () => {
    const text = sentenceBufferRef.current.trim()
    if (text) {
      addMessage(text, 'local', 'sign')
      socketRef.current?.emit('transcription:send', { roomId: roomIdRef.current, text, language: 'ar', type: 'sign' })
      showToast('تم إرسال الجملة', 'success')
    }
    sentenceBufferRef.current = ''; setSentenceDisplay('')
  }

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const connectSocket = useCallback(() => {
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const socket = io(url, { reconnection: true, reconnectionDelay: 1000 })
    socket.on('connect', () => {
      socket.emit('user:register', { displayName: `مستخدم-${Date.now().toString().slice(-4)}`, isDeaf })
      setStatus('connecting')
    })
    socket.on('user:registered', (data) => { showToast(`تم التسجيل: ${data.displayName}`, 'success'); setStatus('idle') })
    socket.on('queue:waiting', () => { setStatus('searching'); showToast('جاري البحث عن شخص...', 'info') })
    socket.on('match:found', async (data) => {
      roomIdRef.current = data.roomId; setPartnerName(data.partnerName); setPartnerIsDeaf(data.partnerIsDeaf); setStatus('matched')
      showToast(`تم الاتصال مع ${data.partnerName}!`, 'success')
      const pc = createPeerConnection(socket); peerRef.current = pc
      await setupMedia(pc, data.isInitiator); setStatus('in-call')
    })
    socket.on('webrtc:offer', async ({ offer }) => {
      if (!peerRef.current) return
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerRef.current.createAnswer()
        await peerRef.current.setLocalDescription(answer)
        socketRef.current?.emit('webrtc:answer', { roomId: roomIdRef.current, answer })
      } catch (err) { console.error('Offer error:', err) }
    })
    socket.on('webrtc:answer', async ({ answer }) => { if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer)) })
    socket.on('webrtc:ice-candidate', async ({ candidate }) => { if (peerRef.current) await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {}) })
    socket.on('transcription:received', (data) => {
      addMessage(data.text, 'remote', data.type || 'text')
      if (!isDeaf && data.type === 'sign' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(data.text); u.lang = 'ar-SA'; u.rate = 0.9; speechSynthesis.speak(u)
      }
    })
    socket.on('partner:disconnected', () => { showToast('انقطع الاتصال مع الطرف الآخر', 'warning'); cleanupCall(); setStatus('idle') })
    socket.on('disconnect', () => { showToast('انقطع الاتصال بالسيرفر', 'error'); cleanupCall(); setStatus('idle') })
    socketRef.current = socket
  }, [isDeaf])

  const createPeerConnection = (socket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'turn:global.relay.metered.ca:443', username: '3c08dbba57057d6e4f42b5f9', credential: 'BxX0oE/MCI8Qh1cn' }],
    })
    pc.ontrack = (e) => { if (remoteVideoRef.current && e.streams[0]) { remoteVideoRef.current.srcObject = e.streams[0]; remoteVideoRef.current.play().catch(() => {}) } }
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('webrtc:ice-candidate', { roomId: roomIdRef.current, candidate: e.candidate }) }
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') showToast('تم الاتصال المرئي!', 'success') }
    return pc
  }

  const setupMedia = async (pc: RTCPeerConnection, isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play().catch(() => {}) }
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      if (isInitiator) {
        setTimeout(async () => {
          try {
            const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
            socketRef.current?.emit('webrtc:offer', { roomId: roomIdRef.current, offer })
          } catch (err) { console.error('Offer error:', err) }
        }, 1000)
      }
      await initHandDetection()
    } catch (err) { showToast('خطأ في الكاميرا أو الميكروفون', 'error') }
  }

  const initHandDetection = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm')
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 2,
      })
      resetBuffer(); runDetection()
    } catch (err) { console.error('MediaPipe error:', err) }
  }

  const runDetection = () => {
    const detect = () => {
      if (!localVideoRef.current || !handLandmarkerRef.current || localVideoRef.current.readyState < 2) { animFrameRef.current = requestAnimationFrame(detect); return }
      const results = handLandmarkerRef.current.detectForVideo(localVideoRef.current, performance.now())
      if (canvasRef.current && localVideoRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = localVideoRef.current.videoWidth; canvasRef.current.height = localVideoRef.current.videoHeight
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          results.landmarks.forEach(lms => {
            ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2
            const conns = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]]
            conns.forEach(([a,b]) => { ctx.beginPath(); ctx.moveTo(lms[a].x*canvasRef.current!.width,lms[a].y*canvasRef.current!.height); ctx.lineTo(lms[b].x*canvasRef.current!.width,lms[b].y*canvasRef.current!.height); ctx.stroke() })
            lms.forEach(l => { ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(l.x*canvasRef.current!.width,l.y*canvasRef.current!.height,3,0,Math.PI*2); ctx.fill() })
          })
        }
      }
      if (results.landmarks.length > 0) {
        const stream = processGestureStream(results.landmarks[0] as any)
        setCurrentGesture(stream.currentGesture); handleGestureLogic(stream.currentGesture)
      } else { setCurrentGesture(null); handleGestureLogic(null) }
      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  const addMessage = (text: string, sender: 'local' | 'remote', type: 'sign' | 'speech' | 'text') => { setMessages(prev => [...prev, { text, sender, type, timestamp: Date.now() }]) }

  const cleanupCall = () => {
    cancelAnimationFrame(animFrameRef.current); peerRef.current?.close(); peerRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null; if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    roomIdRef.current = ''; setMessages([]); setCurrentGesture(null); setSentenceDisplay(''); sentenceBufferRef.current = ''; resetBuffer(); stopSpeechRecognition()
  }

  const startSearch = () => { if (!socketRef.current?.connected) { connectSocket(); setTimeout(() => socketRef.current?.emit('queue:join'), 1000) } else { socketRef.current.emit('queue:join') }; setStatus('searching') }
  const stopSearch = () => { socketRef.current?.emit('queue:leave'); cleanupCall(); setStatus('idle') }
  const nextPartner = () => { socketRef.current?.emit('room:leave'); cleanupCall(); setStatus('searching'); setTimeout(() => socketRef.current?.emit('queue:join'), 500) }
  const endCall = () => { socketRef.current?.emit('room:leave'); cleanupCall(); setStatus('idle') }
  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = isMuted); setIsMuted(!isMuted) }
  const toggleCam = () => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = isCamOff); setIsCamOff(!isCamOff) }

  const startSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR(); rec.lang = 'ar-SA'; rec.continuous = true
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript
          addMessage(text, 'local', 'speech'); socketRef.current?.emit('transcription:send', { roomId: roomIdRef.current, text, language: 'ar', type: 'speech' })
        }
      }
    }
    rec.onerror = () => setIsMicListening(false); rec.onend = () => { if (isMicListening) rec.start() }
    rec.start(); recognitionRef.current = rec; setIsMicListening(true)
  }

  const stopSpeechRecognition = () => { recognitionRef.current?.stop(); recognitionRef.current = null; setIsMicListening(false) }

  useEffect(() => { connectSocket(); return () => { cleanupCall(); socketRef.current?.disconnect() } }, [])

  return (
    <div className="page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {status === 'idle' && (
        <div className="matching-screen">
          <h2 className="gradient-text">📹 مكالمة فيديو ذكية</h2>
          <p>اختر نوع المستخدم ثم اضغط "ابدأ" للبحث عن شخص</p>
          <div className="mode-selector">
            <div className={`mode-card glass ${isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(true)}>
              <div className="icon">🤟</div><div className="label">أصم / أبكم</div>
            </div>
            <div className={`mode-card glass ${!isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(false)}>
              <div className="icon">🗣️</div><div className="label">سامع / متحدث</div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={startSearch}>🚀 ابدأ البحث</button>
          <button className="btn btn-ghost mt-4" onClick={() => setShowInstructions(true)}>❓ تعليمات الاستخدام</button>
        </div>
      )}

      {status === 'searching' && (
        <div className="matching-screen">
          <div className="matching-spinner" />
          <h2>جاري البحث عن شخص...</h2>
          <button className="btn btn-danger" onClick={stopSearch}>⏹️ إيقاف</button>
        </div>
      )}

      {(status === 'matched' || status === 'in-call') && (
        <div className="call-layout">
          <div className="video-grid-split">
            <div className="video-wrapper-full">
              <video ref={localVideoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }} />
              <div className="video-label">👤 أنت (يسار)</div>
              {sentenceDisplay && (
                <div style={{ position: 'absolute', top: 20, left: 20, right: 20, textAlign: 'center' }}>
                  <div className="glass" style={{ display: 'inline-block', padding: '10px 20px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{sentenceDisplay}</div>
                </div>
              )}
            </div>
            <div className="video-wrapper-full">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-label">👥 {partnerName} (يمين)</div>
            </div>
          </div>

          <div className="call-bottom-panel">
            <div className="glass-strong transcript-panel-bottom">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>💬 المحادثة</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowInstructions(true)}>❓ مساعدة</button>
              </div>
              <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto', paddingRight: 10 }}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.sender}`}>
                    <div className="sender">{m.sender === 'local' ? 'أنت' : partnerName}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="glass-strong" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الإشارة الحالية:</div>
                <div style={{ fontSize: '2rem', fontWeight: 900 }} className="gradient-text">{currentGesture ? currentGesture.arabic : '...'}</div>
              </div>
              <div className="call-controls" style={{ padding: 0 }}>
                <button className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleMute}>{isMuted ? '🔇' : '🔊'}</button>
                <button className={`btn btn-icon ${isCamOff ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleCam}>{isCamOff ? '📷' : '📹'}</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={nextPartner}>⏭️ التالي</button>
                <button className="btn btn-danger" onClick={endCall}>📵 إنهاء</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault(); const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                if (!input.value.trim()) return; addMessage(input.value, 'local', 'text');
                socketRef.current?.emit('transcription:send', { roomId: roomIdRef.current, text: input.value, type: 'text' });
                input.value = '';
              }}>
                <div style={{ display: 'flex', gap: 8 }}><input className="input" placeholder="اكتب رسالة..." style={{ flex: 1 }} /><button type="submit" className="btn btn-primary btn-sm">📤</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-strong" style={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 className="gradient-text">📖 دليل استخدام لغة الإشارة الذكية</h2>
              <button className="btn btn-icon-sm btn-danger" onClick={() => setShowInstructions(false)}>✕</button>
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <section style={{ marginBottom: 24 }}>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}>⚙️ نظام التوقيت الذكي:</h4>
                <ul style={{ paddingRight: 20 }}>
                  <li>🕒 **اعتماد الحرف:** استمر على الإشارة لمدة **3 ثوانٍ** لتتم إضافتها للحملة.</li>
                  <li>🕒 **إرسال الجملة:** توقف عن الإشارة لمدة **5 ثوانٍ** ليتم إرسال الجملة كاملة تلقائياً.</li>
                  <li>⌨️ **المسافة:** ارفع إبهامك للأعلى **👍** لمدة 3 ثوانٍ لعمل مسافة بين الكلمات.</li>
                </ul>
              </section>
              <section style={{ marginBottom: 24 }}>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}>💡 نصائح لتواصل أفضل:</h4>
                <ul style={{ paddingRight: 20 }}><li>تأكد من وجود إضاءة جيدة.</li><li>حافظ على مسافة كافية من الكاميرا.</li></ul>
              </section>
              <section>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}>🤟 الحركات الأساسية:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem' }}>
                  <div className="glass" style={{ padding: 12 }}>👍 إبهام للأعلى = **مسافة**</div>
                  <div className="glass" style={{ padding: 12 }}>🤟 علامة الحب = **أحبك**</div>
                  <div className="glass" style={{ padding: 12 }}>🤚 كف مفتوح = **مرحبا / كتاب**</div>
                  <div className="glass" style={{ padding: 12 }}>✊ قبضة مغلقة = **أمي / مدرسة**</div>
                </div>
              </section>
            </div>
            <button className="btn btn-primary w-full mt-6" onClick={() => setShowInstructions(false)}>فهمت، ابدأ التواصل!</button>
          </div>
        </div>
      )}
    </div>
  )
}
