-- 학급 현황판 데이터베이스 (Cloudflare D1)
-- 개인정보 최소화: 학생은 학급 코드 + 출석번호 + 별명만 저장 (실명 저장 안 함)

CREATE TABLE classes (
  code TEXT PRIMARY KEY,             -- 학생에게 알려 주는 6자리 학급 코드
  name TEXT NOT NULL,                -- 예: "4학년 2반"
  teacher_hash TEXT NOT NULL,        -- 교사 비밀번호 PBKDF2 해시
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_code TEXT NOT NULL REFERENCES classes(code) ON DELETE CASCADE,
  number INTEGER NOT NULL,           -- 출석번호
  nickname TEXT NOT NULL,            -- 학생이 정한 별명
  created_at INTEGER NOT NULL,
  UNIQUE (class_code, number)
);

-- 기기마다 하나씩 발급하는 학생 토큰 (해시만 저장)
CREATE TABLE student_tokens (
  token_hash TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

-- 채점 기록 한 건 = 한 줄
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  en TEXT NOT NULL,                  -- 단어
  round_id INTEGER,                  -- 회차 (복습처럼 회차가 없으면 NULL)
  correct INTEGER NOT NULL,          -- 1 맞힘, 0 틀림
  source TEXT NOT NULL,              -- listen | scramble | review | speak
  day TEXT NOT NULL,                 -- 학생 기기 기준 날짜 YYYY-MM-DD
  ts INTEGER NOT NULL
);

CREATE INDEX idx_students_class ON students(class_code);
CREATE INDEX idx_tokens_student ON student_tokens(student_id);
CREATE INDEX idx_events_student_day ON events(student_id, day);
