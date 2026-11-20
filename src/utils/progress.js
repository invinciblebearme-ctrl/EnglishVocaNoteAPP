// 학습 기록 · 간격 반복(라이트너 상자) — 모든 학습 화면이 공유하는 API
//
// 사용법 (각 학습 화면에서 채점 직후 호출):
//   import { recordResult } from '../utils/progress'
//   recordResult(word, true)   // 맞힘   (word = all_rounds.json의 { en, ko, img })
//   recordResult(word, false)  // 틀림
//
// 상자(box) 0~5: 맞히면 한 칸 올라가고, 틀리면 1로 내려가 오늘 다시 복습한다.
// 상자별 다음 복습까지 간격(일): 0 → 0, 1 → 1, 2 → 3, 3 → 7, 4 → 14, 5 → 30

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

const save = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

// 채점 결과 기록
export const recordResult = (word, correct) => {
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
