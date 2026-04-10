import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'

function WordChallenge() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [roundData, setRoundData] = useState(null)
  const [index, setIndex] = useState(0)
  const [showingEnglish, setShowingEnglish] = useState(true)
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

  const speakWord = (word) => {
    window.speechSynthesis.cancel();
    if (!word) return;
    
    const utterance = new SpeechSynthesisUtterance(word);
    
    // 사용 가능한 음성 목록 가져오기
    const voices = window.speechSynthesis.getVoices();
    
    // 영어(미국/영국) 음성 중 네이티브에 가까운 음성 우선 필터링
    let selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                        voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha')) ||
                        voices.find(v => v.lang.startsWith('en-US')) ||
                        voices.find(v => v.lang.startsWith('en'));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 조금 더 또박또박하게 (기본 1.0)
    window.speechSynthesis.speak(utterance);
  };

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

  // 자동 의미 전환 (영어 <-> 한글 무한 반복)
  useEffect(() => {
    const timer = setInterval(() => {
      setShowingEnglish(prev => !prev);
    }, 1500); // 1.5초 간격 전환
    return () => clearInterval(timer);
  }, []);

  const [imgError, setImgError] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pronunciationScore, setPronunciationScore] = useState(null)
  
  // 단어가 바뀔 때마다 이미지 에러 및 발음 점수 초기화
  useEffect(() => {
    setImgError(false)
    setPronunciationScore(null)
  }, [index, id])

  if (!roundData) return <div className="challenge-body">데이터를 불러오는 중...</div>;

  const currentWord = roundData.words[index]
  const imgUrl = currentWord.img ? `https://englishvocanote.pages.dev/${window.atob(currentWord.img)}` : null

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
      const target = currentWord.en.toLowerCase().trim();
      
      let level = 1; // Try Again
      if (transcript === target) {
        level = 3; // Excellent
      } else if (transcript.includes(target) || target.includes(transcript)) {
        level = 2; // Good
      }
      
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

  return (
    <div className="challenge-body">
      <div className="challenge-container">
        <h1>
          {roundData.name}
        </h1>
        <div className="challenge-index">단어 {index + 1} / {roundData.words.length}</div>
        
        <div className="challenge-card">
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

        {pronunciationScore && (
          <div className={`stt-feedback level-${pronunciationScore.level}`}>
            {pronunciationScore.level === 3 && "Excellent! ⭐⭐⭐"}
            {pronunciationScore.level === 2 && "Good Job! ⭐⭐"}
            {pronunciationScore.level === 1 && "Try Again! ⭐"}
            <div className="transcript-hint">인식된 발음: "{pronunciationScore.transcript}"</div>
          </div>
        )}

        <div className="challenge-controls">
          <button onClick={prevWord} className="nav-btn-premium">이전</button>
          <button onClick={nextWord} className="nav-btn-premium">다음</button>
          <button onClick={handleManualSpeak} className="nav-btn-premium">발음 듣기</button>
          <button onClick={() => navigate('/')} className="nav-btn-premium">목록으로</button>
        </div>

        <div className="stt-controls">
          <button 
            className={`mic-button ${isListening ? 'listening' : ''}`} 
            onClick={startSTT}
            disabled={isListening}
          >
            {isListening ? "🎤 측정중..." : "🎤 발음하기"}
          </button>
          <div className="mic-hint">※ 발음확인은 크롬브라우저만 가능</div>
        </div>
      </div>
    </div>
  )
}

export default WordChallenge
