import { useState, useEffect } from 'react'
import { getAllGestures } from './SignLanguageClassifier'

interface LandingPageProps {
  onNavigate: (page: 'translator' | 'videocall' | 'videosign' | 'safefriend') => void
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [stats, setStats] = useState({ gestures: 0, letters: 0, words: 0 })

  useEffect(() => {
    const all = getAllGestures()
    const letters = all.filter(g => g.category === 'letter').length
    const words = all.filter(g => g.category === 'word' || g.category === 'phrase' || g.category === 'action').length
    // Animate counter
    let i = 0
    const interval = setInterval(() => {
      i++
      setStats({
        gestures: Math.min(i * 3, all.length),
        letters: Math.min(i * 2, letters),
        words: Math.min(i, words),
      })
      if (i * 3 >= all.length) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="page">
      {/* Hero */}
      <section className="hero">
        <div className="privacy-badge" style={{ marginBottom: 24 }}>
          🔒 معالجة محلية 100% • خصوصية تامة
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img src="/logo.png" alt="Ishara Logo" style={{ width: '150px', height: 'auto', marginBottom: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-glow)' }} />
        </div>
        <h1>
          <span className="gradient-text">إشارة</span>
          <br />
          منصة التواصل الذكية للصم
        </h1>
        <p>
          نحوّل لغة الإشارة إلى كلمات، والكلمات إلى إشارات — فوراً وبخصوصية تامة.
          <br />
          باستخدام الذكاء الاصطناعي الآمن لدمج الطلاب الصم والبكم في البيئة المدرسية.
        </p>
        <div className="hero-buttons">
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('translator')}>
            🤟 مترجم لغة الإشارة
          </button>
          <button className="btn btn-success btn-lg" onClick={() => onNavigate('videocall')}>
            📹 مكالمة فيديو ذكية
          </button>
          <button className="btn btn-lg" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }} onClick={() => onNavigate('safefriend')}>
            💙 صديقي الآمن
            <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '999px', marginRight: 6 }}>جديد</span>
          </button>
        </div>
      </section>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, padding: '0 24px 40px', flexWrap: 'wrap' }}>
        {[
          { num: stats.gestures, label: 'إشارة مدعومة', icon: '🤟' },
          { num: stats.letters, label: 'حرف عربي', icon: '🔤' },
          { num: stats.words, label: 'كلمة وعبارة', icon: '💬' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: '20px 40px', textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>{s.icon}</div>
            <div className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 900 }}>{s.num}+</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="section-title">
        <h2 className="gradient-text">كيف يعمل؟</h2>
        <p>ثلاث خطوات بسيطة لتواصل فوري</p>
      </div>
      <div className="steps">
        {[
          { num: '1', title: 'افتح الكاميرا', desc: 'استخدم كاميرا حاسوبك أو هاتفك - لا تحتاج تحميل أي شيء', icon: '📷' },
          { num: '2', title: 'أشِر بيدك', desc: 'الذكاء الاصطناعي يتعرف على إشارتك فوراً ويحولها لنص', icon: '🤟' },
          { num: '3', title: 'تواصل بحرية', desc: 'النص يظهر للطرف الآخر فوراً مع إمكانية القراءة بصوت عالٍ', icon: '💬' },
        ].map((s, i) => (
          <div key={i} className="step glass">
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{s.icon}</div>
            <div className="step-num">{s.num}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="section-title" style={{ marginTop: 40 }}>
        <h2 className="gradient-text">المميزات</h2>
        <p>تقنيات متقدمة لتجربة سلسة وآمنة</p>
      </div>
      <div className="features">
        {[
          { icon: '🧠', title: 'ذكاء اصطناعي محلي', desc: 'MediaPipe يعمل مباشرة في متصفحك - بدون إرسال بيانات لأي سيرفر خارجي' },
          { icon: '🔒', title: 'خصوصية تامة', desc: 'لا نحفظ فيديوهاتك أبداً. كل المعالجة تتم على جهازك فقط (Edge Computing)' },
          { icon: '⚡', title: 'ترجمة فورية', desc: 'تحويل الإشارات إلى نص في أقل من 100 مللي ثانية - تجربة سلسة بدون تأخير' },
          { icon: '📹', title: 'مكالمات فيديو P2P', desc: 'اتصال مباشر بين المستخدمين عبر WebRTC - مشفر ومحمي بالكامل' },
          { icon: '🎤', title: 'تحويل الصوت لنص', desc: 'يحول كلام المتحدث إلى نص يظهر فوراً للشخص الأصم - تواصل ثنائي الاتجاه' },
          { icon: '🌐', title: 'دعم عربي كامل', desc: 'واجهة عربية بالكامل مع دعم جميع حروف لغة الإشارة العربية' },
          { icon: '💙', title: 'صديقي الآمن (جديد)', desc: 'مساعد نفسي وداعم ذكي للطلاب في فترات الضغوط الدراسية - دعم فوري وخصوصية تامة' },
        ].map((f, i) => (
          <div key={i} className="feature-card glass">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Safe AI Section */}
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px' }}>
        <div className="glass-strong" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>
            <span className="gradient-text">ذكاء اصطناعي آمن وأخلاقي</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
            نلتزم بأعلى معايير الأمان والخصوصية. لا نجمع بيانات شخصية،
            لا نحفظ الفيديو، ولا نشارك أي معلومات مع جهات خارجية.
            كل شيء يعمل محلياً على جهازك.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['🔐 تشفير E2E', '🏠 معالجة محلية', '🚫 بدون تتبع', '🗑️ حذف تلقائي'].map((b, i) => (
              <span key={i} className="privacy-badge">{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '40px 24px 80px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>
          جاهز للتواصل؟
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          ابدأ الآن - مجاناً وبدون تسجيل
        </p>
        <div className="hero-buttons">
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('videocall')}>
            🚀 ابدأ مكالمة الآن
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>🔒 جميع البيانات تُعالج محلياً • مشروع كأس الذكاء الاصطناعي الآمن 2026</p>
        <p style={{ marginTop: 8 }}>صُنع بـ ❤️ لمستقبل أكثر شمولاً</p>
      </footer>
    </div>
  )
}
