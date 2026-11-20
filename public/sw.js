// 서비스 워커: 한 번 본 화면·그림은 인터넷이 끊겨도 열리도록 저장한다
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`
const IMAGES = 'word-images' // 단어 그림은 버전이 바뀌어도 유지
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  const keep = [SHELL, ASSETS, IMAGES]
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// 캐시 우선 (바뀌지 않는 파일)
const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

// 네트워크 우선 (첫 화면 HTML: 새 버전을 먼저 받고, 오프라인이면 저장본)
const networkFirst = async (request) => {
  try {
    const response = await fetch(request)
    const cache = await caches.open(SHELL)
    cache.put('./index.html', response.clone())
    return response
  } catch {
    return (await caches.match('./index.html')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  } else if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS)) // 파일명에 해시가 있어 안전
  } else if (url.hostname === 'englishvocanote.pages.dev') {
    // 그림은 CORS로 받아 저장한다 (PDF 저장처럼 crossOrigin으로 쓰는 곳에서도 그대로 쓸 수 있게)
    event.respondWith(cacheFirst(new Request(request.url, { mode: 'cors', credentials: 'omit' }), IMAGES))
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request, ASSETS))
  }
})
