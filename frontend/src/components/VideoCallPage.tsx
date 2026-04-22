import { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { processGestureStream, resetBuffer, type ClassificationResult } from './SignLanguageClassifier'

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
  const [showPrivateOptions, setShowPrivateOptions] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
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

  const connectSocket = useCallback(() => {
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const socket = io(url)
    socket.on('connect', () => socket.emit('user:register', { isDeaf }))
    
    socket.on('queue:waiting', () => setStatus('searching'))
    
    socket.on('match:found', (data) => {
      setRoomId(data.roomId)
      joinRoom(data.roomId)
    })

    socket.on('room:created', (data) => {
      setRoomId(data.roomId)
      joinRoom(data.roomId)
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

    socket.on('transcription:received', (data) => setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]))

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

  const initHandDetection = async () => {
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm')
    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 })
    runDetection()
  }

  const runDetection = () => {
    const detect = () => {
      if (!localVideoRef.current || !handLandmarkerRef.current || localVideoRef.current.readyState < 2) { animFrameRef.current = requestAnimationFrame(detect); return }
      const results = handLandmarkerRef.current.detectForVideo(localVideoRef.current, performance.now())
      if (results.landmarks.length > 0) {
        const res = processGestureStream(results.landmarks[0] as any)
        setCurrentGesture(res.currentGesture)
        const now = Date.now()
        if (res.currentGesture) {
          lastActivityRef.current = now
          if (res.currentGesture.name !== lastGestureRef.current) { lastGestureRef.current = res.currentGesture.name; gestureStartTimeRef.current = now }
          else if (now - gestureStartTimeRef.current > 3000) {
            sentenceBufferRef.current += (res.currentGesture.name === 'Space' ? ' ' : res.currentGesture.arabic)
            setSentenceDisplay(sentenceBufferRef.current); lastGestureRef.current = null; showToast(`تمت إضافة: ${res.currentGesture.arabic}`, 'success')
          }
        }
      } else {
        if (sentenceBufferRef.current && Date.now() - lastActivityRef.current > 5000) finalizeSentence()
        setCurrentGesture(null); lastGestureRef.current = null
      }
      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  const finalizeSentence = () => {
    const text = sentenceBufferRef.current.trim()
    if (text) {
      setMessages(prev => [...prev, { senderId: socketRef.current!.id, senderName: 'أنت', text, type: 'sign', timestamp: Date.now() }])
      socketRef.current?.emit('transcription:send', { roomId, text, type: 'sign' })
    }
    sentenceBufferRef.current = ''; setSentenceDisplay(''); lastActivityRef.current = Date.now()
  }

  const startRandomChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection(); socketRef.current?.emit('queue:join')
    } catch { showToast('خطأ في الكاميرا', 'error') }
  }

  const startPrivateRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
      await initHandDetection(); socketRef.current?.emit('room:create')
    } catch { showToast('خطأ في الكاميرا', 'error') }
  }

  const joinRoom = (id: string) => { setRoomId(id); socketRef.current?.emit('room:join', { roomId: id }) }

  useEffect(() => {
    if (status === 'in-room' && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [status])

  useEffect(() => { connectSocket(); return () => { socketRef.current?.disconnect() } }, [])

  return (
    <div className="page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {status === 'idle' && (
        <div className="matching-screen">
          <h2 className="gradient-text mb-6">🤟 منصة إشارة للتواصل الذكي</h2>
          <div className="mode-selector mb-8">
             <div className={`mode-card glass ${isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(true)}>🤟 أصم / أبكم</div>
             <div className={`mode-card glass ${!isDeaf ? 'selected' : ''}`} onClick={() => setIsDeaf(false)}>🗣️ سامع / متحدث</div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button className="btn btn-primary btn-lg w-full" onClick={startRandomChat}>🔍 بدء محادثة عشوائية (١ ضد ١)</button>
            <div className="text-center opacity-50">أو</div>
            <button className="btn btn-ghost w-full" onClick={() => setShowPrivateOptions(!showPrivateOptions)}>🏢 خيارات الغرفة الخاصة</button>
            
            {showPrivateOptions && (
              <div className="glass p-4 flex flex-col gap-3 animate-fadeInUp">
                <button className="btn btn-primary btn-sm" onClick={startPrivateRoom}>➕ إنشاء غرفة جديدة</button>
                <div className="flex gap-2">
                  <input className="input input-sm" placeholder="رمز الغرفة..." onChange={(e) => setRoomId(e.target.value)} />
                  <button className="btn btn-ghost btn-sm" onClick={async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream
                    await initHandDetection(); joinRoom(roomId)
                  }}>انضمام</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'searching' && (
        <div className="matching-screen">
          <div className="matching-spinner" />
          <h2 className="mb-4">جاري البحث عن شريك محادثة...</h2>
          <button className="btn btn-danger" onClick={() => { socketRef.current?.emit('queue:leave'); setStatus('idle') }}>إلغاء</button>
        </div>
      )}

      {status === 'in-room' && (
        <div className="call-layout">
          <div className="video-grid-split" style={{ gridTemplateColumns: remoteUsers.size === 1 ? '1fr 1fr' : `repeat(${Math.min(remoteUsers.size + 1, 3)}, 1fr)` }}>
            <div className="video-wrapper-full">
              <video ref={localVideoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              {sentenceDisplay && <div className="video-label" style={{ top: 10, bottom: 'auto', background: 'rgba(6,182,212,0.9)' }}>{sentenceDisplay}</div>}
              <div className="video-label">👤 أنت</div>
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
              <h3>💬 المحادثة {roomId && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>- الرمز: {roomId}</span>}</h3>
              <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.senderId === socketRef.current?.id ? 'local' : 'remote'}`}>
                    <div className="sender">{m.senderName}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-strong p-4 flex flex-col gap-4">
               <div className="call-controls" style={{ padding: 0 }}>
                 <button className="btn btn-icon btn-ghost" onClick={() => setShowInstructions(!showInstructions)}>📖</button>
                 <button className={`btn btn-icon ${isSharingScreen ? 'btn-success' : 'btn-ghost'}`} onClick={() => {
                   if (!isSharingScreen) {
                     navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
                       screenStreamRef.current = stream; setIsSharingScreen(true);
                       const track = stream.getVideoTracks()[0];
                       peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track));
                       track.onended = () => {
                         setIsSharingScreen(false);
                         const localTrack = localStreamRef.current?.getVideoTracks()[0];
                         peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(localTrack || null));
                       }
                     })
                   } else { screenStreamRef.current?.getTracks().forEach(t => t.stop()); setIsSharingScreen(false) }
                 }}>🖥️</button>
                 <button className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`} onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = isMuted); setIsMuted(!isMuted) }}>{isMuted ? '🔇' : '🔊'}</button>
                 <button className="btn btn-danger" onClick={() => window.location.reload()}>📵 مغادرة</button>
               </div>
               <form className="flex gap-2" onSubmit={(e) => {
                 e.preventDefault(); const input = e.currentTarget.querySelector('input')!;
                 if (!input.value.trim()) return;
                 socketRef.current?.emit('transcription:send', { roomId, text: input.value, type: 'text' });
                 setMessages(prev => [...prev, { senderId: socketRef.current!.id, senderName: 'أنت', text: input.value, type: 'text', timestamp: Date.now() }]);
                 input.value = '';
               }}><input className="input" placeholder="اكتب رسالة..." style={{ flex: 1 }} /><button className="btn btn-primary">📤</button></form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
