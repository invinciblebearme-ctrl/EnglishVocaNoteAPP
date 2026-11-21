// 학급 현황판 API (Cloudflare Pages Functions + D1)
//
// POST /api/classes          { name, password }              → { code }            학급 만들기
// POST /api/classes/delete   { code, password }              → { ok }              학급과 모든 기록 삭제
// POST /api/students/delete  { code, password, studentId }   → { ok }              학생과 모든 기록 삭제
// POST /api/join             { code, number, nickname }      → { token, className } 학생 참여
// POST /api/events           { token, events: [...] }        → { saved }           채점 기록 전송
// POST /api/dashboard        { code, password }              → 현황판 데이터

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
const fail = (status, error) => json({ error }, status)

// ── 암호 · 토큰 ─────────────────────────────────────────────
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)))
const sha256 = async (text) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)))

const hashPassword = async (password, saltHex) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256)
  return toHex(bits)
}

// 길이가 같은 문자열을 시간 차 없이 비교
const safeEqual = (a, b) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// 헷갈리는 글자(0/O, 1/I/L)를 뺀 6자리 학급 코드
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newClassCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}
const normCode = (code) => String(code || '').trim().toUpperCase()

const verifyTeacher = async (db, code, password) => {
  const cls = await db.prepare('SELECT * FROM voca_classes WHERE code = ?').bind(normCode(code)).first()
  if (!cls || typeof password !== 'string') return null
  const hash = await hashPassword(password, cls.salt)
  return safeEqual(hash, cls.teacher_hash) ? cls : null
}

// ── 입력 검사 ──────────────────────────────────────────────
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
const SOURCES = new Set(['listen', 'scramble', 'review', 'speak'])
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

// ── 핸들러 ────────────────────────────────────────────────
async function createClass(db, body) {
  const name = cleanText(body.name, 30)
  const password = String(body.password ?? '')
  if (!name) return fail(400, '학급 이름을 입력하세요.')
  if (password.length < 6) return fail(400, '비밀번호는 6자 이상이어야 해요.')
  const salt = randomHex(16)
  const teacherHash = await hashPassword(password, salt)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newClassCode()
    const res = await db
      .prepare('INSERT OR IGNORE INTO voca_classes (code, name, teacher_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(code, name, teacherHash, salt, Date.now())
      .run()
    if (res.meta.changes === 1) return json({ code, name })
  }
  return fail(500, '학급 코드를 만들지 못했어요. 다시 시도해 주세요.')
}

async function deleteClass(db, body) {
  const cls = await verifyTeacher(db, body.code, body.password)
  if (!cls) return fail(401, '학급 코드 또는 비밀번호가 맞지 않아요.')
  const ids = 'SELECT id FROM voca_students WHERE class_code = ?'
  await db.batch([
    db.prepare(`DELETE FROM voca_events WHERE student_id IN (${ids})`).bind(cls.code),
    db.prepare(`DELETE FROM voca_student_tokens WHERE student_id IN (${ids})`).bind(cls.code),
    db.prepare('DELETE FROM voca_students WHERE class_code = ?').bind(cls.code),
    db.prepare('DELETE FROM voca_classes WHERE code = ?').bind(cls.code),
  ])
  return json({ ok: true })
}

async function deleteStudent(db, body) {
  const cls = await verifyTeacher(db, body.code, body.password)
  if (!cls) return fail(401, '학급 코드 또는 비밀번호가 맞지 않아요.')
  const studentId = body.studentId
  if (!Number.isSafeInteger(studentId) || studentId < 1) return fail(400, '학생 정보가 올바르지 않아요.')
  const student = await db
    .prepare('SELECT id FROM voca_students WHERE id = ? AND class_code = ?')
    .bind(studentId, cls.code)
    .first()
  if (!student) return fail(404, '학생을 찾을 수 없어요.')
  const ids = 'SELECT id FROM voca_students WHERE id = ? AND class_code = ?'
  await db.batch([
    db.prepare(`DELETE FROM voca_events WHERE student_id IN (${ids})`).bind(studentId, cls.code),
    db.prepare(`DELETE FROM voca_student_tokens WHERE student_id IN (${ids})`).bind(studentId, cls.code),
    db.prepare('DELETE FROM voca_students WHERE id = ? AND class_code = ?').bind(studentId, cls.code),
  ])
  return json({ ok: true })
}

