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

set TARGET_DIR=%USERPROFILE%\.antigravity-ide\extensions\leegunhee.quick-search-lgh-0.1.1

echo [1/3] 대상 디렉토리 생성 중...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/3] 파일 복사 중...
xcopy /Y /S /E "out" "%TARGET_DIR%\out\"
copy /Y "package.json" "%TARGET_DIR%\"
if exist "icon.png" copy /Y "icon.png" "%TARGET_DIR%\"
if exist "README.md" copy /Y "README.md" "%TARGET_DIR%\"
if exist "sample.gif" copy /Y "sample.gif" "%TARGET_DIR%\"

echo [3/3] 배포 완료!
echo 변경 사항을 적용하려면 기존에 열려있던 Quick Search 탭을 닫고,
echo 단축키(Ctrl+Shift+L)로 검색 창을 다시 실행해 주세요!
echo ==================================================

