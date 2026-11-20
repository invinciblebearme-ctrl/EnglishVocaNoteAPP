import React, { useState } from 'react'
import { speakWord } from '../utils/speech'
import { getPrimaryAnswer } from '../utils/answer'

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 예문 속 학습 단어를 강조한다 (makes, making처럼 끝이 바뀐 형태도 앞부분이 같으면 강조)
const highlight = (sentence, en) => {
  const core = getPrimaryAnswer(en).replace(/\.$/, '')
  if (!core) return sentence
  const re = new RegExp(`(${escapeRegExp(core)}[a-z]*)`, 'i')
  return sentence.split(re).map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : part
  )
}

// 단어 예문 (문장 듣기 · 뜻 보기)
function ExampleSentence({ word, large = false }) {
  const [showKo, setShowKo] = useState(false)
  if (!word?.ex) return null

  return (
    <div className={`example-sentence ${large ? 'large' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="example-en">{highlight(word.ex, word.en)}</div>
      {showKo && <div className="example-ko">{word.exKo}</div>}
      <div className="example-actions">
        <button onClick={() => speakWord(word.ex)}>🔊 문장 듣기</button>
        {word.exKo && (
          <button onClick={() => setShowKo((v) => !v)}>{showKo ? '뜻 숨기기' : '뜻 보기'}</button>
        )}
      </div>
    </div>
  )
}

export default ExampleSentence
