import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { useSelectedGrade } from '../hooks/useSelectedGrade'
import { getImageUrl } from '../utils/image'
import { getRoundProgress } from '../utils/progress'
import StudyStatus from './StudyStatus'
import InstallButton from './InstallButton'

// 학년별 회차 목록 (듣기/읽기, 쓰기 연습 화면 공통)
function RoundList({ title, placeholder, linkPrefix, imgProps }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade] = useSelectedGrade()
  const navigate = useNavigate()

  const filteredRounds = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return allRounds.filter(round => {
      const matchSearch =
        round.name.toLowerCase().includes(term) ||
        round.category.toLowerCase().includes(term) ||
        round.words.some(word =>
          word.en.toLowerCase().includes(term) ||
          word.ko.includes(searchTerm)
        )
      // 검색 중에는 전체 학년에서, 아니면 선택한 학년에서만 보여준다
      return searchTerm ? matchSearch : round.grade === selectedGrade && matchSearch
    })
  }, [searchTerm, selectedGrade])

  const gradesToShow = searchTerm
    ? [...new Set(filteredRounds.map(r => r.grade))]
    : [selectedGrade]

  return (
    <div className="container">
      <div className="home-body" style={{ textAlign: 'center' }}>
        <h1 className="home-title">{title}</h1>
        <StudyStatus />
        <InstallButton />

        <div className="search-container">
          <input
            type="text"
            placeholder={placeholder}
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
                {/* 검색 중일 때만 학년 제목 표시 */}
                {searchTerm && <h2 className="grade-header">{grade}</h2>}

                {themesInGrade.map(theme => (
                  <div key={theme} className="theme-group">
                    <h3 className="theme-title">{theme}</h3>
                    <div className="grid-container">
                      {roundsInGrade
                        .filter(r => r.category === theme)
                        .map(round => {
                          const { total, mastered } = getRoundProgress(round)
                          const percent = total > 0 ? Math.round((mastered / total) * 100) : 0
                          const isCompleted = total > 0 && mastered === total

                          return (
                            <div key={round.id} className="item" onClick={() => navigate(`${linkPrefix}/${round.id}`)}>
                              {isCompleted && (
                                <span className="round-complete-badge" title="학습 완료">✅</span>
                              )}
                              <img
                                src={getImageUrl(round.words[0].img)}
                                alt={round.name}
                                {...imgProps}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.nextSibling;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div className="image-fallback">
                                이미지<br/>준비중
                              </div>
                              <div className="round-progress-bar" title={`${mastered} / ${total} 익힘`}>
                                <div
                                  className={`round-progress-fill ${isCompleted ? 'completed' : ''}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      <footer className="list-footer">
        <Link to="/my-class">🏫 우리 반 참여하기</Link>
        <span>·</span>
        <Link to="/teacher">👩‍🏫 선생님 현황판</Link>
      </footer>
    </div>
  )
}

export default RoundList
