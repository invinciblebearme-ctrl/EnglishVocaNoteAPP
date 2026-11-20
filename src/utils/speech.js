// 영어 발음 재생 (모든 페이지 공통)

let cachedVoice = null

const pickVoice = () => {
  const voices = window.speechSynthesis?.getVoices() || []
  // 네이티브에 가까운 영어 음성을 우선 선택
  return (
    voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
    voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha')) ||
    voices.find(v => v.lang.startsWith('en-US')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  )
}

// 크롬은 음성 목록을 비동기로 불러오므로, 준비되면 미리 골라 둔다
if (typeof window !== 'undefined' && window.speechSynthesis) {
  cachedVoice = pickVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice()
  })
}

export const speakWord = (text) => {
  if (!text || !window.speechSynthesis) return
  window.speechSynthesis.cancel() // 이전 발음과 겹치지 않도록
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = cachedVoice || pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = 'en-US'
  utterance.rate = 0.9 // 또박또박하게
  window.speechSynthesis.speak(utterance)
}
