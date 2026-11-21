import React from 'react'
import { useLocation } from 'react-router-dom'
import { useSelectedGrade } from '../hooks/useSelectedGrade'

const SEMESTERS = ['1학기', '2학기']
const GRADES = ['3학년', '4학년', '5학년', '6학년']

function GradeNav() {
  const location = useLocation()
  const isNavVisible = location.pathname === '/' || location.pathname === '/scramble'

  const [selectedGrade, setSelectedGrade] = useSelectedGrade()

  // Parse current grade and semester
  const currentGrade = GRADES.find(g => selectedGrade.startsWith(g)) || '3학년'
  const currentSemester = SEMESTERS.find(s => selectedGrade.includes(s)) || '1학기'

  const updateSelection = (newGrade, newSemester) => {
    setSelectedGrade(`${newGrade} ${newSemester}`)
  }

  const handleSemesterSelect = (semester) => {
    updateSelection(currentGrade, semester)
  }

  const handleGradeSelect = (grade) => {
    updateSelection(grade, currentSemester)
  }

  if (!isNavVisible) {
    return null
  }

  return (
    <div className="grade-nav-container">
      {/* 학년 선택 */}
      <div className="grade-tabs" role="group" aria-label="학년">
        {GRADES.map((grade) => (
          <button
            key={grade}
            className={`grade-tab-item ${currentGrade === grade ? 'active' : ''}`}
            onClick={() => handleGradeSelect(grade)}
          >
            {grade}
          </button>
        ))}
      </div>
      {/* 학기 선택 (오른쪽 작은 스위치) */}
      <div className="semester-tabs" role="group" aria-label="학기">
        {SEMESTERS.map((semester) => (
          <button
            key={semester}
            className={`semester-tab-item ${currentSemester === semester ? 'active' : ''}`}
            onClick={() => handleSemesterSelect(semester)}
          >
            {semester}
          </button>
        ))}
      </div>

    </div>
  )
}

export default GradeNav
