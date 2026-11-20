// 학급 참여 정보와 채점 기록 전송
// - 학급에 참여한 경우에만 기록을 보낸다 (참여하지 않으면 모든 기록은 이 기기에만 남음)
// - 인터넷이 끊겨도 대기열에 모아 두었다가 다시 연결되면 보낸다

const MEMBER_KEY = 'class_membership_v1'
const QUEUE_KEY = 'class_event_queue_v1'
const MAX_QUEUE = 2000
export const CLASS_EVENT = 'class_membership_change'

const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export const getMembership = () => readJSON(MEMBER_KEY, null)

const post = async (path, body) => {
  const res = await fetch(`./api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `오류 ${res.status}`), { status: res.status })
  return data
}

export const api = post

export const joinClass = async ({ code, number, nickname }) => {
  const data = await post('join', { code, number: Number(number), nickname })
  localStorage.setItem(MEMBER_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(CLASS_EVENT))
  return data
}

export const leaveClass = () => {
  localStorage.removeItem(MEMBER_KEY)
  localStorage.removeItem(QUEUE_KEY)
  window.dispatchEvent(new Event(CLASS_EVENT))
}

const localDay = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let timer = null
let flushing = false

export const flushQueue = async () => {
  const member = getMembership()
  if (!member || flushing || !navigator.onLine) return
  const queue = readJSON(QUEUE_KEY, [])
  if (!queue.length) return
  flushing = true
  const batch = queue.slice(0, 200)
  try {
    await post('events', { token: member.token, events: batch })
    const rest = readJSON(QUEUE_KEY, []).slice(batch.length)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rest))
    if (rest.length) setTimeout(flushQueue, 500)
  } catch (err) {
    // 토큰이 없어졌으면(학급 삭제 등) 참여 정보를 지운다. 그 밖의 오류는 다음에 다시 시도
    if (err.status === 401) leaveClass()
  } finally {
    flushing = false
  }
}

export const queueClassEvent = (word, correct, meta = {}) => {
  if (!getMembership() || !word?.en || !meta.source) return
  const queue = readJSON(QUEUE_KEY, [])
  queue.push({
    en: word.en,
    correct: !!correct,
    roundId: Number.isInteger(meta.roundId) ? meta.roundId : null,
    source: meta.source,
    day: localDay(),
    ts: Date.now(),
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)))
  clearTimeout(timer)
  timer = setTimeout(flushQueue, 3000) // 몇 문제씩 모아서 보낸다
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue()
  })
  setTimeout(flushQueue, 2000) // 앱을 열 때 남은 기록 전송
}
