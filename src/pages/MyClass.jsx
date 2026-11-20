import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CLASS_EVENT, getMembership, joinClass, leaveClass } from '../utils/classSync'

// 학생용: 우리 반 참여하기
function MyClass() {
  const navigate = useNavigate()
  const [member, setMember] = useState(getMembership)
  const [form, setForm] = useState({ code: '', number: '', nickname: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const update = () => setMember(getMembership())
    window.addEventListener(CLASS_EVENT, update)
    return () => window.removeEventListener(CLASS_EVENT, update)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await joinClass(form)
    } catch (err) {
      setError(err.message || '참여하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    if (window.confirm('이 기기에서 학급 참여를 그만할까요? 지금까지 보낸 기록은 선생님 현황판에 남아요.')) leaveClass()
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="challenge-body">
      <div className="challenge-container class-page">
        <h1>🏫 우리 반</h1>

        {member ? (
          <>
            <div className="class-card">
              <div className="class-card-name">{member.className}</div>
              <div>{member.number}번 · {member.nickname}</div>
            </div>
            <p className="class-desc">
              퀴즈·쓰기 연습·복습·발음 평가 결과가 선생님 현황판으로 전송돼요.<br />
              선생님은 어떤 단어를 어려워하는지 보고 수업에 도움을 주실 거예요.
            </p>
            <div className="challenge-controls">
              <button className="nav-btn-premium" onClick={() => navigate('/')}>학습하러 가기</button>
              <button className="nav-btn-premium" onClick={leave}>참여 그만하기</button>
            </div>
          </>
        ) : (
          <form className="class-form" onSubmit={submit}>
            <p className="class-desc">선생님이 알려 주신 학급 코드를 입력하세요.</p>
            <label>
              학급 코드
              <input value={form.code} onChange={set('code')} placeholder="예: K7M2QX" maxLength={6}
                autoCapitalize="characters" autoComplete="off" required />
            </label>
            <label>
              번호
              <input value={form.number} onChange={set('number')} type="number" min={1} max={60}
                placeholder="출석번호" required />
            </label>
            <label>
              별명
              <input value={form.nickname} onChange={set('nickname')} maxLength={12}
                placeholder="예: 별빛토끼" autoComplete="off" required />
            </label>
            <p className="class-warn">⚠️ 별명에는 진짜 이름을 쓰지 마세요. 다른 기기에서 참여할 때도 같은 별명을 써요.</p>
            {error && <div className="class-error">{error}</div>}
            <button className="nav-btn-premium" type="submit" disabled={busy}>
              {busy ? '참여하는 중...' : '참여하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default MyClass
