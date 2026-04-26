import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './components/LandingPage'
import TranslatorPage from './components/TranslatorPage'
import VideoCallPage from './components/VideoCallPage'
import VideoSignPage from './components/VideoSignPage'
import SafeFriendPage from './components/SafeFriendPage'
import AboutPage from './components/AboutPage'
import TermsPage from './components/TermsPage'
import PrivacyPage from './components/PrivacyPage'
import './App.css'

type Page = 'home' | 'translator' | 'videocall' | 'videosign' | 'safefriend' | 'about' | 'terms' | 'privacy'
type Theme = 'light' | 'dark'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [theme, setTheme] = useState<Theme>('light')

  // Apply theme to document
  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === 'light') {
      htmlElement.classList.remove('dark-theme')
      htmlElement.classList.add('light-theme')
    } else {
      htmlElement.classList.remove('light-theme')
      htmlElement.classList.add('dark-theme')
    }
  }, [theme])

  return (
    <div dir="rtl" className={theme === 'light' ? 'light-theme' : 'dark-theme'}>
      <Analytics />
      <div className="bg-animated" />

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => setCurrentPage('home')}>
            <img src="/logo.png" alt="Ishara Logo" style={{ height: '40px', width: 'auto', borderRadius: '8px' }} />
            <span className="gradient-text">إشارة</span>
          </div>
          <div className="nav-links">
            <button
              className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentPage('home')}
            >
              🏠 الرئيسية
            </button>
            <button
              className={`nav-link ${currentPage === 'translator' ? 'active' : ''}`}
              onClick={() => setCurrentPage('translator')}
            >
              🤟 المترجم
            </button>
            <button
              className={`nav-link ${currentPage === 'videocall' ? 'active' : ''}`}
              onClick={() => setCurrentPage('videocall')}
            >
              📹 مكالمة فيديو
            </button>
            <button
              className={`nav-link ${currentPage === 'safefriend' ? 'active' : ''}`}
              onClick={() => setCurrentPage('safefriend')}
            >
              💙 صديقي الآمن
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="nav-link"
              title={`تبديل للوضع ${theme === 'light' ? 'الداكن' : 'الفاتح'}`}
              style={{ padding: '8px 16px' }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <span className="status-dot online" title="متصل" />
          </div>
        </div>
      </nav>

      {/* Pages */}
      {currentPage === 'home' && (
        <LandingPage onNavigate={(p) => setCurrentPage(p as Page)} />
      )}
      {currentPage === 'translator' && <TranslatorPage />}
      {currentPage === 'videocall' && <VideoCallPage />}
      {currentPage === 'videosign' && <VideoSignPage />}
      {currentPage === 'safefriend' && <SafeFriendPage />}
      {currentPage === 'about' && <AboutPage />}
      {currentPage === 'terms' && <TermsPage />}
      {currentPage === 'privacy' && <PrivacyPage />}

      {/* Footer */}
      <footer style={{
        padding: '60px 24px',
        marginTop: '80px',
        background: 'linear-gradient(to top, var(--bg-primary), transparent)',
        borderTop: '1px solid var(--border-glass)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            <div>
              <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>الروابط</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => setCurrentPage('home')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-ar)',
                      transition: 'color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--accent-cyan)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    }}
                  >
                    الرئيسية
                  </button>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => setCurrentPage('about')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-ar)',
                      transition: 'color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--accent-cyan)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    }}
                  >
                    من نحن
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>سياسات</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => setCurrentPage('terms')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-ar)',
                      transition: 'color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--accent-cyan)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    }}
                  >
                    الشروط والأحكام
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage('privacy')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-ar)',
                      transition: 'color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--accent-cyan)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    }}
                  >
                    سياسة الخصوصية
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontWeight: '800' }}>روابط سريعة</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '12px' }}>
                  <button onClick={() => setCurrentPage('about')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ar)' }}>معلومات عنا</button>
                </li>
                <li>
                  <button onClick={() => setCurrentPage('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ar)' }}>الشروط والأحكام</button>
                </li>
              </ul>
            </div>
          </div>

          {/* Credits */}
          <div style={{
            padding: '40px 24px',
            marginTop: '40px',
            borderTop: '1px solid var(--border-glass)'
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
              <strong>فريق تطوير إشارة</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', fontSize: '1rem', color: 'var(--text-muted)' }}>
              <span>بشر جرار</span>
              <span>رضوان منذر</span>
              <span style={{ color: 'var(--accent-orange)', fontWeight: '700' }}>بإشراف: أ. صهيب سيد</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '24px', opacity: 0.8 }}>
              © 2026 جميع الحقوق محفوظة • منصة إماراتية ذكية للشمول الرقمي 🇦🇪
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
