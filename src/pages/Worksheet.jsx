import React, { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { roundLabel } from '../utils/round'
import { getImageUrl } from '../utils/image'
import { getPrimaryAnswer } from '../utils/answer'

// 회차별 인쇄용 학습지 (브라우저 인쇄 → 종이 또는 PDF로 저장)
const TYPES = {
  write: { label: '그림 보고 쓰기', desc: '그림과 뜻을 보고 영어 단어를 써 보세요.' },
  trace: { label: '따라 쓰기', desc: '회색 글자를 따라 쓰고, 빈칸에 한 번 더 써 보세요.' },
  match: { label: '그림-단어 짝짓기', desc: '그림과 알맞은 단어를 선으로 이어 보세요.' },
}

const shuffle = (items) => {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function Worksheet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const round = allRounds.find((r) => String(r.id) === id)
  // ?type=trace&answers=1 처럼 주소로 형식을 지정할 수 있다 (즐겨찾기용)
  const [params] = useSearchParams()
  const [type, setType] = useState(TYPES[params.get('type')] ? params.get('type') : 'write')
  const [showKo, setShowKo] = useState(params.get('ko') !== '0')
  const [withAnswers, setWithAnswers] = useState(params.get('answers') === '1')
  const [seed, setSeed] = useState(0)

  // 짝짓기: 오른쪽 단어 순서를 섞는다 (다시 섞기 가능)
  const matchOrder = useMemo(() => (round ? shuffle(round.words) : []), [round, seed])

  if (!round) {
    return (
      <div className="challenge-body">
        <div className="challenge-container">
          <h1>회차를 찾을 수 없어요</h1>
          <button className="nav-btn-premium" onClick={() => navigate('/')}>목록으로</button>
        </div>
      </div>
    )
  }

  const words = round.words

  const renderSheet = (answerKey) => (
    <section className={`ws-sheet ${answerKey ? 'ws-answer-key' : ''}`}>
      <header className="ws-header">
        <div>
          <div className="ws-grade">{round.grade} · {round.category}</div>
          <h1 className="ws-title">
            {roundLabel(round)} — {TYPES[type].label}
            {answerKey && <span className="ws-answer-tag">정답</span>}
          </h1>
          <p className="ws-desc">{TYPES[type].desc}</p>
        </div>
        <div className="ws-name">
          <span>____학년 ____반 ____번</span>
          <span>이름: ______________</span>
        </div>
      </header>

      {type === 'write' && (
        <ol className="ws-grid">
          {words.map((w) => (
            <li key={w.en} className="ws-item">
              <img src={getImageUrl(w.img)} alt="" />
              {showKo && <div className="ws-ko">{w.ko}</div>}
              <div className="ws-line">{answerKey ? getPrimaryAnswer(w.en) : ''}</div>
            </li>
          ))}
        </ol>
      )}

      {type === 'trace' && (
        <ol className={`ws-trace ${words.length > 10 ? 'dense' : ''}`}>
          {words.map((w) => {
            const answer = getPrimaryAnswer(w.en)
            return (
              <li key={w.en}>
                <img src={getImageUrl(w.img)} alt="" />
                <div className="ws-trace-body">
                  {showKo && <div className="ws-ko">{w.ko}</div>}
                  <div className="ws-trace-row">
                    <span className="ws-ghost">{answer}</span>
                    <span className="ws-ghost">{answer}</span>
                    <span className="ws-line">{answerKey ? answer : ''}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {type === 'match' && (
        <div className={`ws-match ${words.length > 10 ? 'dense' : ''}`}>
          <ol className="ws-match-col">
            {words.map((w) => (
              <li key={w.en}>
                <img src={getImageUrl(w.img)} alt="" />
                <span className="ws-dot">●</span>
              </li>
            ))}
          </ol>
          <ol className="ws-match-col right" type="A">
            {matchOrder.map((w) => (
              <li key={w.en}>
                <span className="ws-dot">●</span>
                <span className="ws-match-word">{getPrimaryAnswer(w.en)}</span>
                {answerKey && (
                  <span className="ws-answer-num">→ {words.indexOf(w) + 1}번</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )

  return (
    <div className="ws-page">
      <div className="ws-toolbar">
        <div className="ws-types">
          {Object.entries(TYPES).map(([key, t]) => (
            <button
              key={key}
              className={`dark-button ${type === key ? 'active' : ''}`}
              onClick={() => setType(key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label>
          <input type="checkbox" checked={showKo} onChange={(e) => setShowKo(e.target.checked)} disabled={type === 'match'} />
          뜻 보이기
        </label>
        <label>
          <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
          정답지도 인쇄
        </label>
        {type === 'match' && (
          <button className="dark-button" onClick={() => setSeed((s) => s + 1)}>🔀 단어 다시 섞기</button>
        )}
        <button className="dark-button ws-print" onClick={() => window.print()}>🖨 인쇄 / PDF 저장</button>
        <button className="dark-button" onClick={() => navigate(`/challenge/${id}`)}>돌아가기</button>
      </div>

      {renderSheet(false)}
      {withAnswers && renderSheet(true)}
    </div>
  )
}

export default Worksheet
