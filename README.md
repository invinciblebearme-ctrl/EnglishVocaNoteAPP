# 초등영어활용노트 어휘 (EnglishVocaNote)

초등 3~6학년 교과 영어 어휘를 학년·학기별로 익히는 웹 앱입니다.

- **듣기 / 읽기**: 그림과 함께 단어 카드 보기, 발음 듣기, 발음 평가(크롬)
- **쓰기 연습**: 섞인 글자로 단어 완성하기(스크램블)
- **단어장**: ⭐로 저장한 단어 모아 보기, PDF로 저장
- **듣기 퀴즈**: 발음을 듣고 그림 4개 중 고르기
- **복습**: 틀린 단어 자동 수집, 간격 반복(1일 → 3일 → 7일…)으로 오늘의 복습
- **선생님 도구**: 전자칠판용 수업 모드, 인쇄용 학습지(그림 보고 쓰기·따라 쓰기·짝짓기)
- **예문**: 단어마다 교과서 표현 수준의 예문과 해석, 문장 듣기
- **앱 설치(PWA)**: 홈 화면에 설치, 한 번 본 회차는 오프라인에서도 열림
- **학급 현황판**: 학생은 학급 코드·번호·별명으로 참여, 선생님은 학생별 학습량·연속일·약한 단어, 회차별 정답률, 자주 틀리는 단어 확인

배포 주소: https://english-voca-note-app.pages.dev

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
npm run deploy   # 빌드 후 Cloudflare Pages 배포 (처음엔 wrangler 로그인 필요)
```

Windows에서는 `deploy_cloudflare.bat`을 더블클릭해도 배포됩니다.

## 학급 현황판 (Cloudflare D1)

API는 `functions/api/[[path]].js`(Pages Functions), 데이터베이스 구조는 `migrations/`에 있습니다.

```bash
# 로컬에서 시험하기
npx wrangler d1 migrations apply english-cbt --local
npm run build && npx wrangler pages dev dist     # http://localhost:8788

# 처음 한 번: 실제 DB에 테이블 만들기
npx wrangler d1 migrations apply english-cbt --remote  # 기존 english-cbt DB에 voca_ 테이블 추가
```

개인정보: 학생은 학급 코드·출석번호·별명만 저장하고 실명은 저장하지 않습니다.
교사 비밀번호는 PBKDF2 해시, 학생 기기 토큰은 SHA-256 해시로만 저장합니다.
학년이 끝나면 현황판의 '학급 삭제'로 모든 기록을 지울 수 있습니다.

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
| `src/utils/progress.js` | 학습 기록·간격 반복·연속 학습일 (브라우저 localStorage에 저장) |
| `src/pages/ClassMode.jsx`, `Worksheet.jsx` | 수업 모드, 학습지 |
| `src/pages/MyClass.jsx`, `Teacher.jsx` | 우리 반 참여(학생), 학급 현황판(교사) |
| `src/utils/classSync.js` | 학급 참여 정보, 채점 기록 대기열·전송 |
| `functions/api/`, `migrations/`, `wrangler.toml` | 현황판 API, D1 구조, Cloudflare 설정 |
| `public/sw.js`, `public/manifest.webmanifest` | 오프라인 캐시, 앱 설치 정보 |
| `data/vocab/` | 원본 어휘 목록 (학년/학기·주제·어휘·뜻, 탭 구분) |
| `data/vocab/examples.tsv` | 예문 원본 (en, ex, exKo) — 고친 뒤 `python3 scripts/merge_examples.py` |
| `data/image-lists/` | 이미지 작업용 파일 목록 |
| `native/` | Expo(React Native) 앱 — 예전 어휘 세트를 사용 중 |

## 어휘 데이터 형식

```json
{ "id": 2, "name": "사물", "grade": "3학년 1학기", "category": "사물",
  "words": [{ "en": "bag", "ko": "가방", "img": "<파일명 base64>",
               "ex": "This is my bag.", "exKo": "이것은 내 가방이야." }] }
```

`en`에 `P.E. (physical education)`, `there is / there are`처럼 괄호나 `/`가 있으면,
쓰기 연습과 발음 평가는 괄호 앞 핵심어와 `/`로 나뉜 각 표현을 정답으로 인정합니다.
