import React, { useEffect, useState } from 'react'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const DISMISS_KEY = 'install_dismissed_v1'

// 홈 화면에 앱 설치 (크롬·엣지·안드로이드는 설치 창, 아이폰·아이패드는 방법 안내)
// 목록 화면 제목 아래에 작게 보여 주고, '나중에'를 누르면 이 기기에서는 다시 띄우지 않는다.
function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const [showIOSHelp, setShowIOSHelp] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed || (!prompt && !isIOS())) return null

  const install = async () => {
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setPrompt(null)
    } else {
      setShowIOSHelp((v) => !v)
    }
  }

  return (
    <div className="install-wrap">
      <button className="install-btn" onClick={install}>📲 홈 화면에 앱 설치</button>
      <button
        className="install-later"
        onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true) }}
      >
        나중에
      </button>
      {showIOSHelp && (
        <div className="install-help" onClick={() => setShowIOSHelp(false)}>
          사파리 아래쪽의 <b>공유 버튼(□↑)</b>을 누르고<br />
          <b>‘홈 화면에 추가’</b>를 선택하세요.
        </div>
      )}
    </div>
  )
}

export default InstallButton
