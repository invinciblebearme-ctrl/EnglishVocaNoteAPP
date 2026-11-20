@echo off
chcp 65001 >nul
echo ==============================================
echo [EnglishVocaNoteAPP] Cloudflare Pages 배포 시작
echo ==============================================

echo 빌드 및 Cloudflare Pages 배포 중... (처음 실행 시 wrangler 로그인 창이 열릴 수 있습니다)
call npm run deploy
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
