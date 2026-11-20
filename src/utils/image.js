// 단어 이미지 URL (img 필드는 파일명을 base64로 저장)
const IMAGE_BASE = 'https://englishvocanote.pages.dev'

export const getImageUrl = (img) => (img ? `${IMAGE_BASE}/${window.atob(img)}` : null)
