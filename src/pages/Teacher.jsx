import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { api } from '../utils/classSync'

// 선생님용: 학급 만들기 · 학급 현황판
const SESSION_KEY = 'teacher_session'

const wordKo = (() => {
  const map = new Map()
  for (const r of allRounds) for (const w of r.words) if (!map.has(w.en)) map.set(w.en, w.ko)
  return (en) => map.get(en) || ''
})()
const roundById = new Map(allRounds.map((r) => [r.id, r]))

const localDay = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const ago = (ts) => {
  if (!ts) return '-'
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 60) return `${Math.max(min, 0)}분 전`
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`
  return `${Math.floor(min / 1440)}일 전`
}

function CreateClass({ onCreated }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { code } = await api('classes', { name, password })
      onCreated({ code, password })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="class-form" onSubmit={submit}>
      <label>
        학급 이름
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 4학년 2반" maxLength={30} required />
      </label>
      <label>
        교사 비밀번호 (6자 이상)
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      </label>
      <p className="class-warn">비밀번호는 다시 찾을 수 없어요. 잊어버리면 학급을 새로 만들어야 해요.</p>
      {error && <div className="class-error">{error}</div>}
      <button className="nav-btn-premium" type="submit" disabled={busy}>{busy ? '만드는 중...' : '학급 만들기'}</button>
    </form>
  )
}

function Login({ initial, onLogin, error, busy }) {
  const [code, setCode] = useState(initial?.code || '')
  const [password, setPassword] = useState('')
  return (
    <form className="class-form" onSubmit={(e) => { e.preventDefault(); onLogin({ code, password }) }}>
      <label>
        학급 코드
        <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} autoCapitalize="characters" required />
      </label>
      <label>
        교사 비밀번호
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div className="class-error">{error}</div>}
      <button className="nav-btn-premium" type="submit" disabled={busy}>{busy ? '불러오는 중...' : '현황판 보기'}</button>
    </form>
  )
}

function Bar({ value }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#fbbf24' : '#f87171'
  return (
    <span className="dash-bar">
      <span style={{ width: `${value}%`, background: color }} />
    </span>
  )
}

function Dashboard({ data, onRefresh, onLogout, onDelete, busy }) {
  const [openStudent, setOpenStudent] = useState(null)
  const active = data.students.filter((s) => s.total > 0)
  const weekTotal = data.students.reduce((sum, s) => sum + s.week, 0)
  const avg = active.length
    ? Math.round(active.reduce((sum, s) => sum + (s.accuracy || 0), 0) / active.length)
    : null
  const rounds = useMemo(
    () => [...data.rounds].sort((a, b) => a.accuracy - b.accuracy),
    [data.rounds]
  )

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2>{data.className}</h2>
          <div className="dash-code">학급 코드 <b>{data.code}</b> — 학생들에게 알려 주세요</div>
        </div>
        <div className="dash-actions">
          <button className="dark-button" onClick={onRefresh} disabled={busy}>{busy ? '불러오는 중' : '🔄 새로고침'}</button>
          <button className="dark-button" onClick={onLogout}>나가기</button>
        </div>
      </div>

      <div className="dash-summary">
        <div><b>{data.students.length}</b>명 참여</div>
        <div>이번 주 <b>{weekTotal}</b>문제</div>
        <div>평균 정답률 <b>{avg === null ? '-' : `${avg}%`}</b></div>
      </div>

      <section>
        <h3>학생별 학습 현황</h3>
        {data.students.length === 0 ? (
          <p className="dash-empty">아직 참여한 학생이 없어요. 학생들이 앱의 ‘🏫 우리 반’에서 학급 코드를 입력하면 여기에 나타나요.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr><th>번호</th><th>별명</th><th>이번 주</th><th>연속</th><th>정답률</th><th>마지막 학습</th></tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <React.Fragment key={s.number}>
                  <tr className="dash-row" onClick={() => setOpenStudent(openStudent === s.number ? null : s.number)}>
                    <td>{s.number}</td>
                    <td>{s.nickname}</td>
                    <td>{s.week}문제</td>
                    <td>{s.streak ? `🔥 ${s.streak}일` : '-'}</td>
                    <td>{s.accuracy === null ? '-' : <><Bar value={s.accuracy} /> {s.accuracy}%</>}</td>
                    <td>{ago(s.lastTs)}</td>
                  </tr>
                  {openStudent === s.number && (
                    <tr className="dash-detail">
                      <td colSpan={6}>
                        {s.weakWords.length === 0
                          ? '틀린 단어가 없어요 👍'
                          : <>약한 단어: {s.weakWords.map((w) => (
                              <span key={w.en} className="review-chip">{w.en} <small>{wordKo(w.en)} · {w.wrong}회</small></span>
                            ))}</>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        <p className="dash-hint">줄을 누르면 그 학생이 자주 틀린 단어가 보여요.</p>
      </section>

      <div className="dash-cols">
        <section>
          <h3>자주 틀리는 단어</h3>
          {data.wrongWords.length === 0 ? <p className="dash-empty">아직 없어요.</p> : (
            <ol className="dash-wrong">
              {data.wrongWords.map((w) => (
                <li key={w.en}>
                  <b>{w.en}</b> <small>{wordKo(w.en)}</small>
                  <span className="dash-muted">{w.wrong}회 · {w.students}명</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h3>회차별 정답률 <small className="dash-muted">(낮은 순)</small></h3>
          {rounds.length === 0 ? <p className="dash-empty">아직 없어요.</p> : (
            <table className="dash-table">
              <tbody>
                {rounds.map((r) => {
                  const round = roundById.get(r.roundId)
                  return (
                    <tr key={r.roundId}>
                      <td>{round ? `${round.grade} · ${round.name}` : `${r.roundId}회`}</td>
                      <td><Bar value={r.accuracy} /> {r.accuracy}%</td>
                      <td className="dash-muted">{r.students}명 · {r.total}문제</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="dash-danger">
        <h3>학급 삭제</h3>
        <p className="dash-muted">학년이 끝나면 학급을 삭제해 주세요. 학생 별명과 모든 학습 기록이 서버에서 지워지고 되돌릴 수 없어요.</p>
        <button className="dark-button" onClick={onDelete}>🗑 학급과 모든 기록 삭제</button>
      </section>
    </div>
  )
}

function Teacher() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
  })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (cred = session) => {
    if (!cred) return
    setBusy(true)
    setError('')
    try {
      const result = await api('dashboard', { ...cred, today: localDay() })
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(cred)) // 탭을 닫으면 지워짐
      setSession(cred)
      setData(result)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setBusy(false)
    }
  }

  // 같은 탭에서 새로고침하면 다시 불러오기 (처음 한 번만)
  useEffect(() => {
    if (session) load(session)
  }, [])

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setData(null)
  }

  const remove = async () => {
    const typed = window.prompt(`정말 삭제하려면 학급 코드(${data.code})를 입력하세요.`)
    if (typed?.trim().toUpperCase() !== data.code) return
    try {
      await api('classes/delete', session)
      alert('학급과 모든 기록을 삭제했어요.')
      logout()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="container teacher-page">
      <h1 className="home-title">👩‍🏫 학급 현황판</h1>

      {data ? (
        <Dashboard data={data} busy={busy} onRefresh={() => load()} onLogout={logout} onDelete={remove} />
      ) : (
        <div className="challenge-container class-page">
          <div className="ws-types">
            <button className={`dark-button ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>현황판 보기</button>
            <button className={`dark-button ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>새 학급 만들기</button>
          </div>
          {tab === 'login' ? (
            <Login initial={session} onLogin={load} error={error} busy={busy} />
          ) : (
            <CreateClass onCreated={(cred) => { setTab('login'); load(cred) }} />
          )}
          <p className="class-desc">
            학생 기록은 학급 코드·번호·별명으로만 저장되고 실명은 저장하지 않아요.<br />
            학생은 앱의 ‘🏫 우리 반’에서 학급 코드를 입력해 참여해요.
          </p>
          <button className="dark-button" onClick={() => navigate('/')}>목록으로</button>
        </div>
      )}
    </div>
  )
}

export default Teacher
