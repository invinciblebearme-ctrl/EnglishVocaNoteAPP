import { useEffect, useState } from 'react'

// 선택한 학년·학기를 localStorage에 저장하고 모든 화면에서 공유
const STORAGE_KEY = 'selectedGrade'
const EVENT_NAME = 'storage_grade_change'
const DEFAULT_GRADE = '3학년 1학기'

const readGrade = () => localStorage.getItem(STORAGE_KEY) || DEFAULT_GRADE

export function useSelectedGrade() {
  const [grade, setGradeState] = useState(readGrade)

  useEffect(() => {
    const sync = () => setGradeState(readGrade())
    window.addEventListener(EVENT_NAME, sync)
    return () => window.removeEventListener(EVENT_NAME, sync)
  }, [])

  const setGrade = (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new Event(EVENT_NAME))
  }

  return [grade, setGrade]
}
