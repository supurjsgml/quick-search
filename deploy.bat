@echo off
chcp 65001 > nul
echo ==================================================
echo VS Code Quick Search Extension 로컬 배포 스크립트
echo ==================================================

set TARGET_DIR=%USERPROFILE%\.antigravity-ide\extensions\antigravity.quick-search

echo [1/3] 대상 디렉토리 생성 중...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/3] 파일 복사 중...
xcopy /Y /S /E "out" "%TARGET_DIR%\out\"
copy /Y "package.json" "%TARGET_DIR%\"

echo [3/3] 배포 완료!
echo 배포가 성공적으로 완료되었습니다.
echo 변경 사항을 적용하려면 안티그래비티(VS Code)를 완전히 종료 후 다시 시작해 주세요.
echo ==================================================
