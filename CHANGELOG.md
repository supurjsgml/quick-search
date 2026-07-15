# Changelog

## 0.2.0
* **Korean**:
  * 검색 성능 최적화: 동시 파일 읽기 개수 제한(30개 동시성 풀) 및 1차 스크리닝 매칭 필터링 방식을 도입하여, 대규모 회사 프로젝트에서도 디스크 과부하 및 CPU 렉 없이 초고속 검색이 가능하도록 개선 (과연 그럴까?)
* **English**:
  * Search performance optimization: Introduced concurrency-limited I/O (30 active file reads) and first-stage screening filters to drastically reduce disk overhead and CPU lag in large projects. (I wonder if it really will)

## 0.1.5
* **Korean**:
  * 특수문자 및 따옴표 기호 검색 버그 픽: 중괄호(`{`, `}`), 대괄호(`[`, `]`), 따옴표(`"`, `'`) 등 특수 기호가 단독 혹은 감싸져서 포함된 키워드 검색 시의 백엔드 검색 누락 및 화면 하이라이트 매칭 오작동 버그 해결
  * 창 닫기 시 포커스 복원: 퀵서치 웹뷰를 열었다가 검색 없이 ESC 키로 닫았을 때, 이전에 편집 중이던 텍스트 에디터 창으로 키보드 포커스가 자동으로 복원되도록 개선
* **English**:
  * Special symbol & Quote search bug fix: Resolved search omissions and webview highlighting malfunctions when searching for keywords containing brackets (`{`, `}`, `[`, `]`) or quotation marks (`"`, `'`).
  * Restore focus on close: Automatically restores keyboard focus to the previously active editor when closing the search panel.

## 0.1.4
* **Korean**:
  * 배포 용량 최적화: 대용량 데모 GIF(`sample.gif`)를 패키지 빌드에서 제외하여 VSIX 크기 대폭 감소
* **English**:
  * Package size optimization: Excluded large demo GIF (`sample.gif`) from the package to reduce VSIX file size

## 0.1.3
* **Korean**:
  * 퀵서치 자동 포커스 개선: 드래그된 텍스트가 없는 상태로 창을 열 때 검색 입력창에 포커스가 자동 지정되도록 수정
  * 웹뷰 소스 코드 분리 및 모듈화
  * 웹뷰 에러 예외 처리 보강: 리소스 로드 실패 시 웹뷰 상에 에러 내용이 바로 출력되도록 개선
  * README.md 다국어 설명 보강: 한국어와 영어 두 가지 언어만 공식 지원함을 명시
* **English**:
  * Improved auto-focus: Focus automatically transitions to the search input when opened without text selection
  * Webview source code separation and modularity
  * Resource load error handling: Prints error message visually on webview if resource loading fails
  * README.md update: Specified that only English and Korean languages are officially supported

## 0.1.1
* 라이트 테마 CSS 추가 / Added light theme CSS
