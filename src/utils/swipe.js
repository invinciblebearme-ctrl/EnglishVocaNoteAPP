// 카드를 좌우로 밀어서 이전·다음 단어로 넘기기.
// 입력칸·버튼·글자 카드에서 시작한 터치와 세로 스크롤은 무시한다.
const IGNORE = 'input, textarea, button, select, .letter-card'

export function swipeHandlers(ref, { onLeft, onRight, min = 50 }) {
  return {
    onTouchStart: (e) => {
      if (e.target.closest(IGNORE)) { ref.current = null; return }
      const t = e.touches[0]
      ref.current = { x: t.clientX, y: t.clientY }
    },
    onTouchEnd: (e) => {
      const start = ref.current
      ref.current = null
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx < 0) onLeft()
      else onRight()
    },
  }
}
