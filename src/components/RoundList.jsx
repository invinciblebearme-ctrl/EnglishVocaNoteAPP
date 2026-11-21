import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import allRounds from '../data/all_rounds.json'
import { useSelectedGrade } from '../hooks/useSelectedGrade'
import { getImageUrl } from '../utils/image'
import { getRoundProgress } from '../utils/progress'
import StudyStatus from './StudyStatus'
import InstallButton from './InstallButton'
import { CLASS_EVENT, getMembership } from '../utils/classSync'

// 학년별 회차 목록 (듣기/읽기, 쓰기 연습 화면 공통)
function RoundList({ title, placeholder, linkPrefix }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade] = useSelectedGrade()
  const navigate = useNavigate()

  const filteredRounds = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return allRounds.filter(round => {
      const matchSearch =
        `${round.id}회` === term.replace(/\s/g, '') ||
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
      <div className="home-body">
        <h1 className="home-title">{title}</h1>
        <StudyStatus />
        <ClassBadge />
        <InstallButton />

        <div className="search-container">
          <input
            type="search"
            placeholder={placeholder}
            className="dark-button search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="회차 검색"
          />
          {searchTerm && (
            <button className="dark-button" onClick={() => setSearchTerm('')}>초기화</button>
          )}
        </div>
      </div>

      <div className="grade-page-content">
        {filteredRounds.length === 0 ? (
          <div className="round-empty">검색 결과가 없습니다.</div>
        ) : (
          gradesToShow.map(grade => {
            const roundsInGrade = filteredRounds.filter(r => r.grade === grade)
            if (roundsInGrade.length === 0) return null

            return (
              <section key={grade} className="grade-section">
                {/* 검색 중일 때만 학년 제목 표시 */}
                {searchTerm && <h2 className="grade-header">{grade}</h2>}
                <div className="round-grid">
                  {roundsInGrade.map(round => {
                    const { total, mastered } = getRoundProgress(round)
                    const percent = total > 0 ? Math.round((mastered / total) * 100) : 0
                    const isCompleted = total > 0 && mastered === total

                    return (
                      <button
                        key={round.id}
                        className={`round-card ${isCompleted ? 'completed' : ''}`}
                        onClick={() => navigate(`${linkPrefix}/${round.id}`)}
                      >
                        {isCompleted && (
                          <span className="round-complete-badge" title="학습 완료">✅</span>
                        )}
                        <span className="round-card-img">
                          <img
                            src={getImageUrl(round.words[0].img)}
                            alt=""
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                          />
                        </span>
                        <span className="round-card-title">
                          <span className="round-no">{round.id}회</span> {round.name}
                        </span>
                        <span className="round-card-meta">
                          {total}단어 · {mastered > 0 ? `${mastered}개 익힘` : '시작 전'}
                        </span>
                        <span className="round-progress-bar" title={`${mastered} / ${total} 익힘`}>
                          <span
                            className={`round-progress-fill ${isCompleted ? 'completed' : ''}`}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
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

// 우리 반에 참여한 학생에게 학급·번호를 보여 준다 (누르면 우리 반 화면)
function ClassBadge() {
  const [member, setMember] = useState(getMembership)
  useEffect(() => {
    const update = () => setMember(getMembership())
    window.addEventListener(CLASS_EVENT, update)
    return () => window.removeEventListener(CLASS_EVENT, update)
  }, [])
  if (!member) return null
  return (
    <Link to="/my-class" className="class-badge">
      🏫 {member.className} · {member.number}번 {member.nickname}
    </Link>
  )
}

export default RoundList
