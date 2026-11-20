import React from 'react'
import RoundList from '../components/RoundList'

function ScrambleHome() {
  return (
    <RoundList
      title="초등영어활용노트 어휘 (쓰기)"
      placeholder="스크램블 주제 검색..."
      linkPrefix="/scramble-game"
      imgProps={{ style: { objectFit: 'contain' } }}
    />
  )
}

export default ScrambleHome
