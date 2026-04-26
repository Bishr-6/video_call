import { useState, useRef, useEffect } from 'react'

type Platform = 'youtube' | 'tiktok' | 'reels' | 'other'
type Stage = 'idle' | 'processing' | 'done' | 'error'

interface WordItem { index: number; word: string; duration_ms: number; delay_ms: number }
interface AvatarConfig { expression: string; speed: number; gesture_intensity: string; background_style: string }
interface SignResult {
  success: boolean
  job_id?: string
  data?: {
    transcript: string
    sign_gloss: string
    words_array: string[]
    word_sequence: WordItem[]
    sentiment: string
    emotion: string
    topics: string[]
    summary_arabic: string
    avatar_config: AvatarConfig
    total_words: number
    estimated_duration_ms: number
    created_at: string
  }
  error?: string
}

const PLATFORMS: { id: Platform; label: string; icon: string; placeholder: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/watch?v=...' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@user/video/...' },
  { id: 'reels', label: 'Instagram Reels', icon: '📸', placeholder: 'https://instagram.com/reel/...' },
  { id: 'other', label: 'رابط مباشر', icon: '🔗', placeholder: 'https://...' },
]

const EMOTION_MAP: Record<string, { emoji: string; color: string; label: string }> = {
  happy:    { emoji: '😊', color: '#f59e0b', label: 'سعيد' },
  excited:  { emoji: '🎉', color: '#8b5cf6', label: 'متحمس' },
  sad:      { emoji: '😢', color: '#3b82f6', label: 'حزين' },
  calm:     { emoji: '😌', color: '#10b981', label: 'هادئ' },
  angry:    { emoji: '😤', color: '#ef4444', label: 'غاضب' },
  surprised:{ emoji: '😲', color: '#06b6d4', label: 'مندهش' },
  neutral:  { emoji: '😐', color: '#94a3b8', label: 'محايد' },
}

const STAGES_INFO = [
  { id: 'extract',    label: 'استخراج الصوت',        icon: '🎵' },
  { id: 'transcribe', label: 'تحويل الصوت لنص',      icon: '🗣️' },
  { id: 'convert',    label: 'تحويل لإشارة',          icon: '🧠' },
  { id: 'generate',   label: 'توليد إعدادات الأفاتار', icon: '🤖' },
]

