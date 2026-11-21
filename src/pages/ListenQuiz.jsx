import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { speakWord } from '../utils/speech'
import { getImageUrl } from '../utils/image'
import { roundLabel } from '../utils/round'
import { recordResult } from '../utils/progress'

function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function makeQuestions(round) {
  const extraWords = allRounds
    .filter(other => other.grade === round.grade && other.id !== round.id)
    .flatMap(other => other.words)

  return shuffle(round.words).map(word => {
    const seenWords = new Set([word.en])
    const seenImages = new Set([word.img])
    const distractors = []
    // 회차 안의 보기를 먼저 사용하고, 부족한 수만 같은 grade에서 채운다.
    for (const candidate of [...shuffle(round.words), ...shuffle(extraWords)]) {
      if (seenWords.has(candidate.en) || seenImages.has(candidate.img)) continue
      distractors.push(candidate)
      seenWords.add(candidate.en)
      seenImages.add(candidate.img)
      if (distractors.length === 3) break
    }
    return { word, options: shuffle([word, ...distractors]) }
  })
}

function QuizSession({ round }) {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState(() => makeQuestions(round))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const answered = useRef(false)
  const nextButton = useRef(null)
  const question = questions[index]
  const selected = answers[index]
  const finished = index === questions.length
  const wrongAnswers = answers.filter(answer => !answer.correct)

  useEffect(() => {
    if (question) speakWord(question.word.en)
    return () => window.speechSynthesis?.cancel()
  }, [question])

  useEffect(() => {
    if (selected) nextButton.current?.focus()
  }, [selected])

  function choose(option) {
    if (answered.current) return
    answered.current = true
    const correct = option.en === question.word.en
    recordResult(question.word, correct, { roundId: round.id, source: 'listen' })
    setAnswers(previous => [...previous, { word: question.word, choice: option.en, correct }])
  }

  function nextQuestion() {
    answered.current = false
    setIndex(previous => previous + 1)
  }

  function restart() {
    answered.current = false
    setQuestions(makeQuestions(round))
    setAnswers([])
    setIndex(0)
  }

  return (
    <main className="challenge-body listen-quiz">
      <div className="challenge-container">
        <h1>🎧 {roundLabel(round)} 듣기 퀴즈</h1>
        {finished ? (
          <section className="listen-result" aria-labelledby="listen-result-title">
            <h2 id="listen-result-title">끝까지 잘했어요! 🎉</h2>
            <p className="listen-score">{answers.length - wrongAnswers.length} / {questions.length}개 정답</p>
            {wrongAnswers.length > 0 ? (
              <>
                <h3>다시 연습할 단어</h3>
                <ul className="listen-wrong-words">
                  {wrongAnswers.map(({ word }, wordIndex) => (
                    <li key={`${word.en}-${wordIndex}`}><strong>{word.en}</strong> — {word.ko}</li>
                  ))}
                </ul>
              </>
            ) : <p>모두 맞혔어요! 정말 멋져요 ⭐</p>}
            <div className="action-row">
              <button className="action-btn" onClick={restart}>다시 하기</button>
            </div>
            <div className="util-row">
              <button className="util-btn" onClick={() => navigate('/')}>☰ 목록으로</button>
            </div>
          </section>
        ) : (
          <>
            <div className="challenge-index">문제 {index + 1} / {questions.length}</div>
            <progress className="listen-progress" value={index} max={questions.length} aria-label="퀴즈 진행" />
            <h2 className="listen-prompt">잘 듣고 알맞은 그림을 골라요!</h2>
            <div className="action-row listen-replay-row">
              <button className="action-btn" onClick={() => speakWord(question.word.en)}>🔊 다시 듣기</button>
            </div>
            <div className="listen-options" role="group" aria-label="그림 보기 4개" key={index}>
              {question.options.map((option, optionIndex) => {
                const isAnswer = Boolean(selected) && option.en === question.word.en
                const isWrong = Boolean(selected) && !selected.correct && option.en === selected.choice
                return (
                  <button
                    key={option.en}
                    className={`listen-option${isAnswer ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}`}
                    disabled={Boolean(selected)}
                    aria-label={`${optionIndex + 1}번 그림${isAnswer ? ', 정답' : isWrong ? ', 선택한 오답' : ''}`}
                    onClick={() => choose(option)}
                  >
                    <img src={getImageUrl(option.img)} alt={`${optionIndex + 1}번 그림`} />
                    <span className="listen-option-foot">
                      <span className="listen-option-number">{optionIndex + 1}</span>
                      <span className="listen-option-status">{isAnswer ? '✓ 정답' : isWrong ? '다시 연습해요' : ''}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="listen-feedback" aria-live="polite" aria-atomic="true">
              {selected && (
                <div className={`stt-feedback level-${selected.correct ? 3 : 1}`}>
                  <div>{selected.correct ? '정답이에요! 참 잘했어요 ⭐' : '괜찮아요! 정답 그림을 확인해요 😊'}</div>
                  <p><strong>{question.word.en}</strong> — {question.word.ko}</p>
                </div>
              )}
            </div>
            {selected && (
              <div className="action-row listen-next-row">
                <button ref={nextButton} className="action-btn" onClick={nextQuestion}>{index === questions.length - 1 ? '결과 보기' : '다음 문제 →'}</button>
              </div>
            )}
            <div className="util-row">
              <button className="util-btn" onClick={() => navigate('/')}>☰ 목록으로</button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function ListenQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const round = allRounds.find(item => String(item.id) === id)

  if (!round || round.words.length === 0) {
    return (
      <main className="challenge-body listen-quiz">
        <div className="challenge-container">
          <h1>퀴즈를 찾을 수 없어요</h1>
          <div className="util-row">
            <button className="util-btn" onClick={() => navigate('/')}>☰ 목록으로</button>
          </div>
        </div>
      </main>
    )
  }

  return <QuizSession key={round.id} round={round} />
}
