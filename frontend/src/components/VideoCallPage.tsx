import { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { processGestureStream, resetBuffer, type ClassificationResult } from './SignLanguageClassifier'

type CallStatus = 'idle' | 'in-room'

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

export default function VideoCallPage() {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [isDeaf, setIsDeaf] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [roomId, setRoomId] = useState('')
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map())
  const [currentGesture, setCurrentGesture] = useState<ClassificationResult | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Smart sentence logic
  const lastGestureRef = useRef<string | null>(null)
  const gestureStartTimeRef = useRef<number>(0)
  const lastActivityTimeRef = useRef<number>(Date.now())
  const sentenceBufferRef = useRef<string>('')
  const [sentenceDisplay, setSentenceDisplay] = useState('')

  const socketRef = useRef<Socket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animFrameRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const connectSocket = useCallback(() => {
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const socket = io(url)

    socket.on('connect', () => {
      socket.emit('user:register', { displayName: `مستخدم-${socket.id.slice(-4)}`, isDeaf })
    })

    socket.on('room:created', (data) => {
      setRoomId(data.roomId)
      joinRoom(data.roomId)
    })

    socket.on('room:users', async (users: any[]) => {
      setStatus('in-room')
      for (const user of users) {
        const pc = createPeerConnection(user.id, true)
        peersRef.current.set(user.id, pc)
        setRemoteUsers(prev => new Map(prev).set(user.id, { ...user }))
      }
    })

    socket.on('user:joined', (user) => {
      setRemoteUsers(prev => new Map(prev).set(user.id, { ...user }))
      showToast(`${user.displayName} انضم للمكالمة`, 'info')
    })

    socket.on('webrtc:signal', async (data) => {
      const { from, signal } = data
      let pc = peersRef.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from, false)
        peersRef.current.set(from, pc)
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal.description))
      if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
      if (signal.description.type === 'offer') {
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socketRef.current?.emit('webrtc:signal', { to: from, signal: { description: pc.localDescription } })
      }
    })

    socket.on('transcription:received', (data) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }])
    })

    socket.on('user:left', (data) => {
      const pc = peersRef.current.get(data.id)
      pc?.close()
      peersRef.current.delete(data.id)
      setRemoteUsers(prev => {
        const next = new Map(prev)
        next.delete(data.id)
        return next
      })
    })

    socketRef.current = socket
  }, [isDeaf])

  const createPeerConnection = (targetId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:global.relay.metered.ca:443', username: '3c08dbba57057d6e4f42b5f9', credential: 'BxX0oE/MCI8Qh1cn' }]
    })

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtc:signal', { to: targetId, signal: { candidate: e.candidate } })
      }
    }

    pc.ontrack = (e) => {
      setRemoteUsers(prev => {
        const next = new Map(prev)
        const user = next.get(targetId)
        if (user) user.stream = e.streams[0]
        return next
      })
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
    }

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socketRef.current?.emit('webrtc:signal', { to: targetId, signal: { description: pc.localDescription } })
      }
    }

    return pc
  }

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection()
      socketRef.current?.emit('room:create')
    } catch (err) { showToast('يرجى السماح بالوصول للكاميرا', 'error') }
  }

  const joinRoom = (id: string) => {
    if (!id) return
    setRoomId(id)
    socketRef.current?.emit('room:join', { roomId: id })
  }

  const toggleScreenShare = async () => {
    if (!isSharingScreen) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = stream
        const videoTrack = stream.getVideoTracks()[0]
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(videoTrack)
        })
        videoTrack.onended = () => stopScreenShare()
        setIsSharingScreen(true)
      } catch (err) { console.error(err) }
    } else {
      stopScreenShare()
    }
  }

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(videoTrack)
      })
    }
    setIsSharingScreen(false)
  }

  const initHandDetection = async () => {
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm')
    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 2
    })
    runDetection()
  }

  const runDetection = () => {
    const detect = () => {
      if (!localVideoRef.current || !handLandmarkerRef.current || localVideoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect); return
      }
      const results = handLandmarkerRef.current.detectForVideo(localVideoRef.current, performance.now())
      if (results.landmarks.length > 0) {
        const res = processGestureStream(results.landmarks[0] as any)
        setCurrentGesture(res.currentGesture)
        handleGestureLogic(res.currentGesture)
      } else {
        setCurrentGesture(null); handleGestureLogic(null)
      }
      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  const handleGestureLogic = (gesture: ClassificationResult | null) => {
    const now = Date.now()
    if (!gesture) {
      if (sentenceBufferRef.current && now - lastActivityTimeRef.current > 5000) finalizeSentence()
      lastGestureRef.current = null; return
    }
    lastActivityTimeRef.current = now
    if (gesture.name !== lastGestureRef.current) {
      lastGestureRef.current = gesture.name; gestureStartTimeRef.current = now
    } else if (now - gestureStartTimeRef.current > 3000) {
      confirmGesture(gesture); lastGestureRef.current = null
    }
  }

  const confirmGesture = (g: ClassificationResult) => {
    sentenceBufferRef.current += (g.name === 'Space' ? ' ' : g.arabic)
    setSentenceDisplay(sentenceBufferRef.current)
    showToast(`تمت إضافة: ${g.arabic}`, 'success')
  }

  const finalizeSentence = () => {
    const text = sentenceBufferRef.current.trim()
    if (text) {
      const msg = { senderId: socketRef.current!.id, senderName: 'أنت', text, type: 'sign' as const }
      setMessages(prev => [...prev, { ...msg, timestamp: Date.now() }])
      socketRef.current?.emit('transcription:send', { roomId, text, type: 'sign' })
    }
    sentenceBufferRef.current = ''; setSentenceDisplay('')
  }

  useEffect(() => { connectSocket(); return () => { socketRef.current?.disconnect() } }, [])

  return (
    <div className="page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {status === 'idle' && (
        <div className="matching-screen">
          <h2 className="gradient-text">🏢 غرف المحادثة الجماعية</h2>
          <p>قم بإنشاء غرفة جديدة أو انضم عبر الرمز</p>
          <div className="mode-selector">
             <div className={`mode-card glass ${isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(true)}>🤟 أصم</div>
             <div className={`mode-card glass ${!isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(false)}>🗣️ سامع</div>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            <button className="btn btn-primary btn-lg" onClick={startCall}>➕ إنشاء غرفة جديدة</button>
            <div className="flex gap-2">
              <input className="input" placeholder="أدخل رمز الغرفة..." onChange={(e) => setRoomId(e.target.value)} />
              <button className="btn btn-ghost" onClick={async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
                await initHandDetection(); joinRoom(roomId)
              }}>انضمام</button>
            </div>
          </div>
        </div>
      )}

      {status === 'in-room' && (
        <div className="call-layout">
          <div className="video-grid-split" style={{ gridTemplateColumns: `repeat(${Math.min(remoteUsers.size + 1, 3)}, 1fr)` }}>
            <div className="video-wrapper-full">
              <video ref={localVideoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              <div className="video-label">👤 أنت {isSharingScreen && '(مشاركة شاشة)'}</div>
              {sentenceDisplay && <div className="video-label" style={{ top: 10, bottom: 'auto', background: 'var(--accent-cyan)' }}>{sentenceDisplay}</div>}
            </div>
            {Array.from(remoteUsers.values()).map(user => (
              <div key={user.id} className="video-wrapper-full">
                <video autoPlay playsInline ref={el => { if (el && user.stream) el.srcObject = user.stream }} />
                <div className="video-label">👥 {user.displayName}</div>
              </div>
            ))}
          </div>

          <div className="call-bottom-panel">
            <div className="glass-strong transcript-panel-bottom">
              <h3>💬 المحادثة (رمز الغرفة: <span style={{ color: 'var(--accent-cyan)' }}>{roomId}</span>)</h3>
              <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.senderId === socketRef.current?.id ? 'local' : 'remote'}`}>
                    <div className="sender">{m.senderName}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="glass-strong p-4 flex flex-col gap-4">
               <div className="call-controls" style={{ padding: 0 }}>
                 <button className="btn btn-icon btn-ghost" onClick={() => setShowInstructions(!showInstructions)}>📖</button>
                 <button className={`btn btn-icon ${isSharingScreen ? 'btn-success' : 'btn-ghost'}`} onClick={toggleScreenShare}>🖥️</button>
                 <button className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`} onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = isMuted); setIsMuted(!isMuted) }}>{isMuted ? '🔇' : '🔊'}</button>
                 <button className="btn btn-danger" onClick={() => window.location.reload()}>📵 مغادرة</button>
               </div>
               <form className="flex gap-2" onSubmit={(e) => {
                 e.preventDefault(); const input = e.currentTarget.querySelector('input')!;
                 if (!input.value.trim()) return;
                 socketRef.current?.emit('transcription:send', { roomId, text: input.value, type: 'text' });
                 setMessages(prev => [...prev, { senderId: socketRef.current!.id, senderName: 'أنت', text: input.value, type: 'text', timestamp: Date.now() }]);
                 input.value = '';
               }}>
                 <input className="input" placeholder="اكتب للجميع..." />
                 <button className="btn btn-primary">📤</button>
               </form>
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="glass-strong p-6" style={{ position: 'fixed', bottom: 100, right: 20, width: 350, zIndex: 100, maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 className="gradient-text mb-4">📖 كتيب التعليمات السريع</h3>
          <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>👍 **مسافة:** لعمل فاصل بين الكلمات.</div>
            <div>🤟 **أحبك:** حركة اليد الشهيرة.</div>
            <div>🕒 **3 ثوانٍ:** مدة بقاء يدك ثابتة لاعتماد الحرف.</div>
            <div>🕒 **5 ثوانٍ:** مدة التوقف لإرسال الجملة.</div>
            <hr style={{ opacity: 0.1 }} />
            <div style={{ color: 'var(--accent-cyan)' }}>* يمكنك مشاركة شاشتك بالضغط على أيقونة التلفاز 🖥️.</div>
            <div style={{ color: 'var(--accent-cyan)' }}>* انسخ رمز الغرفة وارسله لأصدقائك للانضمام.</div>
          </div>
        </div>
      )}
    </div>
  )
}
