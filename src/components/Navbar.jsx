import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()
  
  // Reading mode is active for Home AND WordChallenge pages
  const isReadingActive = location.pathname === '/' || location.pathname.startsWith('/challenge')
  // Writing mode is active for Scramble pages
  const isWritingActive = location.pathname.startsWith('/scramble')
  // My Vocabulary mode is active
  const isMyVocaActive = location.pathname === '/my-voca'

  return (
    <nav className="floating-navbar">
      <div className="segmented-control">
        <Link 
          to="/" 
          className={`segment-item ${isReadingActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🎧</span> 듣기 / 읽기
        </Link>
        <Link 
          to="/scramble" 
          className={`segment-item ${isWritingActive ? 'active' : ''}`}
        >
          <span className="nav-icon">✍️</span> 쓰기 연습
        </Link>
        <Link 
          to="/my-voca" 
          className={`segment-item ${isMyVocaActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⭐</span> 단어장
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