// Animated SVG Avatar
function SignAvatar({ emotion, currentWord, isPlaying, intensity }: {
  emotion: string; currentWord: string; isPlaying: boolean; intensity: string
}) {
  const em = EMOTION_MAP[emotion] || EMOTION_MAP.neutral
  const speed = isPlaying ? (intensity === 'high' ? 0.6 : intensity === 'low' ? 1.2 : 0.9) : 0
  const animStyle = (delay = 0) => ({
    animation: isPlaying ? `signArm ${speed}s ease-in-out ${delay}s infinite alternate` : 'none'
  })

  return (
    <div className="sign-avatar-wrapper">
      <div className="sign-avatar-glow" style={{ background: `radial-gradient(circle, ${em.color}33, transparent 70%)` }} />
      <svg viewBox="0 0 200 280" className="sign-avatar-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="100" cy="45" r="32" fill="url(#faceGrad)" stroke={em.color} strokeWidth="2.5" />
        {/* Eyes */}
        <ellipse cx="88" cy="40" rx="5" ry={isPlaying ? 5 : 3} fill="#06b6d4" />
        <ellipse cx="112" cy="40" rx="5" ry={isPlaying ? 5 : 3} fill="#06b6d4" />
        {/* Mouth based on emotion */}
        {emotion === 'happy' || emotion === 'excited'
          ? <path d="M 85 54 Q 100 66 115 54" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          : emotion === 'sad'
          ? <path d="M 85 60 Q 100 50 115 60" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          : <line x1="87" y1="56" x2="113" y2="56" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        }
        {/* Body */}
        <rect x="72" y="82" width="56" height="85" rx="12" fill="url(#bodyGrad)" opacity="0.9" />
        {/* Left arm */}
        <g style={animStyle(0)}>
          <line x1="72" y1="98" x2="28" y2="148" stroke="#06b6d4" strokeWidth="9" strokeLinecap="round" />
          <circle cx="28" cy="148" r="13" fill="#0e7490" stroke="#06b6d4" strokeWidth="2" />
          <text x="28" y="153" textAnchor="middle" fontSize="12">🤟</text>
        </g>
        {/* Right arm */}
        <g style={animStyle(0.3)}>
          <line x1="128" y1="98" x2="172" y2="148" stroke="#8b5cf6" strokeWidth="9" strokeLinecap="round" />
          <circle cx="172" cy="148" r="13" fill="#5b21b6" stroke="#8b5cf6" strokeWidth="2" />
          <text x="172" y="153" textAnchor="middle" fontSize="12">✋</text>
        </g>
        {/* Legs */}
        <line x1="90" y1="167" x2="78" y2="230" stroke="#4c1d95" strokeWidth="10" strokeLinecap="round" />
        <line x1="110" y1="167" x2="122" y2="230" stroke="#4c1d95" strokeWidth="10" strokeLinecap="round" />
        {/* Feet */}
        <ellipse cx="74" cy="235" rx="16" ry="8" fill="#312e81" />
        <ellipse cx="126" cy="235" rx="16" ry="8" fill="#312e81" />
      </svg>
      {/* Current word bubble */}
      {currentWord && (
        <div className="avatar-word-bubble" style={{ borderColor: em.color }}>
          {currentWord}
        </div>
      )}
      {/* Emotion badge */}
      <div className="avatar-emotion-badge" style={{ background: em.color + '22', borderColor: em.color + '55' }}>
        {em.emoji} {em.label}
      </div>
    </div>
  )
}

// Mock demo data for when n8n is not configured
const MOCK_RESULT: SignResult = {
  success: true,
  job_id: 'demo_job_001',
  data: {
    transcript: 'هذا مثال توضيحي لميزة تحويل الفيديو إلى لغة إشارة. يمكنك إضافة مفاتيح API الخاصة بك لتجربة الميزة الكاملة.',
    sign_gloss: 'مثال توضيحي تحويل فيديو لغة إشارة API مفاتيح إضافة تجربة',
    words_array: ['مثال', 'توضيحي', 'تحويل', 'فيديو', 'لغة', 'إشارة', 'ممتازة'],
    word_sequence: ['مثال', 'توضيحي', 'تحويل', 'فيديو', 'لغة', 'إشارة', 'ممتازة'].map((w, i) => ({
      index: i, word: w, duration_ms: 700, delay_ms: i * 700
    })),
    sentiment: 'positive',
    emotion: 'calm',
    topics: ['تعليم', 'لغة إشارة', 'تقنية'],
    summary_arabic: 'مثال توضيحي لتحويل الفيديو إلى لغة إشارة',
    avatar_config: { expression: 'calm', speed: 1.0, gesture_intensity: 'medium', background_style: 'neutral' },
    total_words: 7,
    estimated_duration_ms: 4900,
    created_at: new Date().toISOString()
  }
}

export default function VideoSignPage() {
  const [platform, setPlatform] = useState<Platform>('youtube')
  const [videoUrl, setVideoUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [stageIndex, setStageIndex] = useState(-1)
  const [result, setResult] = useState<SignResult | null>(null)
  const [error, setError] = useState('')
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Auto-detect platform from URL
  useEffect(() => {
    if (!videoUrl) return
    if (/youtube\.com|youtu\.be/i.test(videoUrl)) setPlatform('youtube')
    else if (/tiktok\.com/i.test(videoUrl)) setPlatform('tiktok')
    else if (/instagram\.com/i.test(videoUrl)) setPlatform('reels')
  }, [videoUrl])

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  useEffect(() => clearTimers, [])

  const processVideo = async () => {
    if (!videoUrl.trim()) return
    setStage('processing')
    setStageIndex(0)
    setResult(null)
    setError('')
    setCurrentWordIdx(-1)
    stopPlayback()

    try {
      // Animate stages
      for (let i = 0; i < STAGES_INFO.length; i++) {
        setStageIndex(i)
        await new Promise(r => setTimeout(r, 600))
      }

      const rawUrl = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:5000'
      const serverUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
      console.log('🔗 Server URL:', serverUrl)
      console.log('🎬 Sending video:', videoUrl.trim())
      
      const response = await fetch(`${serverUrl}/api/sign-translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl.trim(), platform, language: 'ar' }),
        signal: AbortSignal.timeout(300000) // 5 minutes (YouTube audio download may be slow)
      })

      console.log('📡 Response status:', response.status)
      const data: any = await response.json()
      console.log('📦 Full API Response:', JSON.stringify(data, null, 2))
      
      // Check for pipeline errors
      if (data.pipeline_error) {
        console.error('❌ Pipeline Error:', data.pipeline_error)
        console.error('❌ Failed Step:', data.pipeline_step)
      }
      if (data.pipeline_errors) {
        console.error('❌ Missing Keys:', data.pipeline_errors)
      }
      if (data.demo_mode) {
        console.warn('⚠️ DEMO MODE - Backend returned demo data, not real translation')
        console.warn('⚠️ This means the pipeline failed. Check pipeline_error above.')
      }
      
      if (!data.success) throw new Error(data.error || 'فشلت المعالجة')
      setResult(data)
      setStage('done')
      setIsDemoMode(!!data.demo_mode)
    } catch (err: any) {
      console.error('❌ Fetch error:', err.message)
      // Try demo mode as fallback
      setResult(MOCK_RESULT)
      setStage('done')
      setIsDemoMode(true)
    }
  }

  const startPlayback = () => {
    if (!result?.data || isPlaying) return
    clearTimers()
    setIsPlaying(true)
    const words = result.data.words_array || []
    words.forEach((_, i) => {
      const t = setTimeout(() => {
        setCurrentWordIdx(i)
        if (i === words.length - 1) {
          const end = setTimeout(() => { setIsPlaying(false); setCurrentWordIdx(-1) }, 800)
          timersRef.current.push(end)
        }
      }, i * 750)
      timersRef.current.push(t)
    })
  }

  const stopPlayback = () => { clearTimers(); setIsPlaying(false); setCurrentWordIdx(-1) }

  const currentWord = result?.data?.words_array?.[currentWordIdx] || ''
  const emotion = result?.data?.emotion || 'neutral'
  const sentiment = result?.data?.sentiment || 'neutral'

  return (
    <div className="page" dir="rtl">
      <div className="vsign-container">

        {/* Header */}
        <div className="text-center" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🎬</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 8 }}>
            <span className="gradient-text">تحويل الفيديو</span> إلى لغة إشارة
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            أدخل رابط فيديو من يوتيوب أو تيك توك أو ريلز وسيُترجم تلقائياً إلى لغة إشارة عربية
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="vsign-platforms">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`vsign-platform-tab ${platform === p.id ? 'active' : ''}`}
              onClick={() => setPlatform(p.id)}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* URL Input */}
        <div className="vsign-input-area glass">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: '1rem' }}
              placeholder={PLATFORMS.find(p => p.id === platform)?.placeholder || 'أدخل رابط الفيديو...'}
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && stage !== 'processing' && processVideo()}
              disabled={stage === 'processing'}
            />
            <button
              className="btn btn-primary"
              style={{ minWidth: 130, fontSize: '1rem' }}
              onClick={processVideo}
              disabled={!videoUrl.trim() || stage === 'processing'}
            >
              {stage === 'processing' ? '⏳ جاري...' : '🚀 ترجمة'}
            </button>
          </div>

          {/* URL validation */}
          {videoUrl && !/^https?:\/\//i.test(videoUrl) && (
            <div style={{ color: 'var(--accent-orange)', fontSize: '0.85rem', marginTop: 8 }}>
              ⚠️ الرابط يجب أن يبدأ بـ https://
            </div>
          )}
        </div>

        {/* Processing Stages */}
        {stage === 'processing' && (
          <div className="vsign-stages glass">
            <h3 style={{ textAlign: 'center', marginBottom: 20, fontWeight: 700 }}>⚙️ جاري المعالجة...</h3>
            <div className="vsign-stages-list">
              {STAGES_INFO.map((s, i) => (
                <div key={s.id} className={`vsign-stage-item ${i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'}`}>
                  <div className="vsign-stage-icon">
                    {i < stageIndex ? '✅' : i === stageIndex ? <div className="vsign-mini-spinner" /> : s.icon}
                  </div>
                  <span>{s.label}</span>
                  {i < STAGES_INFO.length - 1 && <div className={`vsign-stage-line ${i < stageIndex ? 'done' : ''}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && error && (
          <div className="vsign-error glass">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>❌</div>
            <p style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{error}</p>
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setStage('idle')}>
              🔄 المحاولة مجدداً
            </button>
          </div>
        )}

        {/* Results */}
        {stage === 'done' && result?.data && (
          <div className="vsign-results">

            {/* Demo banner */}
            {isDemoMode && (
              <div className="vsign-demo-banner">
                <span>🎮 وضع العرض التوضيحي</span>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  أضف مفاتيح API لـ n8n لتجربة الترجمة الحقيقية
                </span>
              </div>
            )}

            <div className="vsign-results-grid">

              {/* Avatar Panel */}
              <div className="vsign-avatar-panel glass-strong">
                <h3 style={{ textAlign: 'center', fontWeight: 700, marginBottom: 16, fontSize: '1.1rem' }}>
                  🤖 الأفاتار التفاعلي
                </h3>

                <SignAvatar
                  emotion={emotion}
                  currentWord={currentWord}
                  isPlaying={isPlaying}
                  intensity={result.data.avatar_config?.gesture_intensity || 'medium'}
                />

                {/* Playback Controls */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                  {isPlaying ? (
                    <button className="btn btn-danger btn-sm" onClick={stopPlayback}>⏹️ إيقاف</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={startPlayback}>▶️ تشغيل الإشارة</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => { stopPlayback(); setTimeout(startPlayback, 100) }}>
                    🔄 إعادة
                  </button>
                </div>

                {/* Word progress */}
                {result.data.total_words > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 6 }}>
                      الكلمة {currentWordIdx >= 0 ? currentWordIdx + 1 : 0} من {result.data.total_words}
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: 'var(--gradient-main)',
                        width: `${currentWordIdx >= 0 ? ((currentWordIdx + 1) / result.data.total_words) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Words sequence */}
                <div className="vsign-words-row">
                  {result.data.words_array.map((w, i) => (
                    <span key={i} className={`vsign-word-chip ${i === currentWordIdx ? 'active' : i < currentWordIdx ? 'done' : ''}`}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              {/* Info Panel */}
              <div className="vsign-info-panel">

                {/* Emotion & Sentiment */}
                <div className="glass-strong" style={{ padding: 20, marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>📊 تحليل المحتوى</h4>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="vsign-badge" style={{
                      background: (EMOTION_MAP[emotion]?.color || '#94a3b8') + '22',
                      borderColor: (EMOTION_MAP[emotion]?.color || '#94a3b8') + '55'
                    }}>
                      {EMOTION_MAP[emotion]?.emoji} المشاعر: {EMOTION_MAP[emotion]?.label}
                    </div>
                    <div className="vsign-badge" style={{
                      background: sentiment === 'positive' ? '#10b98122' : sentiment === 'negative' ? '#ef444422' : '#94a3b822',
                      borderColor: sentiment === 'positive' ? '#10b98155' : sentiment === 'negative' ? '#ef444455' : '#94a3b855'
                    }}>
                      {sentiment === 'positive' ? '👍' : sentiment === 'negative' ? '👎' : '🤝'}
                      {' '}نبرة: {sentiment === 'positive' ? 'إيجابية' : sentiment === 'negative' ? 'سلبية' : 'محايدة'}
                    </div>
                    {result.data.topics?.map((t, i) => (
                      <div key={i} className="vsign-badge" style={{ background: '#06b6d422', borderColor: '#06b6d455' }}>
                        🏷️ {t}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sign Gloss */}
                <div className="glass-strong" style={{ padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>🤟 Sign Language Gloss</h4>
                    <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(result.data!.sign_gloss)}>
                      📋 نسخ
                    </button>
                  </div>
                  <div style={{
                    fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)',
                    lineHeight: 2, letterSpacing: '0.05em', direction: 'rtl'
                  }}>
                    {result.data.sign_gloss}
                  </div>
                </div>

                {/* Summary */}
                {result.data.summary_arabic && (
                  <div className="glass-strong" style={{ padding: 20, marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.95rem' }}>📝 ملخص المحتوى</h4>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{result.data.summary_arabic}</p>
                  </div>
                )}

                {/* Original Transcript */}
                <div className="glass-strong" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>🗣️ النص الأصلي</h4>
                    <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(result.data!.transcript)}>
                      📋 نسخ
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
                    {result.data.transcript}
                  </p>
                </div>
              </div>
            </div>

            {/* New translation button */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => { setStage('idle'); setResult(null); setVideoUrl('') }}>
                ➕ ترجمة فيديو جديد
              </button>
            </div>


          </div>
        )}

        {/* Info cards when idle */}
        {stage === 'idle' && (
          <div className="vsign-info-cards">
            {[
              { icon: '🎵', title: 'استخراج الصوت', desc: 'يستخرج الصوت تلقائياً من الفيديو عبر RapidAPI' },
              { icon: '🗣️', title: 'تحويل Deepgram', desc: 'Deepgram Nova-2 يحوّل الصوت لنص بدقة 95%+ للعربية' },
              { icon: '🧠', title: 'معالجة GPT-4o-mini', desc: 'يحوّل النص إلى Sign Language Gloss مع تحليل المشاعر' },
              { icon: '🤖', title: 'أفاتار تفاعلي', desc: 'يعرض الإشارات كلمة بكلمة مع تعابير وجه مناسبة' },
            ].map((c, i) => (
              <div key={i} className="vsign-info-card glass">
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{c.icon}</div>
                <h4 style={{ fontWeight: 700, marginBottom: 6 }}>{c.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  )
}
