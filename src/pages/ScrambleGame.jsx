import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { addToMyVoca, removeFromMyVoca, isFavorite } from '../utils/storage'
import { getPrimaryAnswer, isCorrectAnswer, shuffleLetters, normalize } from '../utils/answer'
import { speakWord } from '../utils/speech'
import { getImageUrl } from '../utils/image'
import { roundFullLabel } from '../utils/round'
import { swipeHandlers } from '../utils/swipe'
import { recordResult } from '../utils/progress'

function ScrambleGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [scrambled, setScrambled] = useState([])
  const [usedIndices, setUsedIndices] = useState([])
  const [hintStep, setHintStep] = useState(0)
  const [hasRecordedWrong, setHasRecordedWrong] = useState(false)
  const [hasRecordedCorrect, setHasRecordedCorrect] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [showImage, setShowImage] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [fav, setFav] = useState(false)
  const touchX = useRef(null)
  
  const roundData = useMemo(() => allRounds.find(r => r.id === parseInt(id)), [id])
  const currentWord = roundData?.words[index]
  const primaryAnswer = currentWord ? getPrimaryAnswer(currentWord.en) : ''
  const wordCount = primaryAnswer ? primaryAnswer.split(' ').length : 0

  useEffect(() => {
    if (currentWord) {
      setScrambled(shuffleLetters(getPrimaryAnswer(currentWord.en)))
      setUserInput('')
      setUsedIndices([])
      setHintStep(0)
      setHasRecordedWrong(false)
      setHasRecordedCorrect(false)
      setFeedback(null)
      setShowImage(false)
      setIsImageLoading(false)
      setFav(isFavorite(currentWord.en))
    }
  }, [index, currentWord])

  const toggleFavorite = () => {
    if (!currentWord) return;
    if (fav) {
      removeFromMyVoca(currentWord.en);
      setFav(false);
    } else {
      addToMyVoca(currentWord);
      setFav(true);
    }
  };

  if (!roundData) return <div>게임을 찾을 수 없습니다.</div>

  const handleCheck = () => {
    if (!normalize(userInput)) return // 빈 입력은 채점하지 않음
    if (isCorrectAnswer(userInput, currentWord.en)) {
      if (hintStep === 0) {
        setFeedback({ level: 3, message: 'Excellent! ⭐⭐⭐' })
      } else if (hintStep === 1) {
        setFeedback({ level: 2, message: 'Good! ⭐⭐' })
      } else {
        setFeedback({ level: 1, message: 'Nice! ⭐' })
      }

      if (!hasRecordedCorrect) {
        if (hintStep === 0) {
          recordResult(currentWord, true, { roundId: roundData.id, source: 'scramble' })
        } else if (!hasRecordedWrong) {
          recordResult(currentWord, false, { roundId: roundData.id, source: 'scramble' })
          setHasRecordedWrong(true)
        }
        setHasRecordedCorrect(true)
      }

      handleSpeak()
      setShowImage(true) // Show image on correct answer
    } else {
      if (!hasRecordedWrong) {
        recordResult(currentWord, false, { roundId: roundData.id, source: 'scramble' })
        setHasRecordedWrong(true)
      }
      setFeedback({ level: 1, message: 'Try Again! 다시 시도해보세요' })
    }
  }

  const handleShowImage = () => {
    setShowImage(true)
    setIsImageLoading(true)
    setTimeout(() => {
      setIsImageLoading(false)
    }, 800) // 0.8s spinner
  }

  const handleSpeak = () => speakWord(currentWord.en)

  const handleHint = () => {
    if (hintStep === 0) {
      setHintStep(1)
    } else if (hintStep === 1) {
      setHintStep(2)
      handleSpeak()
    } else if (hintStep === 2) {
      setHintStep(3)
      handleShowImage()
    }
  }

  const nextWord = () => {
    if (index < roundData.words.length - 1) {
      setIndex(index + 1)
    } else {
      alert("모든 단어를 마쳤습니다! 참 잘하셨어요!")
      navigate('/scramble')
    }
  }

  const prevWord = () => {
    if (index > 0) setIndex(index - 1)
  }

  const syncUsedIndices = (text) => {
    const chars = normalize(text).split('')
    const nextUsed = []
    for (const ch of chars) {
      const idx = scrambled.findIndex((s, i) => s === ch && !nextUsed.includes(i))
      if (idx !== -1) nextUsed.push(idx)
    }
    setUsedIndices(nextUsed)
  }

  const handleLetterClick = (letter, cardIndex) => {
    if (usedIndices.includes(cardIndex)) return
    setUsedIndices(prev => [...prev, cardIndex])
    setUserInput(prev => prev + letter)
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setUserInput(value)
    syncUsedIndices(value)
  }

  const handleBackspace = () => {
    if (!userInput) return
    const nextInput = userInput.slice(0, -1)
    const removed = userInput.slice(-1)
    setUserInput(nextInput)
    if (normalize(removed).length > 0 && usedIndices.length > 0) {
      setUsedIndices(prev => prev.slice(0, -1))
    } else {
      syncUsedIndices(nextInput)
    }
  }

  const handleClear = () => {
    setUserInput('')
    setUsedIndices([])
  }

  const firstLetter = normalize(primaryAnswer).charAt(0) || primaryAnswer.charAt(0)
  const hintLabel =
    hintStep === 0 ? '💡 힌트: 첫 글자' :
    hintStep === 1 ? '💡 힌트: 발음' :
    hintStep === 2 ? '💡 힌트: 그림' :
    '💡 힌트 다 썼어요'

  const swipe = swipeHandlers(touchX, { onLeft: nextWord, onRight: prevWord })

  const imgUrl = getImageUrl(currentWord?.img)

  return (
    <div className="challenge-body scramble-game">
      <div className="challenge-container word-page">
        <h1>✍️ {roundFullLabel(roundData)} 쓰기 연습</h1>
        <div className="challenge-index">단어 {index + 1} / {roundData.words.length}</div>

        <div className="card-stage" {...swipe}>
          <button className="card-nav" onClick={prevWord} disabled={index === 0} aria-label="이전 단어">‹</button>
          <div className="card-main">
            <div className="challenge-card scramble-card" style={{ position: 'relative' }}>
              <button
                className={`favorite-btn ${fav ? 'active' : ''}`}
                onClick={toggleFavorite}
                title="나만의 단어장에 저장"
                aria-label={fav ? '단어장에서 빼기' : '단어장에 저장'}
              >
                {fav ? '⭐' : '☆'}
              </button>
              <div className="word-ko">{currentWord.ko}</div>

              <div className="scramble-image-area-inline">
                {showImage && (
                  isImageLoading ? (
                    <div className="spinner-container">
                      <div className="scramble-spinner"></div>
                    </div>
                  ) : (
                    imgUrl && (
                      <div className="challenge-image image-scramble-inline">
                        <img src={imgUrl} alt={currentWord.en} className="word-image fade-in" />
                      </div>
                    )
                  )
                )}
              </div>

              <div className="scrambled-hint">
                {scrambled.map((char, i) => {
                  const isUsed = usedIndices.includes(i)
                  return (
                    <span
                      key={i}
                      className={`letter-card ${isUsed ? 'used' : ''}`}
                      aria-disabled={isUsed}
                      onClick={() => handleLetterClick(char, i)}
                    >
                      {char}
                    </span>
                  )
                })}
              </div>
              {wordCount > 1 && (
                <div className="transcript-hint">💡 {wordCount}개의 단어로 이루어져 있어요 (띄어쓰기 자유)</div>
              )}
              {hintStep >= 1 && firstLetter && (
                <div className="first-letter-badge">💡 첫 글자: {firstLetter}</div>
              )}
              <input
                type="text"
                className="scramble-input"
                value={userInput}
                placeholder="글자를 눌러 단어 완성"
                aria-label="정답 입력"
                autoCapitalize="none"
                autoComplete="off"
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
          </div>
          <button className="card-nav" onClick={nextWord} aria-label="다음 단어">›</button>
        </div>

        {feedback && (
          <div className={`stt-feedback level-${feedback.level}`}>
            {feedback.message}
          </div>
        )}

        <div className="action-row">
          <button className="action-btn secondary" onClick={handleBackspace} disabled={userInput.length === 0}>⌫ 지우기</button>
          <button className="action-btn" onClick={handleCheck}>✅ 정답 확인</button>
        </div>
        <div className="action-row">
          <button className="action-btn secondary" onClick={handleSpeak}>🔊 발음 듣기</button>
          <button className="action-btn secondary hint-action" onClick={handleHint} disabled={hintStep >= 3}>
            {hintLabel}
          </button>
        </div>

        <div className="util-row">
          <button className="util-btn" onClick={handleClear} disabled={userInput.length === 0}>모두 지우기</button>
          <button className="util-btn" onClick={() => navigate('/scramble')}>☰ 목록으로</button>
        </div>
      </div>
    </div>
  )
}

export default ScrambleGame
