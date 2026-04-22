import { useState, useRef, useEffect } from 'react'
import io, { Socket } from 'socket.io-client'
import VideoCall from './components/VideoCall'
import MediaPipeHandler from './components/MediaPipeHandler'
import TranscriptionDisplay from './components/TranscriptionDisplay'
import ControlPanel from './components/ControlPanel'
import './App.css'

interface TranscriptionMessage {
  text: string
  timestamp: number
  sender: 'local' | 'remote'
  language: string
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [isCallActive, setIsCallActive] = useState(false)
  const [transcriptions, setTranscriptions] = useState<TranscriptionMessage[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [userId, setUserId] = useState<string>('')
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // ============================================
  // WebSocket Initialization
  // ============================================

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to server')
      setConnectionStatus('connected')
      
      // انضم كمستخدم جديد
      newSocket.emit('user:join', {
        displayName: `User-${Date.now().toString().slice(-4)}`,
      })
    })

    newSocket.on('user:joined', (data) => {
      console.log('✅ User joined:', data.userId)
      setUserId(data.userId)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      setConnectionStatus('disconnected')
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setConnectionStatus('disconnected')
    })

    // Transcription events
    newSocket.on('transcription:received', (data) => {
      addTranscription({
        text: data.text,
        timestamp: data.timestamp,
        sender: 'remote',
        language: data.language || 'ar',
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // ============================================
  // Helper Functions
  // ============================================

  const addTranscription = (message: TranscriptionMessage) => {
    setTranscriptions((prev) => [...prev, message])
  }

  const handleSendTranscription = (text: string, language: string = 'ar') => {
    if (!socket || !sessionId) return

    const message: TranscriptionMessage = {
      text,
      timestamp: Date.now(),
      sender: 'local',
      language,
    }

    addTranscription(message)

    socket.emit('transcription:send', {
      sessionId,
      text,
      timestamp: Date.now(),
      language,
    })

    console.log('📤 Sent transcription:', text)
  }

  const handleStartCall = () => {
    if (!socket) {
      alert('❌ Not connected to server. Please refresh.')
      return
    }

    socket.emit('session:create', {})
    
    socket.on('session:created', (data) => {
      setSessionId(data.sessionId)
      setIsCallActive(true)
      console.log('📞 Call started, session ID:', data.sessionId)
    })
  }

  const handleEndCall = () => {
    if (!socket || !sessionId) return

    socket.emit('session:end', { sessionId })
    setIsCallActive(false)
    setSessionId('')
    setTranscriptions([])
    console.log('📵 Call ended')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤝 منصة التواصل الذكية
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Smart Sign Language Communication Platform
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2">
            <VideoCall
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              isCallActive={isCallActive}
            />

            {/* MediaPipe Handler - يعمل في الخلفية */}
            <MediaPipeHandler
              videoRef={localVideoRef}
              onHandDetected={(landmarks) => {
                // سيتم استخدام هذا للترجمة لاحقاً
                console.log('✋ Hand detected:', landmarks?.length)
              }}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Control Panel */}
            <ControlPanel
              isCallActive={isCallActive}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              sessionId={sessionId}
              onSendTranscription={handleSendTranscription}
            />

            {/* Transcriptions Display */}
            <TranscriptionDisplay transcriptions={transcriptions} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 text-sm">
            🔒 جميع البيانات تُعالج محلياً • All data processed locally
            <br />
            🎓 مشروع 2026 • Safe AI Cup 2026
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
