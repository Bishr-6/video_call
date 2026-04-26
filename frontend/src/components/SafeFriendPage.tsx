import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

interface ImageGeneration {
  id: string
  prompt: string
  imageUrl: string
  timestamp: Date
}

const SYSTEM_PROMPT = `أنت "صديقي الآمن" - مساعد نفسي ذكي للطلاب. 
أنت متخصص في تقديم دعم نفسي أولي وتعليمي للطلاب خلال فترات الامتحانات والضغوط الدراسية.

قواعد التفاعل:
1. تحدث باللغة العربية الفصيحة الواضحة
2. كن متعاطفاً وداعماً وإيجابياً
3. عندما يعبر الطالب عن توتر أو ضيق، قدم:
   - تمارين تنفس بسيطة
   - نصائح عملية للاسترخاء
   - كلمات تشجيعية
4. الامتثال للموضوعات التعليمية والنفسية فقط
5. إذا طلب الطالب موضوعاً مختلفاً، اعتذر بلطف وأعده للموضوع الأساسي
6. لا تعطِ تشخيصات طبية أو استشارات نفسية متقدمة
7. لا تخزن البيانات الشخصية أبداً
8. إذا اكتشفت علامات استغاثة حقيقية، أخبر الطالب بضرورة التواصل مع المرشد الطلابي

الكلمات التحذيرية: (احزن، مكتئب، أؤذي نفسي، ميؤوس، تفكير انتحاري، لا أستطيع التحمل)

كن دائماً محترفاً وآمناً وتعليمياً.`;

const DISTRESS_KEYWORDS = ['احزن', 'مكتئب', 'أؤذي', 'ميؤوس', 'انتحاري', 'تحمل', 'أموت', 'أنهي', 'ألم', 'معاناة'];

export default function SafeFriendPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'مرحباً بك! أنا صديقك الآمن 🤝\n\nأنا هنا لمساعدتك خلال فترات الضغوط الدراسية والامتحانات. يمكنك التحدث معي بحرية عن أي توترات أو قلق تشعر به.\n\nكيف حالك اليوم؟ كيف يمكنني مساعدتك؟',
      timestamp: new Date()
    }
  ])

  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<ImageGeneration[]>([])
  const [imagePrompt, setImagePrompt] = useState('')
  const [showImageGen, setShowImageGen] = useState(false)
  const [imagesRemaining, setImagesRemaining] = useState(3)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showDistressWarning, setShowDistressWarning] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkForDistress = (text: string) => {
    return DISTRESS_KEYWORDS.some(keyword => text.includes(keyword))
  }

  const sendMessage = async () => {
    if (!userInput.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setUserInput('')
    setIsLoading(true)

    // Check for distress keywords
    if (checkForDistress(userInput)) {
      setShowDistressWarning(true)
      setTimeout(() => setShowDistressWarning(false), 5000)
    }

    try {
      const response = await fetch(`${getServerUrl()}/api/safefriend/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || 'عذراً، حدث خطأ. حاول مرة أخرى.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'bot',
        text: 'عذراً، حدث خطأ في الاتصال. يرجى محاولة مرة أخرى.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim() || imagesRemaining <= 0) return

    setIsLoading(true)

    try {
      const response = await fetch(`${getServerUrl()}/api/safefriend/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt })
      })

      const data = await response.json()

      if (data.imageUrl) {
        const newImage: ImageGeneration = {
          id: Date.now().toString(),
          prompt: imagePrompt,
          imageUrl: data.imageUrl,
          timestamp: new Date()
        }
        setGeneratedImages(prev => [...prev, newImage])
        setImagesRemaining(prev => prev - 1)
        setImagePrompt('')

        // Add bot message about image
        const botMessage: Message = {
          id: (Date.now() + 3).toString(),
          sender: 'bot',
          text: `تم إنشاء الصورة بنجاح! 🎨\n\nوصفك: "${imagePrompt}"\n\nبقي لك ${imagesRemaining - 1} صور يمكنك إنشاؤها اليوم.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
      }
    } catch (error) {
      console.error('Image generation error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 4).toString(),
        sender: 'bot',
        text: 'عذراً، حدث خطأ في إنشاء الصورة. حاول مرة أخرى.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div className="glass" style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
            💙 صديقي الآمن
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            مساعدك في فترات الضغوط الدراسية والامتحانات
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            <span>✓ آمن وخصوصي</span>
            <span>✓ بدون تشخيصات طبية</span>
            <span>✓ دعم تعليمي</span>
          </div>
        </div>

        {/* Distress Warning */}
        {showDistressWarning && (
          <div style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-red)'
          }}>
            ⚠️ <strong>تنبيه:</strong> إذا كنت تعاني من أفكار ضارة، يرجى التواصل فوراً مع المرشد الطلابي أو الدعم النفسي المتخصص.
          </div>
        )}

        {/* Chat Container */}
        <div className="glass-strong" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '500px',
          borderRadius: 'var(--radius-xl)'
        }}>
          
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '8px'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: msg.sender === 'user' ? 'var(--radius-lg) var(--radius-lg) 0 var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 0',
                    background: msg.sender === 'user' 
                      ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))'
                      : 'var(--bg-card)',
                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                    border: msg.sender === 'bot' ? '1px solid var(--border-glass)' : 'none',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                  animation: 'pulse 1.5s infinite'
                }} />
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                  animation: 'pulse 1.5s infinite 0.2s'
                }} />
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                  animation: 'pulse 1.5s infinite 0.4s'
                }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid var(--border-glass)'
          }}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  sendMessage()
                }
              }}
              placeholder="اكتب رسالتك هنا..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ar)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)'
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.2)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-glass)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !userInput.trim()}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              إرسال
            </button>
          </div>
        </div>

        {/* Image Generation Section */}
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>
              🎨 إنشاء صور تعليمية
            </h3>
            <button
              onClick={() => setShowImageGen(!showImageGen)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {showImageGen ? '↑ إغلاق' : '↓ فتح'}
            </button>
          </div>

          {showImageGen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                padding: '12px',
                background: 'rgba(6,182,212,0.1)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
              }}>
                📊 بقي لك <strong style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>{imagesRemaining}</strong> صور يمكنك إنشاؤها اليوم
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading && imagesRemaining > 0) {
                      generateImage()
                    }
                  }}
                  placeholder="صف الصورة التي تريدها (مثال: رسم توضيحي للمراحل)..."
                  disabled={isLoading || imagesRemaining <= 0}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ar)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.2)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-glass)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  onClick={generateImage}
                  disabled={isLoading || !imagePrompt.trim() || imagesRemaining <= 0}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  إنشاء
                </button>
              </div>

              {/* Generated Images Grid */}
              {generatedImages.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '12px',
                  marginTop: '12px'
                }}>
                  {generatedImages.map(img => (
                    <div key={img.id} style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.3s',
                      border: '1px solid var(--border-glass)'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                    }}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover'
                        }}
                        onClick={() => window.open(img.imageUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🛡️</div>
            <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>خصوصيتك محمية</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>لا نخزن بيانات شخصية</p>
          </div>
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📚</div>
            <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>دعم تعليمي</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>محادثات معيارية وآمنة</p>
          </div>
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🤝</div>
            <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>دعم متخصص</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>تواصل مع المرشد الطلابي</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
