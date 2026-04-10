import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'

function Home() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade, setSelectedGrade] = useState(
    localStorage.getItem('selectedGrade') || '3학년 1학기'
  )
  const [filteredRounds, setFilteredRounds] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const handleGradeChange = () => {
      setSelectedGrade(localStorage.getItem('selectedGrade') || '3학년 1학기')
    }
    window.addEventListener('storage_grade_change', handleGradeChange)
    return () => window.removeEventListener('storage_grade_change', handleGradeChange)
  }, [])

  useEffect(() => {
    // Filter rounds based on search term and grade
    const filtered = allRounds.filter(round => {
      const matchSearch = 
        round.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.words.some(word => 
          word.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.ko.includes(searchTerm)
        )
      
      // If searching, show matching rounds across ALL grades (Global Search)
      // Otherwise, filter by the selected grade
      if (searchTerm) {
        return matchSearch
      } else {
        return round.grade === selectedGrade && matchSearch
      }
    })
    setFilteredRounds(filtered)
  }, [searchTerm, selectedGrade])

  // If searching, we display all grades that have matching results
  // Otherwise, we only display the selected grade
  const gradesToShow = searchTerm 
    ? [...new Set(filteredRounds.map(r => r.grade))]
    : [selectedGrade]

  return (
    <div className="container">
      <div className="home-body" style={{ textAlign: 'center' }}>
        <h1 className="home-title">초등영어활용노트 어휘</h1>

        <div className="search-container">
          <input 
            type="text" 
            placeholder="회차 또는 주제 검색..." 
            className="dark-button search-input"
            style={{ width: '250px', cursor: 'text' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="dark-button" onClick={() => setSearchTerm('')}>초기화</button>
          )}
        </div>
      </div>

      <div className="grade-page-content" style={{ width: '100%' }}>
        {filteredRounds.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '50px' }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          gradesToShow.map(grade => {
            const roundsInGrade = filteredRounds.filter(r => r.grade === grade)
            if (roundsInGrade.length === 0) return null
            
            const themesInGrade = [...new Set(roundsInGrade.map(r => r.category))]
            
            return (
              <div key={grade} className="grade-section">
                {/* Only show grade header if we are in global search mode */}
                {searchTerm && <h2 className="grade-header">{grade}</h2>}
                
                {themesInGrade.map(theme => (
                  <div key={theme} className="theme-group">
                    <h3 className="theme-title">{theme}</h3>
                    <div className="grid-container">
                      {roundsInGrade
                        .filter(r => r.category === theme)
                        .map(round => (
                          <div key={round.id} className="item" onClick={() => navigate(`/challenge/${round.id}`)}>
                            <img 
                              src={`https://englishvocanote.pages.dev/${window.atob(round.words[0].img)}`} 
                              alt={round.name}
                              className="round-img"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.nextSibling;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="image-fallback">
                              이미지<br/>준비중
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Home
