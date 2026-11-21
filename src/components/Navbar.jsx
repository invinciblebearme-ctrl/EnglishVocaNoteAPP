import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getDueCount, PROGRESS_EVENT } from '../utils/progress'

function Navbar() {
  const location = useLocation()
  
  // Reading mode is active for Home AND WordChallenge pages
  const isReadingActive = location.pathname === '/' || location.pathname.startsWith('/challenge')
  // Writing mode is active for Scramble pages
  const isWritingActive = location.pathname.startsWith('/scramble')
  // My Vocabulary mode is active
  const isMyVocaActive = location.pathname === '/my-voca'
  const isReviewActive = location.pathname === '/review'
  // 오늘 복습할 단어 수 (학습 기록이 바뀌거나 화면을 옮길 때 갱신)
  const [dueCount, setDueCount] = useState(getDueCount)
  useEffect(() => {
    const update = () => setDueCount(getDueCount())
    update()
    window.addEventListener(PROGRESS_EVENT, update)
    return () => window.removeEventListener(PROGRESS_EVENT, update)
  }, [location.pathname])

  return (
    <nav className="floating-navbar">
      <div className="segmented-control">
        <Link 
          to="/" 
          className={`segment-item ${isReadingActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🎧</span>
          <span className="nav-label">듣기 / 읽기</span>
        </Link>
        <Link 
          to="/scramble" 
          className={`segment-item ${isWritingActive ? 'active' : ''}`}
        >
          <span className="nav-icon">✍️</span>
          <span className="nav-label">쓰기 연습</span>
        </Link>
        <Link 
          to="/my-voca" 
          className={`segment-item ${isMyVocaActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⭐</span>
          <span className="nav-label">단어장</span>
        </Link>
        <Link
          to="/review"
          className={`segment-item ${isReviewActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🔁</span>
          <span className="nav-label">복습</span>
          {dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
