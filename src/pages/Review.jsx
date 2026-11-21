import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDueWords, getWrongWords, recordResult } from '../utils/progress'
import { isCorrectAnswer, getPrimaryAnswer } from '../utils/answer'
import { speakWord } from '../utils/speech'
import { getImageUrl } from '../utils/image'

const SESSION_SIZE = 10

// 오늘의 복습: 뜻과 그림을 보고 영어 단어를 떠올려 쓰기 (간격 반복)
function Review() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'due' | 'wrong' | null(시작 화면)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null) // null | 'correct' | 'wrong'
  const [score, setScore] = useState({ correct: 0, missed: [] })
  const inputRef = useRef(null)

  // 시작 화면에 보여줄 개수 (세션이 끝날 때마다 다시 계산)
  const dueWords = useMemo(() => getDueWords(SESSION_SIZE), [mode])
  const wrongWords = useMemo(() => getWrongWords(), [mode])

  const start = (m) => {
    const words = m === 'due' ? dueWords : wrongWords.slice(0, SESSION_SIZE)
    if (words.length === 0) return
    setQueue(words)
    setIndex(0)
    setScore({ correct: 0, missed: [] })
    setResult(null)
    setInput('')
    setMode(m)
  }

  const current = queue[index]
  const finished = mode && index >= queue.length

  useEffect(() => {
    if (current && !result) inputRef.current?.focus()
  }, [current, result])

  const grade = (gaveUp = false) => {
    if (!current || result) return
    const correct = !gaveUp && isCorrectAnswer(input, current.en)
    recordResult(current, correct, { source: 'review' })
    setResult(correct ? 'correct' : 'wrong')
    setScore((s) =>
      correct ? { ...s, correct: s.correct + 1 } : { ...s, missed: [...s.missed, current] }
    )
    speakWord(current.en)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setInput('')
    setResult(null)
  }

  // 시작 화면
  if (!mode) {
    return (
      <div className="challenge-body">
        <div className="challenge-container review-start">
          <h1>🔁 복습</h1>
          <p className="review-desc">
            뜻과 그림을 보고 영어 단어를 떠올려 써 보세요.<br />
            맞힌 단어는 1일 → 3일 → 7일 뒤에 다시 나오고, 틀린 단어는 오늘 다시 나와요.
          </p>
          {dueWords.length === 0 && wrongWords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌱</div>
              <div className="empty-state-title">아직 복습할 단어가 없어요</div>
              <p>쓰기 연습이나 듣기 퀴즈를 하면 여기에 단어가 모여요.</p>
              <div className="action-row">
                <button className="action-btn" onClick={() => navigate('/')}>📚 학습하러 가기</button>
              </div>
            </div>
          ) : (
            <div className="action-row">
              <button className="action-btn" disabled={dueWords.length === 0} onClick={() => start('due')}>
                오늘의 복습 ({dueWords.length}개)
              </button>
              <button className="action-btn secondary" disabled={wrongWords.length === 0} onClick={() => start('wrong')}>
                틀린 단어 다시 하기 ({wrongWords.length}개)
              </button>
            </div>
          )}
          {wrongWords.length > 0 && (
            <div className="review-wrong-list">
              <h3>아직 익히지 못한 단어</h3>
              <div>
                {wrongWords.map((w) => (
                  <span key={w.en} className="review-chip" onClick={() => speakWord(w.en)}>
                    {w.en} <small>{w.ko}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 결과 화면
  if (finished) {
    return (
      <div className="challenge-body">
        <div className="challenge-container review-start">
          <h1>복습 완료! 🎉</h1>
          <div className="review-score">
            {score.correct} / {queue.length} 맞힘
          </div>
          {score.missed.length > 0 && (
            <div className="review-wrong-list">
              <h3>다시 볼 단어 (오늘 다시 나와요)</h3>
              <div>
                {score.missed.map((w) => (
                  <span key={w.en} className="review-chip" onClick={() => speakWord(w.en)}>
                    {w.en} <small>{w.ko}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="util-row">
            <button className="util-btn" onClick={() => setMode(null)}>복습 처음으로</button>
            <button className="util-btn" onClick={() => navigate('/')}>☰ 목록으로</button>
          </div>
        </div>
      </div>
    )
  }

  // 문제 화면
  const imgUrl = getImageUrl(current.img)
  return (
    <div className="challenge-body">
      <div className="challenge-container">
        <h1>{mode === 'due' ? '오늘의 복습' : '틀린 단어 다시 하기'}</h1>
        <div className="challenge-index">
          {index + 1} / {queue.length}
        </div>

        <div className="challenge-card review-card">
          <div className="word-ko">{current.ko}</div>
          {result && (
            <div className={`review-answer ${result}`}>{getPrimaryAnswer(current.en)}</div>
          )}
        </div>

        {imgUrl && (
          <div className="challenge-image">
            <img src={imgUrl} alt="" className="word-image" />
          </div>
        )}

        {!result ? (
          <form
            className="review-form"
            onSubmit={(e) => {
              e.preventDefault()
              grade()
            }}
          >
            <input
              ref={inputRef}
              className="scramble-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="영어 단어를 써 보세요"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="action-row">
              <button type="submit" className="action-btn">정답 확인</button>
              <button type="button" className="action-btn secondary" onClick={() => grade(true)}>모르겠어요</button>
            </div>
          </form>
        ) : (
          <>
            <div className={`stt-feedback level-${result === 'correct' ? 3 : 1}`}>
              {result === 'correct' ? 'Excellent! ⭐⭐⭐' : '괜찮아요! 오늘 한 번 더 나와요.'}
            </div>
            <div className="action-row">
              <button className="action-btn secondary" onClick={() => speakWord(current.en)}>발음 듣기</button>
              <button className="action-btn" onClick={next} autoFocus>
                {index + 1 < queue.length ? '다음' : '결과 보기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Review
