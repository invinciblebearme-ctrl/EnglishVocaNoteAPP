// 단어 표기(en)에서 실제 정답을 뽑아내고 비교하는 유틸
// 예) "P.E. (physical education)" → "P.E."
//     "play (the piano)"         → "play"
//     "there is / there are"     → "there is", "there are"
//     "do my/your homework"      → "do my homework", "do your homework"

const stripParens = (s) => s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

// 띄어쓰기 없는 "a/b"는 해당 단어만 교체해 모든 조합을 만든다
const expandWordAlternatives = (phrase) =>
  phrase.split(' ').reduce(
    (acc, token) => {
      const options = token.split('/').filter(Boolean)
      return acc.flatMap((prefix) => options.map((opt) => (prefix ? `${prefix} ${opt}` : opt)))
    },
    ['']
  )

export const getAnswers = (en) =>
  stripParens(en)
    .split(/\s+\/\s+/)
    .flatMap(expandWordAlternatives)
    .filter(Boolean)

// 대소문자, 공백, 문장부호(. ' - 등)를 무시하고 알파벳만 비교
export const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '')

// 괄호 앞 핵심어 외에, 괄호를 풀어 쓴 전체 표현도 정답으로 인정
// 예) "play (the piano)" → "play" 또는 "play the piano"
const getAcceptedAnswers = (en) => [...getAnswers(en), ...getAnswers(en.replace(/[()]/g, ''))]

export const isCorrectAnswer = (input, en) => {
  const n = normalize(input)
  return n.length > 0 && getAcceptedAnswers(en).some((a) => normalize(a) === n)
}

// 정답과 부분적으로 일치하는지 (발음 평가의 'Good' 판정용)
export const isPartialAnswer = (input, en) => {
  const n = normalize(input)
  if (!n) return false
  return getAnswers(en).some((a) => {
    const t = normalize(a)
    return t.includes(n) || n.includes(t)
  })
}

// 스크램블 출제용 대표 정답 (첫 번째 조합)
export const getPrimaryAnswer = (en) => getAnswers(en)[0] || en

export const shuffleLetters = (word) => {
  const letters = normalize(word).split('')
  const original = letters.join('')
  let arr = letters
  // 원래 순서와 같으면 다시 섞기 (모든 글자가 같은 경우 대비 최대 10회)
  for (let attempt = 0; attempt < 10; attempt++) {
    arr = [...letters]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    if (arr.join('') !== original || arr.length < 2) break
  }
  return arr
}