async function join(db, body) {
  const code = normCode(body.code)
  const number = Number(body.number)
  const nickname = cleanText(body.nickname, 12)
  if (!Number.isInteger(number) || number < 1 || number > 60) return fail(400, '번호는 1~60 사이로 입력하세요.')
  if (!nickname) return fail(400, '별명을 입력하세요.')
  const cls = await db.prepare('SELECT code, name FROM voca_classes WHERE code = ?').bind(code).first()
  if (!cls) return fail(404, '학급 코드를 찾을 수 없어요.')

  let student = await db
    .prepare('SELECT id, nickname FROM voca_students WHERE class_code = ? AND number = ?')
    .bind(code, number)
    .first()
  if (student && student.nickname !== nickname) {
    // 다른 기기에서 다시 참여할 때는 같은 별명을 써야 한다
    return fail(409, '이미 다른 별명으로 참여한 번호예요. 처음에 쓴 별명을 입력하거나 선생님께 말씀하세요.')
  }
  if (!student) {
    const res = await db
      .prepare('INSERT INTO voca_students (class_code, number, nickname, created_at) VALUES (?, ?, ?, ?)')
      .bind(code, number, nickname, Date.now())
      .run()
    student = { id: res.meta.last_row_id }
  }
  const token = randomHex(32)
  await db
    .prepare('INSERT INTO voca_student_tokens (token_hash, student_id, created_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), student.id, Date.now())
    .run()
  return json({ token, className: cls.name, code, number, nickname })
}

async function saveEvents(db, body) {
  if (typeof body.token !== 'string') return fail(401, '참여 정보가 없어요.')
  const row = await db
    .prepare('SELECT student_id FROM voca_student_tokens WHERE token_hash = ?')
    .bind(await sha256(body.token))
    .first()
  if (!row) return fail(401, '참여 정보가 만료됐어요. 다시 참여해 주세요.')

  const events = Array.isArray(body.events) ? body.events.slice(0, 200) : []
  const stmts = []
  for (const e of events) {
    const en = cleanText(e.en, 60)
    const source = SOURCES.has(e.source) ? e.source : null
    const day = DAY_RE.test(e.day) ? e.day : null
    const roundId = Number.isInteger(e.roundId) ? e.roundId : null
    const ts = Number.isFinite(e.ts) ? Math.floor(e.ts) : Date.now()
    if (!en || !source || !day) continue
    stmts.push(
      db
        .prepare('INSERT INTO voca_events (student_id, en, round_id, correct, source, day, ts) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(row.student_id, en, roundId, e.correct ? 1 : 0, source, day, ts)
    )
  }
  if (stmts.length) await db.batch(stmts)
  return json({ saved: stmts.length })
}

// 연속 학습일: 마지막 학습일이 오늘 또는 어제일 때만 이어진 것으로 센다
const streakOf = (days, today, yesterday) => {
  const set = new Set(days)
  let d = set.has(today) ? today : set.has(yesterday) ? yesterday : null
  let n = 0
  while (d && set.has(d)) {
    n++
    const t = new Date(`${d}T00:00:00Z`)
    t.setUTCDate(t.getUTCDate() - 1)
    d = t.toISOString().slice(0, 10)
  }
  return n
}

async function dashboard(db, body) {
  const cls = await verifyTeacher(db, body.code, body.password)
  if (!cls) return fail(401, '학급 코드 또는 비밀번호가 맞지 않아요.')
  const code = cls.code
  const today = DAY_RE.test(body.today) ? body.today : new Date().toISOString().slice(0, 10)
  const y = new Date(`${today}T00:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  const w = new Date(`${today}T00:00:00Z`)
  w.setUTCDate(w.getUTCDate() - 6)
  const weekStart = w.toISOString().slice(0, 10)

  const inClass = 'student_id IN (SELECT id FROM voca_students WHERE class_code = ?1)'
  const [students, perStudent, days, rounds, wrongWords, weak] = await db.batch([
    db.prepare('SELECT id, number, nickname FROM voca_students WHERE class_code = ?1 ORDER BY number').bind(code),
    db.prepare(
      `SELECT student_id, COUNT(*) AS total, SUM(correct) AS correct,
              SUM(CASE WHEN day >= ?2 THEN 1 ELSE 0 END) AS week,
              MAX(ts) AS last_ts
       FROM voca_events WHERE ${inClass} GROUP BY student_id`
    ).bind(code, weekStart),
    db.prepare(`SELECT DISTINCT student_id, day FROM voca_events WHERE ${inClass}`).bind(code),
    db.prepare(
      `SELECT round_id, COUNT(*) AS total, SUM(correct) AS correct, COUNT(DISTINCT student_id) AS students
       FROM voca_events WHERE ${inClass} AND round_id IS NOT NULL GROUP BY round_id ORDER BY round_id`
    ).bind(code),
    db.prepare(
      `SELECT en, COUNT(*) AS wrong, COUNT(DISTINCT student_id) AS students
       FROM voca_events WHERE ${inClass} AND correct = 0 GROUP BY en ORDER BY wrong DESC, students DESC LIMIT 15`
    ).bind(code),
    db.prepare(
      `SELECT student_id, en, COUNT(*) AS wrong FROM voca_events
       WHERE ${inClass} AND correct = 0 GROUP BY student_id, en ORDER BY student_id, wrong DESC`
    ).bind(code),
  ])

  const statBy = new Map(perStudent.results.map((r) => [r.student_id, r]))
  const daysBy = new Map()
  for (const r of days.results) {
    if (!daysBy.has(r.student_id)) daysBy.set(r.student_id, [])
    daysBy.get(r.student_id).push(r.day)
  }
  const weakBy = new Map()
  for (const r of weak.results) {
    if (!weakBy.has(r.student_id)) weakBy.set(r.student_id, [])
    const list = weakBy.get(r.student_id)
    if (list.length < 5) list.push({ en: r.en, wrong: r.wrong })
  }

  return json({
    className: cls.name,
    code,
    today,
    students: students.results.map((s) => {
      const st = statBy.get(s.id) || {}
      return {
        id: s.id,
        number: s.number,
        nickname: s.nickname,
        total: st.total || 0,
        accuracy: st.total ? Math.round((st.correct / st.total) * 100) : null,
        week: st.week || 0,
        streak: streakOf(daysBy.get(s.id) || [], today, yesterday),
        lastTs: st.last_ts || null,
        weakWords: weakBy.get(s.id) || [],
      }
    }),
    rounds: rounds.results.map((r) => ({
      roundId: r.round_id,
      total: r.total,
      accuracy: Math.round((r.correct / r.total) * 100),
      students: r.students,
    })),
    wrongWords: wrongWords.results,
  })
}

const ROUTES = {
  'classes': createClass,
  'classes/delete': deleteClass,
  'students/delete': deleteStudent,
  'join': join,
  'events': saveEvents,
  'dashboard': dashboard,
}

export async function onRequest({ request, env, params }) {
  const route = (params.path || []).join('/')
  const handler = ROUTES[route]
  if (!handler) return fail(404, '없는 주소예요.')
  if (request.method !== 'POST') return fail(405, 'POST만 지원해요.')
  if (!env.DB) return fail(503, '학급 기능이 아직 설정되지 않았어요.')
  let body
  try {
    body = await request.json()
  } catch {
    return fail(400, '요청 형식이 잘못됐어요.')
  }
  try {
    return await handler(env.DB, body || {})
  } catch (err) {
    console.error(err)
    return fail(500, '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.')
  }
}
