import React from 'react'
import RoundList from '../components/RoundList'

function ScrambleHome() {
  return (
    <RoundList
      title="✍️ 쓰기 연습"
      placeholder="회차 또는 주제 검색..."
      linkPrefix="/scramble-game"
    />
  )
}

export default ScrambleHome
