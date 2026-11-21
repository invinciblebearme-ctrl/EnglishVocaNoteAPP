import React from 'react'
import RoundList from '../components/RoundList'

function Home() {
  return (
    <RoundList
      title="초등영어활용노트 어휘"
      placeholder="회차 또는 주제 검색..."
      linkPrefix="/challenge"
    />
  )
}

export default Home
