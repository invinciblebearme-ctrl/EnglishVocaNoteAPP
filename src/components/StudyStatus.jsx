import React, { useEffect, useState } from 'react'
import allRounds from '../data/all_rounds.json'
import {
  DAILY_GOAL,
  PROGRESS_EVENT,
  getCompletedRoundCount,
  getStreak,
  getTodayCount,
} from '../utils/progress'

const read = () => ({
  streak: getStreak(),
  today: getTodayCount(),
  completed: getCompletedRoundCount(allRounds),
})

// 연속 학습일 · 오늘의 목표 · 완료한 회차 (경쟁 없이 개인 성취만 보여준다)
function StudyStatus() {
  const [stat, setStat] = useState(read)

  useEffect(() => {
    const update = () => setStat(read())
    window.addEventListener(PROGRESS_EVENT, update)
    return () => window.removeEventListener(PROGRESS_EVENT, update)
  }, [])

  const goalPct = Math.min(100, Math.round((stat.today / DAILY_GOAL) * 100))
  const goalDone = stat.today >= DAILY_GOAL

  return (
    <div className="study-status">
      <div className="study-chip" title="하루에 한 단어 이상 공부하면 이어져요">
        🔥 <b>{stat.streak}</b>일 연속
      </div>
      <div className={`study-chip study-goal ${goalDone ? 'done' : ''}`} title={`하루 목표 ${DAILY_GOAL}단어`}>
        {goalDone ? '🎉 오늘 목표 달성!' : '🎯 오늘'} <b>{stat.today}</b>/{DAILY_GOAL}
        <span className="study-goal-bar"><span style={{ width: `${goalPct}%` }} /></span>
      </div>
      <div className="study-chip" title="모든 단어를 익힌 회차">
        🏅 완료 <b>{stat.completed}</b>회
      </div>
    </div>
  )
}

export default StudyStatus
