import React, { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import GradeNav from './GradeNav'

// 상단 메뉴 + 학년·학기 선택을 한 덩어리로 고정한다.
// 실제 높이를 재서 --header-h에 적어 두면, 본문은 그만큼 아래에서 시작한다
// (글자가 커지거나 줄이 바뀌어도 겹치지 않음).
const HIDDEN = [/^\/class\//, /^\/worksheet\//] // 전체 화면 수업 모드, 인쇄 학습지

function AppHeader() {
  const { pathname } = useLocation()
  const ref = useRef(null)
  const hidden = HIDDEN.some((re) => re.test(pathname))

  useLayoutEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!el) {
      root.style.setProperty('--header-h', '0px')
      return
    }
    const update = () => root.style.setProperty('--header-h', `${Math.ceil(el.getBoundingClientRect().bottom)}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [hidden, pathname])

  if (hidden) return null

  return (
    <header className="app-header" ref={ref}>
      <Navbar />
      <GradeNav />
    </header>
  )
}

export default AppHeader
