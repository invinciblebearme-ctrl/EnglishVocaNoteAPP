import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const SEMESTERS = ['1학기', '2학기']
const GRADES = ['3학년', '4학년', '5학년', '6학년']

function GradeNav() {
  const location = useLocation()
  const isNavVisible = location.pathname === '/' || location.pathname === '/scramble'

  const [selectedGrade, setSelectedGrade] = useState(() => {
    return localStorage.getItem('selectedGrade') || '3학년 1학기'
  })

  // Parse current grade and semester
  const currentGrade = GRADES.find(g => selectedGrade.startsWith(g)) || '3학년'
  const currentSemester = SEMESTERS.find(s => selectedGrade.includes(s)) || '1학기'

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('selectedGrade')
      if (stored && stored !== selectedGrade) {
        setSelectedGrade(stored)
      }
    }
    window.addEventListener('storage_grade_change', handleStorageChange)
    return () => window.removeEventListener('storage_grade_change', handleStorageChange)
  }, [selectedGrade])

  const updateSelection = (newGrade, newSemester) => {
    const combined = `${newGrade} ${newSemester}`
    localStorage.setItem('selectedGrade', combined)
    setSelectedGrade(combined)
    window.dispatchEvent(new Event('storage_grade_change'))
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
      {/* Semester Selector */}
      <div className="semester-tabs">
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

      {/* Grade Selector */}
      <div className="grade-tabs">
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
    </div>
  )
}

export default GradeNav
