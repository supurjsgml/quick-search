@echo off
chcp 65001 > nul
echo ==================================================
echo VS Code Quick Search Extension 로컬 배포 스크립트
echo ==================================================

echo [0/3] TypeScript 컴파일 중...
call npm run compile
if %ERRORLEVEL% neq 0 (
    echo [오류] 컴파일에 실패했습니다. 배포를 중단합니다.
    pause
    exit /b %ERRORLEVEL%
)

set TARGET_DIR=%USERPROFILE%\.antigravity-ide\extensions\antigravity.quick-search

echo [1/3] 대상 디렉토리 생성 중...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/3] 파일 복사 중...
xcopy /Y /S /E "out" "%TARGET_DIR%\out\"
copy /Y "package.json" "%TARGET_DIR%\"

echo [3/3] 배포 완료!
echo 배포가 성공적으로 완료되었습니다.
echo 변경 사항을 적용하려면 개발자 도구에서 'Developer: Reload Window'를 실행하거나,
echo 안티그래비티(VS Code)를 완전히 종료 후 다시 시작해 주세요.
echo ==================================================

