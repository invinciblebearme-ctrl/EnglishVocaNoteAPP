# 초등영어활용노트 어휘 (EnglishVocaNote)

초등 3~6학년 교과 영어 어휘를 학년·학기별로 익히는 웹 앱입니다.

- **듣기 / 읽기**: 그림과 함께 단어 카드 보기, 발음 듣기, 발음 평가(크롬)
- **쓰기 연습**: 섞인 글자로 단어 완성하기(스크램블)
- **단어장**: ⭐로 저장한 단어 모아 보기, PDF로 저장

배포 주소: https://english-voca-note-app.pages.dev

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
npm run deploy   # 빌드 후 Cloudflare Pages 배포 (처음엔 wrangler 로그인 필요)
```

Windows에서는 `deploy_cloudflare.bat`을 더블클릭해도 배포됩니다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/data/all_rounds.json` | 앱이 쓰는 어휘 데이터 (84회차, 749단어) |
| `src/pages/` | 화면 (목록, 단어 카드, 스크램블, 단어장) |
| `src/components/RoundList.jsx` | 듣기/쓰기 공통 회차 목록 |
| `src/hooks/useSelectedGrade.js` | 선택한 학년·학기 공유 |
| `src/utils/answer.js` | 정답 추출·비교 (괄호·기호 처리) |
| `src/utils/speech.js` | 영어 발음 재생 |
| `src/utils/image.js` | 단어 이미지 URL (englishvocanote.pages.dev에서 제공) |
| `data/vocab/` | 원본 어휘 목록 (학년/학기·주제·어휘·뜻, 탭 구분) |
| `data/image-lists/` | 이미지 작업용 파일 목록 |
| `native/` | Expo(React Native) 앱 — 예전 어휘 세트를 사용 중 |

## 어휘 데이터 형식

```json
{ "id": 2, "name": "사물", "grade": "3학년 1학기", "category": "사물",
  "words": [{ "en": "bag", "ko": "가방", "img": "<파일명 base64>" }] }
```

`en`에 `P.E. (physical education)`, `there is / there are`처럼 괄호나 `/`가 있으면,
쓰기 연습과 발음 평가는 괄호 앞 핵심어와 `/`로 나뉜 각 표현을 정답으로 인정합니다.
