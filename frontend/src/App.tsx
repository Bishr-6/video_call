import { useState } from 'react'
import LandingPage from './components/LandingPage'
import TranslatorPage from './components/TranslatorPage'
import VideoCallPage from './components/VideoCallPage'
import './App.css'

type Page = 'home' | 'translator' | 'videocall'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  return (
    <div>
      <div className="bg-animated" />

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => setCurrentPage('home')}>
            <span>🤝</span>
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
            <span className="status-dot online" title="متصل" />
          </div>
        </div>
      </nav>

      {/* Pages */}
      {currentPage === 'home' && <LandingPage onNavigate={(p) => setCurrentPage(p)} />}
      {currentPage === 'translator' && <TranslatorPage />}
      {currentPage === 'videocall' && <VideoCallPage />}
    </div>
  )
}

export default App
