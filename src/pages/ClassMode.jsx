import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { roundLabel } from '../utils/round'
import { speakWord } from '../utils/speech'
import { getImageUrl } from '../utils/image'
import ExampleSentence from '../components/ExampleSentence'

// 교사 수업 모드: 전자칠판용 큰 단어 카드
// 키보드 → / Space 다음, ← 이전, Enter 뒤집기, S 발음, F 전체 화면, Esc 나가기

const SETTINGS_KEY = 'class_mode_settings'
const DEFAULT_SETTINGS = { order: 'seq', front: 'image', autoSec: 0, autoSpeak: true }
const FRONT_LABELS = { image: '그림', en: '영어', ko: '한글' }

const loadSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const shuffle = (items) => {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function ClassMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const round = useMemo(() => allRounds.find((r) => String(r.id) === id), [id])
  const [settings, setSettings] = useState(loadSettings)
  const [seed, setSeed] = useState(0) // 무작위 순서 다시 섞기용
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showSettings, setShowSettings] = useState(false) // 좁은 화면에서 설정 펼치기
  const rootRef = useRef(null)

  const words = useMemo(() => {
    if (!round) return []
    return settings.order === 'random' ? shuffle(round.words) : round.words
  }, [round, settings.order, seed]) // seed가 바뀌면 다시 섞는다

  const word = words[index]

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  }

  const go = useCallback(
    (delta) => {
      if (!words.length) return
      setIndex((i) => (i + delta + words.length) % words.length)
      setRevealed(false)
    },
    [words.length]
  )

  // 순서·섞기가 바뀌면 처음부터
  useEffect(() => {
    setIndex(0)
    setRevealed(false)
  }, [words])

  // 카드가 바뀔 때 자동 발음
  useEffect(() => {
    if (word && settings.autoSpeak) speakWord(word.en)
  }, [word, settings.autoSpeak])

  // 자동 넘김: 앞면 → (절반 시간) 정답 공개 → 다음 카드
  useEffect(() => {
    if (!settings.autoSec || !word) return
    const half = (settings.autoSec * 1000) / 2
    const t = setTimeout(() => (revealed ? go(1) : setRevealed(true)), half)
    return () => clearTimeout(t)
  }, [settings.autoSec, word, revealed, go])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current?.requestFullscreen?.()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Enter') setRevealed((r) => !r)
      else if (e.key.toLowerCase() === 's' && word) speakWord(word.en)
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
      else if (e.key === 'Escape' && !document.fullscreenElement) navigate(`/challenge/${id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, word, id, navigate])

  if (!round) {
    return (
      <div className="challenge-body">
        <div className="challenge-container">
          <h1>회차를 찾을 수 없어요</h1>
          <div className="util-row">
            <button className="util-btn" onClick={() => navigate('/')}>☰ 목록으로</button>
          </div>
        </div>
      </div>
    )
  }

  const imgUrl = getImageUrl(word.img)
  const show = {
    image: settings.front === 'image' || revealed,
    en: settings.front === 'en' || revealed,
    ko: settings.front === 'ko' || revealed,
  }

  return (
    <div className="class-mode" ref={rootRef}>
      <div className="class-toolbar">
        <span className="class-title">{roundLabel(round)} · {index + 1} / {words.length}</span>
        <button
          className="class-settings-toggle"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
        >
          ⚙ 설정
        </button>
        <div className={`class-settings ${showSettings ? 'open' : ''}`}>
        <label>
          순서
          <select value={settings.order} onChange={(e) => updateSettings({ order: e.target.value })}>
            <option value="seq">순서대로</option>
            <option value="random">무작위</option>
          </select>
        </label>
        {settings.order === 'random' && (
          <button onClick={() => setSeed((s) => s + 1)}>🔀 다시 섞기</button>
        )}
        <label>
          먼저 보기
          <select value={settings.front} onChange={(e) => updateSettings({ front: e.target.value })}>
            {Object.entries(FRONT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          자동 넘김
          <select value={settings.autoSec} onChange={(e) => updateSettings({ autoSec: Number(e.target.value) })}>
            <option value={0}>끄기</option>
            <option value={4}>4초</option>
            <option value={6}>6초</option>
            <option value={10}>10초</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.autoSpeak}
            onChange={(e) => updateSettings({ autoSpeak: e.target.checked })}
          />
          자동 발음
        </label>
        </div>
        <button onClick={toggleFullscreen} aria-label="전체 화면">⛶<span className="class-btn-label"> 전체 화면</span></button>
        <button onClick={() => navigate(`/challenge/${id}`)}>✕ 나가기</button>
      </div>

      <div className="class-stage" onClick={() => setRevealed((r) => !r)}>
        <div className={`class-image ${show.image ? '' : 'hidden'}`}>
          {imgUrl && <img src={imgUrl} alt="" />}
        </div>
        <div className={`class-en ${show.en ? '' : 'hidden'}`}>{word.en}</div>
        <div className={`class-ko ${show.ko ? '' : 'hidden'}`}>{word.ko}</div>
        {revealed && <ExampleSentence key={word.en} word={word} large />}
        {!revealed && <div className="class-tap-hint">화면을 누르거나 Enter → 정답 보기</div>}
      </div>

      <div className="class-nav">
        <button onClick={() => go(-1)}>← 이전</button>
        <button onClick={() => speakWord(word.en)}>🔊 발음</button>
        <button onClick={() => setRevealed((r) => !r)}>{revealed ? '가리기' : '정답 보기'}</button>
        <button onClick={() => go(1)}>다음 →</button>
      </div>
      <div className="class-keys">← → 이동 · Enter 정답 · S 발음 · F 전체 화면 · Esc 나가기</div>
    </div>
  )
}

export default ClassMode
