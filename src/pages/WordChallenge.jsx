import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { addToMyVoca, removeFromMyVoca, isFavorite } from '../utils/storage'
import { isCorrectAnswer, isPartialAnswer } from '../utils/answer'
import { speakWord } from '../utils/speech'
import { recordResult } from '../utils/progress'
import ExampleSentence from '../components/ExampleSentence'
import { getImageUrl } from '../utils/image'
import { roundLabel } from '../utils/round'

function WordChallenge() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [roundData, setRoundData] = useState(null)
  const [index, setIndex] = useState(0)
  const [showingEnglish, setShowingEnglish] = useState(true)
  const [fav, setFav] = useState(false)
  const touchX = useRef(null)
  useEffect(() => {
    const round = allRounds.find(r => r.id === parseInt(id))
    if (round) {
      setRoundData(round)
    } else {
      navigate('/')
    }
  }, [id, navigate])

  const nextWord = () => {
    if (!roundData) return
    setIndex(prev => (prev + 1) % roundData.words.length)
    setShowingEnglish(true)
  }

  const prevWord = () => {
    if (!roundData) return
    setIndex(prev => (prev - 1 + roundData.words.length) % roundData.words.length)
    setShowingEnglish(true)
  }

  const handleManualSpeak = () => {
    if (!roundData) return;
    const currentWord = roundData.words[index];
    if (currentWord) {
      speakWord(currentWord.en);
    }
  };

  // 단어가 바뀔 때(index 변경 시)만 최초 1회 자동 발음
  useEffect(() => {
    if (roundData && roundData.words[index]) {
      speakWord(roundData.words[index].en);
    }
  }, [index, roundData]);

  // 자동 의미 전환 (영어 <-> 한글)
  // 단어가 바뀌거나 카드를 직접 누르면 타이머가 처음부터 다시 시작된다
  const [autoFlip, setAutoFlip] = useState(true)
  useEffect(() => {
    if (!autoFlip) return;
    const timer = setTimeout(() => {
      setShowingEnglish(prev => !prev);
    }, 1500); // 1.5초 간격 전환
    return () => clearTimeout(timer);
  }, [autoFlip, showingEnglish, index]);

  const [imgError, setImgError] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pronunciationScore, setPronunciationScore] = useState(null)
  
  // 단어가 바뀔 때마다 이미지 에러 및 발음 점수 초기화, 즐겨찾기 상태 확인
  useEffect(() => {
    setImgError(false)
    setPronunciationScore(null)
    if (roundData && roundData.words[index]) {
      setFav(isFavorite(roundData.words[index].en))
    }
  }, [index, id, roundData])

  const toggleFavorite = () => {
    if (!roundData || !roundData.words[index]) return;
    const currentWord = roundData.words[index];
    if (fav) {
      removeFromMyVoca(currentWord.en);
      setFav(false);
    } else {
      addToMyVoca(currentWord);
      setFav(true);
    }
  };

  if (!roundData) return <div className="challenge-body">데이터를 불러오는 중...</div>;

  const currentWord = roundData.words[index]
  const imgUrl = getImageUrl(currentWord.img)

  // STT 발음 측정 시작
  const startSTT = () => {
    // Chrome 여부 확인
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    if (!isChrome) {
      alert("⚠️ 이 기능은 Google Chrome 브라우저에서만 정상적으로 작동합니다.\n현재 브라우저에서는 인식이 안 될 수 있으니, Chrome으로 접속해 주세요!");
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 설치해 주세요!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();

      let level = 1; // Try Again
      if (isCorrectAnswer(transcript, currentWord.en)) {
        level = 3; // Excellent
      } else if (isPartialAnswer(transcript, currentWord.en)) {
        level = 2; // Good
      }
      
      // 발음 평가 결과도 학습 기록에 반영 (애매한 'Good'은 기록하지 않음)
      if (level !== 2) recordResult(currentWord, level === 3, { roundId: roundData.id, source: 'speak' });
      setPronunciationScore({ transcript, level });
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      
      const isHttps = window.location.protocol === 'https:';

      if (event.error === 'not-allowed') {
        alert("🎤 마이크 사용 권한이 거부되었습니다. 주소창 왼쪽의 마이크 아이콘을 클릭하여 권한을 '허용'해 주세요!");
      } else if (event.error === 'service-not-allowed' || !isHttps) {
        alert("🔒 보안 연결(HTTPS)이 필요합니다.\n주소창의 주소가 'https://'로 시작하는지 확인해 주세요. (Dothome 등의 서버 설정 확인이 필요할 수 있습니다.)");
      } else if (event.error === 'network') {
        alert("🌐 네트워크 연결이 불안정합니다.\n1. 인터넷 연결을 확인해 주세요.\n2. Chrome 브라우저 사용을 권장합니다.\n3. 잠시 후 다시 시도해 주세요.");
      } else if (event.error === 'no-speech') {
        // 말소리가 들리지 않았을 때는 alert 대신 상태만 해제 (사용자 경험 개선)
        console.log("No speech detected.");
      } else {
        alert("발음 인식에 실패했습니다. (오류: " + event.error + ")\n잠시 후 다시 시도해 주세요.");
      }
    };

    recognition.start();
  };

  // 카드를 좌우로 밀어서 이전·다음 단어
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) nextWord()
    else prevWord()
  }

  return (
    <div className="challenge-body">
      <div className="challenge-container word-page">
        <h1>{roundLabel(roundData)}</h1>
        <div className="challenge-index">단어 {index + 1} / {roundData.words.length}</div>

        <div className="card-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button className="card-nav" onClick={prevWord} aria-label="이전 단어">‹</button>
          <div className="card-main">
            <div
              className="challenge-card"
              onClick={() => setShowingEnglish(prev => !prev)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <button
                className={`favorite-btn ${fav ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite();
                }}
                title="나만의 단어장에 저장"
                aria-label={fav ? '단어장에서 빼기' : '단어장에 저장'}
              >
                {fav ? '⭐' : '☆'}
              </button>
              {showingEnglish ? (
                <div className="word-en">{currentWord.en}</div>
              ) : (
                <div className="word-ko">{currentWord.ko}</div>
              )}
            </div>

            <div className="challenge-image">
              {imgUrl && !imgError ? (
                <img
                  src={imgUrl}
                  alt={currentWord.en}
                  className="word-image"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="no-image">{imgUrl ? "이미지 준비중" : "이미지 없음"}</div>
              )}
            </div>
          </div>
          <button className="card-nav" onClick={nextWord} aria-label="다음 단어">›</button>
        </div>

        <ExampleSentence key={currentWord.en} word={currentWord} />

        {pronunciationScore && (
          <div className={`stt-feedback level-${pronunciationScore.level}`}>
            {pronunciationScore.level === 3 && "Excellent! ⭐⭐⭐"}
            {pronunciationScore.level === 2 && "Good Job! ⭐⭐"}
            {pronunciationScore.level === 1 && "Try Again! ⭐"}
            <div className="transcript-hint">인식된 발음: "{pronunciationScore.transcript}"</div>
          </div>
        )}

        {/* 이 단어로 하는 활동 */}
        <div className="action-row">
          <button onClick={handleManualSpeak} className="action-btn">🔊 발음 듣기</button>
          <button
            className={`action-btn mic-button ${isListening ? 'listening' : ''}`}
            onClick={startSTT}
            disabled={isListening}
          >
            {isListening ? "🎤 듣는 중..." : "🎤 발음하기"}
          </button>
        </div>
        <div className="mic-hint">발음하기는 크롬 브라우저에서 가장 잘 돼요</div>

        {/* 이 회차의 다른 활동 */}
        <div className="action-row">
          <button onClick={() => navigate(`/listen-quiz/${id}`)} className="action-btn secondary">🎧 듣기 퀴즈</button>
          <button onClick={() => navigate(`/scramble-game/${id}`)} className="action-btn secondary">✍️ 쓰기 연습</button>
        </div>

        <div className="util-row">
          <button onClick={() => setAutoFlip(prev => !prev)} className="util-btn" aria-pressed={autoFlip}>
            🔄 뜻 자동 전환 {autoFlip ? '켜짐' : '꺼짐'}
          </button>
          <button onClick={() => navigate('/')} className="util-btn">☰ 목록으로</button>
        </div>

        <details className="teacher-menu">
          <summary>선생님 도구</summary>
          <div className="teacher-menu-items">
            <button onClick={() => navigate(`/class/${id}`)} className="util-btn">🖥 수업 모드</button>
            <button onClick={() => navigate(`/worksheet/${id}`)} className="util-btn">🖨 학습지 만들기</button>
            <button onClick={() => navigate('/teacher')} className="util-btn">👩‍🏫 학급 현황판</button>
          </div>
        </details>
      </div>
    </div>
  )
}

export default WordChallenge
