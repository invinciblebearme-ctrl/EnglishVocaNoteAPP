import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()
  
  // Reading mode is active for Home AND WordChallenge pages
  const isReadingActive = location.pathname === '/' || location.pathname.startsWith('/challenge')
  // Writing mode is active for Scramble pages
  const isWritingActive = location.pathname.startsWith('/scramble')

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
      </div>
    </nav>
  )
}

export default Navbar
