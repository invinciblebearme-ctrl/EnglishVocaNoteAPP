// 학습 기록 · 간격 반복(라이트너 상자) — 모든 학습 화면이 공유하는 API
//
// 사용법 (각 학습 화면에서 채점 직후 호출):
//   import { recordResult } from '../utils/progress'
//   recordResult(word, true, { roundId, source })   // 맞힘 (word = all_rounds.json의 { en, ko, img })
//   recordResult(word, false, { roundId, source })  // 틀림
//   source: 'listen' | 'scramble' | 'review' | 'speak' — 학급에 참여한 경우 현황판으로 전송
//
// 상자(box) 0~5: 맞히면 한 칸 올라가고, 틀리면 1로 내려가 오늘 다시 복습한다.
// 상자별 다음 복습까지 간격(일): 0 → 0, 1 → 1, 2 → 3, 3 → 7, 4 → 14, 5 → 30

import { queueClassEvent } from './classSync'

const STORAGE_KEY = 'learning_progress_v1'
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]
export const MASTERED_BOX = 3 // 이 상자 이상이면 '익힌 단어'

const todayStr = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export const PROGRESS_EVENT = 'learning_progress_change'

const save = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(PROGRESS_EVENT)) // 복습 배지 등 즉시 갱신
}

// 채점 결과 기록
export const recordResult = (word, correct, meta = {}) => {
  if (!word?.en) return
  const data = load()
  const prev = data[word.en] || { box: 0, correct: 0, wrong: 0 }
  const box = correct ? Math.min(prev.box + 1, INTERVAL_DAYS.length - 1) : 1
  data[word.en] = {
    word: { en: word.en, ko: word.ko, img: word.img },
    box,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    due: todayStr(correct ? INTERVAL_DAYS[box] : 0),
    lastSeen: todayStr(),
  }
  save(data)
  logActivity()
  queueClassEvent(word, correct, meta)
}

// ── 학습 활동 (연속 학습일 · 하루 목표) ──────────────────────────
const ACTIVITY_KEY = 'learning_activity_v1'
export const DAILY_GOAL = 10

const loadActivity = () => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || {}
  } catch {
    return {}
  }
}

const logActivity = () => {
  const log = loadActivity()
  const today = todayStr()
  log[today] = (log[today] || 0) + 1
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log))
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

export const getTodayCount = () => loadActivity()[todayStr()] || 0

// 연속 학습일: 오늘(또는 아직 안 했다면 어제)부터 거꾸로 센다
export const getStreak = () => {
  const log = loadActivity()
  let offset = log[todayStr()] ? 0 : -1
  let streak = 0
  while (log[todayStr(offset)]) {
    streak++
    offset--
  }
  return streak
}

// 오늘 복습할 단어 (틀린 단어 → 낮은 상자 순)
export const getDueWords = (limit = 10) => {
  const today = todayStr()
  return Object.values(load())
    .filter((r) => r.due <= today)
    .sort((a, b) => b.wrong - a.wrong || a.box - b.box)
    .slice(0, limit)
    .map((r) => r.word)
}

export const getDueCount = () => {
  const today = todayStr()
  return Object.values(load()).filter((r) => r.due <= today).length
}

// 아직 익히지 못한 틀린 적 있는 단어
export const getWrongWords = () =>
  Object.values(load())
    .filter((r) => r.wrong > 0 && r.box < MASTERED_BOX)
    .sort((a, b) => b.wrong - a.wrong)
    .map((r) => r.word)

// 모든 단어를 익힌 회차 수
export const getCompletedRoundCount = (rounds) =>
  rounds.filter((r) => {
    const { total, mastered } = getRoundProgress(r)
    return total > 0 && mastered === total
  }).length

// 회차 진도: { total, tried, mastered }
export const getRoundProgress = (round) => {
  const data = load()
  const total = round.words.length
  let tried = 0
  let mastered = 0
  for (const w of round.words) {
    const r = data[w.en]
    if (!r) continue
    tried++
    if (r.box >= MASTERED_BOX) mastered++
  }
  return { total, tried, mastered }
}
