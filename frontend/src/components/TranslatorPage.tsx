import { useState, useRef, useEffect, useCallback } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { classifyGesture, processGestureStream, resetBuffer, getAllGestures, type ClassificationResult } from './SignLanguageClassifier'
import SourcesPanel from './SourcesPanel'

export default function TranslatorPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animFrameRef = useRef<number>(0)

  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<ClassificationResult | null>(null)
  const [wordBuffer, setWordBuffer] = useState('')
  const [translatedTexts, setTranslatedTexts] = useState<string[]>([])
  const [showLibrary, setShowLibrary] = useState(false)

  const allGestures = getAllGestures()
  const letters = allGestures.filter(g => g.category === 'letter')
  const numbers = allGestures.filter(g => g.category === 'number')
  const words = allGestures.filter(g => g.category === 'word' || g.category === 'phrase')

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Load MediaPipe
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

      setIsActive(true)
      setIsLoading(false)
      resetBuffer()
      detectLoop()
    } catch (err) {
      console.error('Camera error:', err)
      setIsLoading(false)
      alert('لا يمكن الوصول للكاميرا. تأكد من السماح بالأذونات.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    setIsActive(false)
    cancelAnimationFrame(animFrameRef.current)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCurrentGesture(null)
    setWordBuffer('')
  }, [])

  const detectLoop = useCallback(() => {
    const detect = () => {
      if (!videoRef.current || !handLandmarkerRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now())

      // Draw on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

          results.landmarks.forEach(landmarks => {
            const w = canvasRef.current!.width
            const h = canvasRef.current!.height

            // Draw connections
            const connections = [
              [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
              [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
              [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
            ]
            ctx.strokeStyle = '#06b6d4'
            ctx.lineWidth = 3
            ctx.shadowColor = '#06b6d4'
            ctx.shadowBlur = 8
            connections.forEach(([a, b]) => {
              ctx.beginPath()
              ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h)
              ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h)
              ctx.stroke()
            })

            // Draw points
            ctx.shadowBlur = 12
            landmarks.forEach((lm, i) => {
              ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#f59e0b' : '#06b6d4'
              ctx.beginPath()
              ctx.arc(lm.x * w, lm.y * h, [4,8,12,16,20].includes(i) ? 7 : 5, 0, Math.PI * 2)
              ctx.fill()
            })
            ctx.shadowBlur = 0
          })
        }
      }

      // Classify
      if (results.landmarks.length > 0) {
        const stream = processGestureStream(results.landmarks[0] as any)
        setCurrentGesture(stream.currentGesture)
        setWordBuffer(stream.currentWord)
        if (stream.confirmedWord) {
          setTranslatedTexts(prev => [...prev, stream.confirmedWord!])
          // Speak the word
          if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(stream.confirmedWord)
            utter.lang = 'ar-SA'
            utter.rate = 0.9
            speechSynthesis.speak(utter)
          }
        }
      } else {
        setCurrentGesture(null)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }
    detect()
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      stopCamera()
    }
  }, [])

  const clearTexts = () => {
    setTranslatedTexts([])
    resetBuffer()
    setWordBuffer('')
  }

  const speakAll = () => {
    if ('speechSynthesis' in window && translatedTexts.length > 0) {
      const utter = new SpeechSynthesisUtterance(translatedTexts.join(' '))
      utter.lang = 'ar-SA'
      utter.rate = 0.8
      speechSynthesis.speak(utter)
    }
  }

  return (
    <div className="page">
      <div className="translator-container">
        <div className="text-center" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 8 }}>
            <span className="gradient-text">🤟 مترجم لغة الإشارة</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            وجّه يدك للكاميرا وسنترجم إشارتك فوراً
          </p>
        </div>

        {/* Video Area */}
        <div className="translator-video-area">
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }} />

          {!isActive && !isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,26,0.9)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 20 }}>📷</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>اضغط لتشغيل الكاميرا وبدء الترجمة</p>
              <button className="btn btn-primary btn-lg" onClick={startCamera}>🚀 ابدأ الترجمة</button>
            </div>
          )}

          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,26,0.9)' }}>
              <div className="matching-spinner" />
              <p>جاري تحميل نموذج الذكاء الاصطناعي...</p>
            </div>
          )}

          {/* Overlay with result */}
          {isActive && (
            <div className="translator-overlay">
              <div className="translator-result">
                {currentGesture ? currentGesture.arabic : '...'}
              </div>
              {currentGesture && (
                <>
                  <div className="translator-subtitle">
                    {currentGesture.gesture} • {currentGesture.category === 'letter' ? 'حرف' : currentGesture.category === 'number' ? 'رقم' : 'كلمة'}
                  </div>
                  <div className="gesture-confidence">
                    <div className="gesture-confidence-fill" style={{ width: `${currentGesture.confidence * 100}%` }} />
                  </div>
                </>
              )}
              {wordBuffer && (
                <div className="gesture-buffer">📝 {wordBuffer}</div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="call-controls">
          {isActive ? (
            <button className="btn btn-danger" onClick={stopCamera}>⏹️ إيقاف</button>
          ) : (
            <button className="btn btn-primary" onClick={startCamera} disabled={isLoading}>🚀 تشغيل الكاميرا</button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowLibrary(!showLibrary)}>
            📚 {showLibrary ? 'إخفاء' : 'عرض'} مكتبة الإشارات
          </button>
        </div>

        {/* Translated Output */}
        {translatedTexts.length > 0 && (
          <div className="glass-strong" style={{ padding: 24, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>📝 النص المترجم</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-ghost" onClick={speakAll}>🔊 نطق</button>
                <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(translatedTexts.join(' '))}>📋 نسخ</button>
                <button className="btn btn-sm btn-ghost" onClick={clearTexts}>🗑️ مسح</button>
              </div>
            </div>
            <div style={{ fontSize: '1.4rem', lineHeight: 2, color: 'var(--accent-cyan)', fontWeight: 700 }}>
              {translatedTexts.join(' ')}
            </div>
          </div>
        )}

        {/* Gesture Library */}
        {showLibrary && (
          <div className="glass-strong" style={{ marginTop: 20 }}>
            <div style={{ padding: '20px 20px 8px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>📚 مكتبة الإشارات المدعومة</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>جميع الإشارات التي يتعرف عليها النظام</p>
            </div>

            <div style={{ padding: '0 20px 8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: 8 }}>🔤 الحروف العربية ({letters.length})</h4>
            </div>
            <div className="gesture-library">
              {letters.map((g, i) => (
                <div key={i} className="gesture-item glass">
                  <span className="char">{g.arabic}</span>
                  <span className="label">{g.name}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 20px 8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: 8 }}>🔢 الأرقام ({numbers.length})</h4>
            </div>
            <div className="gesture-library">
              {numbers.map((g, i) => (
                <div key={i} className="gesture-item glass">
                  <span className="char">{g.arabic}</span>
                  <span className="label">{g.name}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 20px 8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: 8 }}>💬 كلمات وعبارات ({words.length})</h4>
            </div>
            <div className="gesture-library" style={{ paddingBottom: 20 }}>
              {words.map((g, i) => (
                <div key={i} className="gesture-item glass" style={{ minWidth: 100 }}>
                  <span className="char" style={{ fontSize: '1.1rem' }}>{g.arabic}</span>
                  <span className="label">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div className="privacy-badge">🔒 الكاميرا تعمل محلياً فقط • لا يتم إرسال أي فيديو</div>
        </div>

        <SourcesPanel />
      </div>
    </div>
  )
}
