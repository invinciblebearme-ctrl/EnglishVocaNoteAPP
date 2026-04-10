import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'

function ScrambleGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [scrambled, setScrambled] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [showImage, setShowImage] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  
  const roundData = useMemo(() => allRounds.find(r => r.id === parseInt(id)), [id])
  const currentWord = roundData?.words[index]

  // Shuffle algorithm
  const shuffleWord = (word) => {
    let arr = word.split('')
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // If it's the same as original, shuffle again
    if (arr.join('') === word && word.length > 1) return shuffleWord(word)
    return arr
  }

  useEffect(() => {
    if (currentWord) {
      setScrambled(shuffleWord(currentWord.en.toLowerCase()))
      setUserInput('')
      setFeedback(null)
      setShowImage(false)
      setIsImageLoading(false)
    }
  }, [index, currentWord])

  if (!roundData) return <div>게임을 찾을 수 없습니다.</div>

  const handleCheck = () => {
    if (userInput.toLowerCase().trim() === currentWord.en.toLowerCase().trim()) {
      setFeedback({ level: 3, message: 'Excellent! ⭐⭐⭐' })
      handleSpeak()
      setShowImage(true) // Show image on correct answer
    } else {
      setFeedback({ level: 1, message: 'Try Again! ⭐' })
    }
  }

  const handleShowImage = () => {
    setShowImage(true)
    setIsImageLoading(true)
    setTimeout(() => {
      setIsImageLoading(false)
    }, 800) // 0.8s spinner
  }

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(currentWord.en)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
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

  const handleLetterClick = (letter) => {
    setUserInput(prev => prev + letter)
  }

  const imgUrl = currentWord ? `https://englishvocanote.pages.dev/${window.atob(currentWord.img)}` : null

  return (
    <div className="challenge-body scramble-game">
      <div className="challenge-container">
        <h1>오늘의 영단어 [{roundData.id}회] - 스크램블</h1>
        <div className="challenge-index">단어 {index + 1} / {roundData.words.length}</div>
        
        <div className="challenge-card">
          <div className="word-ko">{currentWord.ko}</div>

          {/* Match WordChallenge image frame and style exactly */}
          <div className="scramble-image-area-inline">
            {showImage && (
              isImageLoading ? (
                <div className="spinner-container">
                  <div className="scramble-spinner"></div>
                </div>
              ) : (
                imgUrl && (
                  <div className="challenge-image image-scramble-inline">
                    <img 
                      src={imgUrl} 
                      alt={currentWord.en}
                      className="word-image fade-in"
                    />
                  </div>
                )
              )
            )}
          </div>

          <div className="scrambled-hint">
            {scrambled.map((char, i) => (
              <span key={i} className="letter-card" onClick={() => handleLetterClick(char)}>
                {char}
              </span>
            ))}
          </div>
          <input 
            type="text" 
            className="scramble-input"
            value={userInput}
            placeholder="단어를 완성하세요..."
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
          />
          <div className="scramble-button-group">
             <button className="dark-button reset-input" onClick={() => setUserInput('')}>지우기</button>
             <button className="dark-button check-btn" onClick={handleCheck}>정답확인</button>
             
             {/* Image view button moved to here, below existing buttons */}
             {!showImage && (
                <button className="dark-button view-img-btn-inline" onClick={handleShowImage}>
                  📸 단어 이미지 보기
                </button>
             )}
          </div>
        </div>

        {feedback && (
          <div className={`stt-feedback level-${feedback.level}`}>
            {feedback.message}
          </div>
        )}

        <div className="challenge-controls">
          <button onClick={prevWord}>← 이전</button>
          <button onClick={nextWord}>다음 →</button>
          <button onClick={handleSpeak}>발음 듣기</button>
          <button onClick={() => navigate('/scramble')}>목록으로</button>
        </div>
      </div>
    </div>
  )
}

export default ScrambleGame
