import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { addToMyVoca, removeFromMyVoca, isFavorite } from '../utils/storage'
import { isCorrectAnswer, isPartialAnswer } from '../utils/answer'
import { speakWord } from '../utils/speech'
import { recognizeSpeech } from '../utils/pronounce'
import { recordResult } from '../utils/progress'
import ExampleSentence from '../components/ExampleSentence'
import { getImageUrl } from '../utils/image'
import { roundLabel } from '../utils/round'
import { swipeHandlers } from '../utils/swipe'

function WordChallenge() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [roundData, setRoundData] = useState(null)
  const [index, setIndex] = useState(0)
  const [showingEnglish, setShowingEnglish] = useState(true)
  const [fav, setFav] = useState(false)
  const touchX = useRef(null)
  const sttController = useRef(null)
  const sttSession = useRef(0)
  const wordKey = `${id}:${index}`
  const activeWord = useRef(wordKey)
  activeWord.current = wordKey
  const [isListening, setIsListening] = useState(false)
  const [listeningDuration, setListeningDuration] = useState(3500)
  const [micLevel, setMicLevel] = useState(null)
  const stopListeningRef = useRef(null)
  const speakMissCount = useRef(0)

  const cancelSTT = () => {
    sttSession.current += 1
    stopListeningRef.current = null
    sttController.current?.abort()
    sttController.current = null
  }
  useEffect(() => {
    setIsListening(false)
    setMicLevel(null)
    speakMissCount.current = 0
    return () => cancelSTT()
  }, [index, id])
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
    cancelSTT()
    setIsListening(false)
    setIndex(prev => (prev + 1) % roundData.words.length)
    setShowingEnglish(true)
  }

  const prevWord = () => {
    if (!roundData) return
    cancelSTT()
    setIsListening(false)
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
    if (!autoFlip || isListening) return;
    const timer = setTimeout(() => {
      setShowingEnglish(prev => !prev);
    }, 1500); // 1.5초 간격 전환
    return () => clearTimeout(timer);
  }, [autoFlip, showingEnglish, index, isListening]);

  const [imgError, setImgError] = useState(false)
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
  const startSTT = async () => {
    if (sttController.current) return;
    const controller = new AbortController();
    sttController.current = controller;
    const session = ++sttSession.current;
    const isCurrent = () => session === sttSession.current && activeWord.current === wordKey && !controller.signal.aborted;
    window.speechSynthesis?.cancel();
    setShowingEnglish(true);
    setPronunciationScore(null);
    setMicLevel(null);
    stopListeningRef.current = null;
    setIsListening('preparing');
    try {
      const transcript = (await recognizeSpeech({
        lang: 'en-US',
        signal: controller.signal,
        onState: (state, duration, stop) => {
          if (!isCurrent()) return;
          if (duration) setListeningDuration(duration);
          stopListeningRef.current = state === 'listening' ? (stop || null) : null;
          setIsListening(state);
        },
        onLevel: (level) => {
          if (isCurrent()) setMicLevel(level);
        },
      })).toLowerCase().trim();
      if (!isCurrent()) return;

      let level = 1;
      if (isCorrectAnswer(transcript, currentWord.en)) {
        level = 3;
      } else if (isPartialAnswer(transcript, currentWord.en)) {
        level = 2;
      }

      let firstMiss = false;
      if (level === 3) {
        recordResult(currentWord, true, { roundId: roundData.id, source: 'speak' });
      } else if (level === 1) {
        if (speakMissCount.current === 0) {
          firstMiss = true;
        } else {
          // 같은 단어에서 두 번째 level 1부터 틀림 기록 (애매한 level 2는 미기록)
          recordResult(currentWord, false, { roundId: roundData.id, source: 'speak' });
        }
        speakMissCount.current += 1;
      }
      setPronunciationScore({ transcript, level, firstMiss });
    } catch (error) {
      if (error.code === 'aborted' || !isCurrent()) return;
      const messages = {
        'not-allowed': "마이크가 꺼져 있어요. 주소창 옆 마이크 모양에서 '허용'을 눌러 주세요",
        retry: '준비됐어요! 🎤를 한 번 더 눌러 주세요',
        server: '인터넷 연결을 확인하고 다시 해 봐요',
        busy: '지금 사용하는 친구가 많아요. 잠시 뒤에 다시 해 봐요',
      };
      setPronunciationScore({ error: messages[error.code] || '잘 안 들렸어요. 조금 더 크게 말해 볼까요?' });
    } finally {
      if (isCurrent()) {
        stopListeningRef.current = null;
        sttController.current = null;
        setMicLevel(null);
        setIsListening(false);
      }
    }
  };

  const swipe = swipeHandlers(touchX, { onLeft: nextWord, onRight: prevWord })

  return (
    <div className="challenge-body">
      <div className="challenge-container word-page">
        <h1>{roundLabel(roundData)}</h1>
        <div className="challenge-index">단어 {index + 1} / {roundData.words.length}</div>

        <div className="card-stage" {...swipe}>
          <button className="card-nav" onClick={prevWord} aria-label="이전 단어">‹</button>
          <div className="card-main">
            <div
              className="challenge-card"
              onClick={() => { if (!isListening) setShowingEnglish(prev => !prev) }}
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
              {isListening || showingEnglish ? (
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
          <div className={`stt-feedback${pronunciationScore.error ? '' : ` level-${pronunciationScore.level}`}`} role="status">
            {pronunciationScore.error}
            {pronunciationScore.level === 3 && "완벽해요! ⭐⭐⭐"}
            {pronunciationScore.level === 2 && "좋아요! 조금 더 또박또박 ⭐⭐"}
            {pronunciationScore.level === 1 && "한 번 더 해 볼까요? ⭐"}
            {pronunciationScore.firstMiss && (
              <div className="transcript-hint">주변이 시끄러우면 마이크에 가까이 대고 말해요</div>
            )}
            {!pronunciationScore.error && <div className="transcript-hint">이렇게 들렸어요: "{pronunciationScore.transcript}"</div>}
          </div>
        )}

        {/* 이 단어로 하는 활동 */}
        <div className="action-row">
          <button onClick={handleManualSpeak} className="action-btn" disabled={!!isListening}>🔊 발음 듣기</button>
          <button
            className={`action-btn mic-button ${isListening === 'listening' ? 'listening' : ''}`}
            onClick={isListening === 'listening' ? () => stopListeningRef.current?.() : startSTT}
            disabled={!!isListening && isListening !== 'listening'}
          >
            {isListening === 'processing' ? "⏳ 확인 중..." : isListening === 'listening' ? "⏹ 다 말했어요" : isListening === 'preparing' ? "🎤 준비 중..." : "🎤 발음하기"}
          </button>
        </div>
        {isListening === 'listening' && (
          <>
            <div className="mic-progress" role="progressbar" aria-label="녹음 남은 시간" style={{ '--recording-duration': `${listeningDuration}ms` }}>
              <span />
            </div>
            {micLevel !== null && (
              <div className="mic-level" aria-hidden="true">
                <span style={{ transform: `scaleX(${Math.max(0.04, micLevel)})` }} />
              </div>
            )}
          </>
        )}
        <div className="mic-hint" role="status">
          {isListening === 'listening' ? '지금 말해요!' : isListening === 'processing' ? '잘 들었는지 확인하고 있어요' : isListening === 'preparing' ? '마이크를 준비하고 있어요' : '🎤를 누르고 영어 단어를 크게 읽어요'}
        </div>

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
