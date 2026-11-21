// 회차 이름을 모든 화면에서 같은 모양으로: "1회 · 감정"
export const roundLabel = (round) => (round ? `${round.id}회 · ${round.name}` : '')
