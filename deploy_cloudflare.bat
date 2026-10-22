@echo off
chcp 65001 >nul
echo ==============================================
echo [EnglishVocaNoteAPP] Cloudflare Pages 배포 시작
echo ==============================================

echo 1. 빌드 실행 중...
call npm run build
if %errorlevel% neq 0 (
    echo [오류] 빌드에 실패했습니다.
    pause
    exit /b %errorlevel%
)

echo 2. Cloudflare Pages 배포 중...
call "c:\Users\user\.gemini\antigravity-ide\scratch\pdfviewer\node_modules\.bin\wrangler.cmd" pages deploy dist --project-name english-voca-note-app --branch main --commit-dirty=true
if %errorlevel% neq 0 (
    echo [오류] 배포에 실패했습니다.
    pause
    exit /b %errorlevel%
)

echo ==============================================
echo [완료] 웹 게시가 성공적으로 완료되었습니다!
echo 접속 주소: https://english-voca-note-app.pages.dev
echo ==============================================
pause
