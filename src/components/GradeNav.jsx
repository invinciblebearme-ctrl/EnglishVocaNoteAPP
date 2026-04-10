import React, { useEffect, useState } from 'react'

const GRADES = ['3학년 1학기', '4학년 1학기', '5학년 1학기', '6학년 1학기']

function GradeNav() {
  const [selectedGrade, setSelectedGrade] = useState(
    localStorage.getItem('selectedGrade') || GRADES[0]
  )

  useEffect(() => {
    // Listen for storage changes in the same window (to sync components if needed)
    const handleStorageChange = () => {
      const stored = localStorage.getItem('selectedGrade')
      if (stored && stored !== selectedGrade) {
        setSelectedGrade(stored)
      }
    }
    window.addEventListener('storage_grade_change', handleStorageChange)
    return () => window.removeEventListener('storage_grade_change', handleStorageChange)
  }, [selectedGrade])

  const handleGradeSelect = (grade) => {
    localStorage.setItem('selectedGrade', grade)
    setSelectedGrade(grade)
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('storage_grade_change'))
  }

  return (
    <div className="grade-nav-container">
      <div className="grade-tabs">
        {GRADES.map((grade) => (
          <button
            key={grade}
            className={`grade-tab-item ${selectedGrade === grade ? 'active' : ''}`}
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
