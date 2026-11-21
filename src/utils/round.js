import allRounds from '../data/all_rounds.json' with { type: 'json' }

// 내부 ID는 유지하고, 각 학년·학기 안에서 ID 순서로 표시 번호를 매긴다.
const termNos = new Map()
const gradeCounts = new Map()
for (const round of [...allRounds].sort((a, b) => a.id - b.id)) {
  const no = (gradeCounts.get(round.grade) || 0) + 1
  gradeCounts.set(round.grade, no)
  termNos.set(round.id, no)
}

export const termNo = (round) => termNos.get(round?.id)
export const roundLabel = (round) => (round ? `${termNo(round)}. ${round.name}` : '')
export const roundFullLabel = (round) => (round ? `${round.grade} · ${roundLabel(round)}` : '')

export function matchesRoundSearch(round, searchTerm) {
  let term = searchTerm.trim().toLowerCase()
  if (!term) return true

  // 학년·학기를 지정한 번호 검색과 기존의 "5회" 입력도 표시 번호로 찾는다.
  const gradeMatch = term.match(/^(\d+)\s*학년\s*(\d+)\s*학기\s*/)
    || term.match(/^(\d+)\s*-\s*(\d+)\s+/)
  if (gradeMatch) {
    if (round.grade !== `${Number(gradeMatch[1])}학년 ${Number(gradeMatch[2])}학기`) return false
    term = term.slice(gradeMatch[0].length)
  }
  if (/^\d+\s*(?:\.|회)?$/.test(term)) {
    return termNo(round) === Number(term.match(/^\d+/)[0])
  }

  return round.name.toLowerCase().includes(term)
    || round.category.toLowerCase().includes(term)
    || round.words.some(word => word.en.toLowerCase().includes(term) || word.ko.includes(term))
}
