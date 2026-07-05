export function getWebviewContent(initialQuery: string = '', locale: string = 'en', defaultStyle: string = 'intellij', defaultDockMode: boolean = false): string {
    // HTML 이스케이프 (인풋 태그 내 주입 시 깨짐 방지)
    const escapedQuery = initialQuery
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 언어별 번역 사전 정의
    const translations: Record<string, any> = {
        ko: {
            title: "Quick Search",
            searchPatternLabel: "검색 패턴 (대소문자 구분 없음)",
            searchPlaceholder: "검색할 패턴을 입력하세요...",
            fileNameFilterLabel: "파일명 필터 (예: *.java, src/)",
            fileNameFilterPlaceholder: "예: *.java",
            initialMessage: "검색어를 입력해 주세요. (ESC를 누르면 창이 닫힙니다)",
            noResults: "검색 결과가 없습니다.",
            noFileSelected: "선택된 파일 없음",
            previewPlaceholder: "// 항목을 선택하면 코드가 여기에 미리보기로 표시됩니다",
            statusBarHelp: "ESC: 닫기 | ↑/↓: 이동 | Enter: 파일 열기",
            searching: "검색 중...",
            ready: "준비 완료",
            foundMatches: "개의 검색 결과 발견",
            noMatchesFound: "일치하는 결과가 없습니다",
            scopeInProject: "프로젝트 내",
            scopeModule: "모듈",
            scopeDirectory: "디렉터리",
            scopeScope: "범위",
            scopeOptAll: "모든 위치",
            scopeOptProjectFiles: "프로젝트 파일",
            scopeOptProductionFiles: "프로젝트 프로덕션 파일",
            scopeOptTestFiles: "프로젝트 테스트 파일",
            scopeOptOpenFiles: "최근에 본 파일 (열린 파일)",
            keepOpen: "화면 분할"
        },
        en: {
            title: "Quick Search",
            searchPatternLabel: "Search Pattern (Case Insensitive)",
            searchPlaceholder: "Type pattern to search...",
            fileNameFilterLabel: "File Name Filter (e.g. *.java, src/)",
            fileNameFilterPlaceholder: "e.g. *.java",
            initialMessage: "Please enter a search term. (Press ESC to close)",
            noResults: "No matches found.",
            noFileSelected: "No File Selected",
            previewPlaceholder: "// Select an item to preview code",
            statusBarHelp: "ESC: Close | Arrow Up/Down: Navigate | Enter: Open File",
            searching: "Searching...",
            ready: "Ready",
            foundMatches: " match(es) found",
            noMatchesFound: "No matches found",
            scopeInProject: "In Project",
            scopeModule: "Module",
            scopeDirectory: "Directory",
            scopeScope: "Scope",
            scopeOptAll: "All Places",
            scopeOptProjectFiles: "Project Files",
            scopeOptProductionFiles: "Project Production Files",
            scopeOptTestFiles: "Project Test Files",
            scopeOptOpenFiles: "Recently Viewed Files (Open Files)",
            keepOpen: "Keep Open"
        }
    };

    const lang = locale.startsWith('ko') ? 'ko' : 'en';
    const t = translations[lang];

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <title>${t.title}</title>
    <style>
        body {
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
            font-size: var(--vscode-font-size, 13px);
            margin: 0;
            padding: 10px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
            overflow: hidden;
        }

        /* 검색 입력 창 */
        .search-area {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: center;
        }
        .search-box-wrapper {
            flex: 2;
            display: flex;
            flex-direction: column;
        }
        .filter-box-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground, #8c8c8c);
            margin-bottom: 4px;
            text-transform: uppercase;
            font-weight: bold;
        }
        input[type="text"] {
            background-color: var(--vscode-input-background, #3c3c3c);
            color: var(--vscode-input-foreground, #cccccccc);
            border: 1px solid var(--vscode-input-border, #3c3c3c);
            padding: 6px 8px;
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
            outline: none;
        }
        input[type="text"]:focus {
            border-color: var(--vscode-focusBorder, #007acc);
        }

        /* 결과 그리드 테이블 */
        .grid-area {
            flex: 1;
            border: 1px solid var(--vscode-panel-border, #80808050);
            border-radius: 2px;
            overflow-y: auto;
            background-color: var(--vscode-list-dropBackground, #252526);
            min-height: 100px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            table-layout: fixed;
        }
        th, td {
            padding: 6px 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border-right: 1px solid var(--vscode-panel-border, #80808020);
        }
        th:last-child, td:last-child {
            border-right: none;
        }
        th {
            background-color: var(--vscode-titleBar-activeBackground, #2d2d2d);
            color: var(--vscode-titleBar-activeForeground, #cccccc);
            position: sticky;
            top: 0;
            z-index: 10;
            font-weight: bold;
            border-bottom: 1px solid var(--vscode-panel-border, #80808050);
        }
        tr {
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border, #8080801a);
        }
        tr:hover {
            background-color: var(--vscode-list-hoverBackground, #2a2d2e);
        }
        tr.selected {
            background-color: var(--vscode-list-activeSelectionBackground, #04395e) !important;
            color: var(--vscode-list-activeSelectionForeground, #ffffff) !important;
        }
        .col-line { 
            width: 70px; 
            text-align: right; 
            color: var(--vscode-editorLineNumber-foreground, #858585); 
            position: relative; 
            padding-right: 15px; 
        }
        .col-text { 
            width: auto; 
            font-family: var(--vscode-editor-font-family, Consolas, monospace); 
            position: relative; 
            padding-left: 15px; 
        }
        .col-path { 
            width: 180px; 
            color: var(--vscode-descriptionForeground, #8c8c8c); 
            font-size: 11px; 
            position: relative; 
        }

        tr.selected .col-line, tr.selected .col-path {
            color: inherit;
        }

        /* 가로 열 크기 조절용 핸들 */
        .col-resizer {
            position: absolute;
            top: 0;
            right: -4px;
            width: 8px;
            cursor: col-resize;
            user-select: none;
            height: 100%;
            z-index: 12;
            background-color: transparent;
        }
        .col-resizer:hover, .col-resizer.resizing {
            background-color: var(--vscode-focusBorder, #007acc);
        }

        /* 세로 크기 조절바 (Resizer Splitter) */
        .resizer {
            height: 6px;
            background-color: var(--vscode-panel-border, #80808030);
            cursor: ns-resize;
            transition: background-color 0.2s;
            margin: 3px 0;
            border-radius: 1px;
            flex-shrink: 0;
        }
        .resizer:hover, .resizer.active {
            background-color: var(--vscode-focusBorder, #007acc);
        }

        /* 소스 미리보기 패널 */
        .preview-area {
            height: 250px;
            border: 1px solid var(--vscode-panel-border, #80808050);
            border-radius: 2px;
            display: flex;
            flex-direction: column;
            background-color: var(--vscode-editor-background, #1e1e1e);
            flex-shrink: 0;
        }
        .preview-header {
            background-color: var(--vscode-editorWidget-background, #252526);
            padding: 6px 10px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground, #8c8c8c);
            border-bottom: 1px solid var(--vscode-panel-border, #80808050);
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .preview-body {
            flex: 1;
            overflow: auto;
            margin: 0;
            padding: 10px;
            font-family: var(--vscode-editor-font-family, Consolas, monospace);
            font-size: var(--vscode-editor-font-size, 12px);
            line-height: 1.5;
            white-space: pre;
        }
        /* 일반 미리보기 줄 및 code 태그 배경 투명화 및 글자색 상속 */
        .preview-body code,
        .preview-body span {
            background-color: transparent !important;
            background: none !important;
            color: inherit !important;
        }
        /* 선택된 타겟 줄 하이라이트 */
        .preview-body span.highlight-line {
            background-color: var(--vscode-editor-wordHighlightBackground, #57575740) !important;
            display: inline-block;
            width: 100%;
            font-weight: bold;
            border-left: 3px solid var(--vscode-focusBorder, #007acc) !important;
            padding-left: 2px;
        }
        /* 매칭된 검색 키워드 하이라이트 */
        .preview-body span.match-term {
            background-color: var(--vscode-editor-findMatchHighlightBackground, #ea5c0050) !important;
            border-bottom: 1px solid var(--vscode-editor-findMatchBorder, #ea5c00) !important;
            border-radius: 1px;
        }
        .status-bar {
            margin-top: 6px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground, #8c8c8c);
            display: flex;
            justify-content: space-between;
        }

        /* IntelliJ Style 오버라이드 */
        /* IntelliJ Style 레이아웃 공통 규칙 */
        .intellij-style thead {
            display: none;
        }
        .intellij-style tr {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding: 6px 15px;
        }

        /* --- IntelliJ 스타일 기본 색상 (0.1.0 Darcula 롤백) --- */
        .intellij-style {
            background-color: #2b2b2b;
            color: #a9b7c6;
        }
        .intellij-style input[type="text"] {
            background-color: #3c3f41;
            color: #bbbbbb;
            border: 1px solid #646464;
            border-radius: 3px;
        }
        .intellij-style input[type="text"]:focus {
            border-color: #3b72ab;
        }
        .intellij-style .grid-area {
            background-color: #2b2b2b;
            border: 1px solid #323232;
        }
        .intellij-style tr {
            border-bottom: 1px solid #323232;
        }
        .intellij-style tr:hover {
            background-color: #2f3032;
        }
        .intellij-style tr.selected {
            background-color: #244161 !important;
            color: #bbbbbb !important;
        }

        /* --- 라이트 모드 하에서의 IntelliJ 스타일 색상 --- */
        .vscode-light.intellij-style {
            background-color: #f7f8fa;
            color: #1f2226;
        }
        .vscode-light.intellij-style input[type="text"] {
            background-color: #ffffff;
            color: #1f2226;
            border: 1px solid #d3d5db;
            border-radius: 3px;
        }
        .vscode-light.intellij-style input[type="text"]:focus {
            border-color: #3574f0;
        }
        .vscode-light.intellij-style .grid-area {
            background-color: #ffffff;
            border: 1px solid #d3d5db;
        }
        .vscode-light.intellij-style tr {
            border-bottom: 1px solid #d3d5db;
        }
        .vscode-light.intellij-style tr:hover {
            background-color: #f0f1f5;
        }
        .vscode-light.intellij-style tr.selected {
            background-color: #e4efff !important;
            color: #1f2226 !important;
        }
        .intellij-row-left {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: var(--vscode-editor-font-family, Consolas, monospace);
            padding-right: 15px;
            text-align: left;
        }
        .intellij-row-right {
            flex-shrink: 0;
            color: #787878;
            font-size: 11px;
            text-align: right;
        }
        .intellij-style tr.selected .intellij-row-right {
            color: #a9b7c6;
        }
        
        /* --- IntelliJ 스타일 미리보기 영역 (0.1.0 Darcula 롤백) --- */
        .intellij-style .preview-area {
            background-color: #2b2b2b;
            border: 1px solid #323232;
        }
        .intellij-style .preview-header {
            background-color: #3c3f41;
            color: #a9b7c6;
            border-bottom: 1px solid #323232;
        }
        .intellij-style .preview-body {
            background-color: #2b2b2b;
            color: #a9b7c6;
        }
        .intellij-style .preview-body span {
            color: #a9b7c6 !important;
        }
        .intellij-style .preview-body span.highlight-line {
            background-color: #214283 !important;
            border-left: 3px solid #3b72ab !important;
            color: #a9b7c6 !important;
        }

        .vscode-dark.eclipse-style .preview-area {
            background-color: #1e1e1e;
            border: 1px solid var(--vscode-panel-border, #80808050);
        }
        .vscode-dark.eclipse-style .preview-header {
            background-color: var(--vscode-editorWidget-background, #252526);
            color: #d4d4d4;
            border-bottom: 1px solid var(--vscode-panel-border, #80808050);
        }
        .vscode-dark.eclipse-style .preview-body {
            background-color: #1e1e1e;
            color: #d4d4d4;
        }
        .vscode-dark.eclipse-style .preview-body span {
            color: #d4d4d4 !important;
        }
        .vscode-dark.eclipse-style .preview-body span.highlight-line {
            background-color: var(--vscode-editor-wordHighlightBackground, #57575740) !important;
            border-left: 3px solid var(--vscode-focusBorder, #007acc) !important;
            color: #ffffff !important;
        }

        /* --- 라이트 모드(화이트 모드) 전용 스타일 오버라이드 --- */
        .vscode-light.intellij-style .preview-area {
            background-color: #ffffff;
            border: 1px solid #d3d5db;
        }
        .vscode-light.intellij-style .preview-header {
            background-color: #ebecf0;
            color: #1f2226;
            border-bottom: 1px solid #d3d5db;
        }
        .vscode-light.intellij-style .preview-body {
            background-color: #ffffff;
            color: #1f2226;
        }
        .vscode-light.intellij-style .preview-body span {
            color: #1f2226 !important;
        }
        .vscode-light.intellij-style .preview-body span.highlight-line {
            background-color: #e4efff !important;
            border-left: 3px solid #3574f0 !important;
            color: #000000 !important;
        }

        .vscode-light.eclipse-style .preview-area {
            background-color: #ffffff;
            border: 1px solid var(--vscode-panel-border, #80808050);
        }
        .vscode-light.eclipse-style .preview-header {
            background-color: #f3f3f3;
            color: #333333;
            border-bottom: 1px solid var(--vscode-panel-border, #80808050);
        }
        .vscode-light.eclipse-style .preview-body {
            background-color: #ffffff;
            color: #333333;
        }
        .vscode-light.eclipse-style .preview-body span {
            color: #333333 !important;
        }
        .vscode-light.eclipse-style .preview-body span.highlight-line {
            background-color: #ffe3e3 !important;
            border-left: 3px solid #ff4d4d !important;
            color: #000000 !important;
        }
        
        /* 이클립스 모드 라이트 테마 선택 행 및 테이블 배경 통일 */
        .vscode-light.eclipse-style .grid-area {
            background-color: #ffffff !important;
        }
        .vscode-light.eclipse-style tr:hover {
            background-color: #f0f1f5 !important;
        }
        .vscode-light.eclipse-style tr.selected {
            background-color: #e4efff !important;
            color: #1f2226 !important;
        }
        
        /* 범위 탭 및 스타일 스위처 디자인 */
        .scope-tabs {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border, #80808030);
            padding-bottom: 6px;
            flex-shrink: 0;
        }
        .tabs-left {
            display: flex;
            gap: 4px;
        }
        .tabs-right {
            display: flex;
            gap: 4px;
            margin-left: auto;
        }
        /* 스타일 모드에 따른 범위 탭 노출 여부 제어 */
        .eclipse-style .tabs-left {
            display: none;
        }
        .intellij-style .tabs-left {
            display: flex;
        }
        /* 상세 검색 옵션 UI 스타일 */
        .scope-select {
            background-color: var(--vscode-input-background, #3c3c3c);
            color: var(--vscode-input-foreground, #cccccc);
            border: 1px solid var(--vscode-input-border, #3c3c3c);
            padding: 4px 6px;
            font-size: 11px;
            border-radius: 2px;
            font-family: inherit;
            outline: none;
            max-width: 320px;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }
        .scope-select:focus {
            border-color: var(--vscode-focusBorder, #007acc);
        }
        .browse-btn {
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
        }
        .browse-btn:hover {
            background-color: var(--vscode-button-hoverBackground, #118ad4);
        }
        .intellij-style .scope-select {
            background-color: #3b3f41;
            color: #bbbbbb;
            border: 1px solid #646464;
            border-radius: 3px;
        }
        .intellij-style .scope-select:focus {
            border-color: #3b72ab;
        }
        .intellij-style .browse-btn {
            background-color: #3b3f41;
            color: #bbbbbb;
            border: 1px solid #646464;
            border-radius: 3px;
        }
        .intellij-style .browse-btn:hover {
            background-color: #4c5052;
        }

        .vscode-light.intellij-style .scope-select {
            background-color: #ffffff;
            color: #1f2226;
            border: 1px solid #d3d5db;
            border-radius: 3px;
        }
        .vscode-light.intellij-style .scope-select:focus {
            border-color: #3574f0;
        }
        .vscode-light.intellij-style .browse-btn {
            background-color: #ffffff;
            color: #1f2226;
            border: 1px solid #d3d5db;
            border-radius: 3px;
        }
        .vscode-light.intellij-style .browse-btn:hover {
            background-color: #f0f1f5;
        }
        .eclipse-style #scope-details-area {
            display: none !important;
        }
        .tab-btn {
            background: transparent;
            border: 1px solid transparent;
            color: var(--vscode-descriptionForeground, #8c8c8c);
            padding: 4px 10px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 11px;
        }
        .tab-btn:hover {
            background-color: var(--vscode-list-hoverBackground, #2a2d2e);
        }
        .tab-btn.active {
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #ffffff);
            font-weight: bold;
        }
        .style-toggle-btn {
            background: transparent;
            border: 1px solid var(--vscode-panel-border, #80808030);
            color: var(--vscode-descriptionForeground, #8c8c8c);
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 11px;
            transition: all 0.2s;
        }
        .style-toggle-btn:hover {
            border-color: var(--vscode-focusBorder, #007acc);
            color: var(--vscode-foreground, #ffffff);
        }
        .style-toggle-btn.active {
            background-color: var(--vscode-button-background, #007acc) !important;
            color: var(--vscode-button-foreground, #ffffff) !important;
            border: 1px solid var(--vscode-button-background, #007acc) !important;
            font-weight: bold;
        }
        .intellij-style .style-toggle-btn {
            background-color: #3b3f41;
            color: #bbbbbb;
            border: 1px solid #646464;
        }
        .intellij-style .style-toggle-btn:hover {
            background-color: #4c5052;
        }
        .intellij-style .style-toggle-btn.active {
            background-color: #244161 !important;
            color: #bbbbbb !important;
            border-color: #3b72ab !important;
        }

        .vscode-light.intellij-style .style-toggle-btn {
            background-color: #ffffff;
            color: #1f2226;
            border: 1px solid #d3d5db;
        }
        .vscode-light.intellij-style .style-toggle-btn:hover {
            background-color: #f0f1f5;
        }
        .vscode-light.intellij-style .style-toggle-btn.active {
            background-color: #e4efff !important;
            color: #3574f0 !important;
            border-color: #3574f0 !important;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <!-- 검색 입력 영역 -->
    <div class="search-area">
        <div class="search-box-wrapper">
            <span class="label">${t.searchPatternLabel}</span>
            <input type="text" id="search-input" placeholder="${t.searchPlaceholder}" autocomplete="off" value="${escapedQuery}">
        </div>
        <div class="filter-box-wrapper">
            <span class="label">${t.fileNameFilterLabel}</span>
            <input type="text" id="filter-input" placeholder="${t.fileNameFilterPlaceholder}" autocomplete="off">
        </div>
    </div>

    <!-- 범위 탭 및 테마 토글 바 -->
    <div class="scope-tabs">
        <div class="tabs-left" id="search-scope-tabs">
            <button class="tab-btn active" data-scope="project">${t.scopeInProject}</button>
            <button class="tab-btn" data-scope="module">${t.scopeModule}</button>
            <button class="tab-btn" data-scope="directory">${t.scopeDirectory}</button>
            <button class="tab-btn" data-scope="scope">${t.scopeScope}</button>
        </div>
        
        <!-- 동적 탭 보조 상세 컨트롤 영역 -->
        <div id="scope-details-area" style="display: flex; align-items: center; gap: 6px; margin-left: 12px; flex: 1;">
            <!-- 모듈 선택용 드롭다운 (Module 모드 시 노출) -->
            <select id="module-select" class="scope-select" style="display: none;"></select>

            <!-- 디렉터리 선택용 드롭다운 및 찾아보기 버튼 (Directory 모드 시 노출) -->
            <div id="directory-input-wrapper" style="display: none; align-items: center; gap: 4px; flex: 1; max-width: 400px;">
                <select id="directory-select" class="scope-select" style="flex: 1; max-width: 320px;"></select>
                <button id="directory-browse-btn" class="browse-btn">...</button>
            </div>

            <!-- 범위 선택용 드롭다운 (Scope 모드 시 노출) -->
            <select id="scope-select" class="scope-select" style="display: none;">
                <option value="all" selected>${t.scopeOptAll}</option>
                <option value="project_files">${t.scopeOptProjectFiles}</option>
                <option value="production_files">${t.scopeOptProductionFiles}</option>
                <option value="test_files">${t.scopeOptTestFiles}</option>
                <option value="open_files">${t.scopeOptOpenFiles}</option>
            </select>
        </div>

        <div class="tabs-right">
            <button class="style-toggle-btn" id="btn-keep-open">${t.keepOpen}</button>
            <button class="style-toggle-btn" id="style-intellij">IntelliJ</button>
            <button class="style-toggle-btn" id="style-eclipse">Eclipse</button>
        </div>
    </div>

    <!-- 검색 결과 목록 -->
    <div class="grid-area">
        <table>
            <thead>
                <tr>
                    <th class="col-line">Line<div class="col-resizer"></div></th>
                    <th class="col-text">Text<div class="col-resizer"></div></th>
                    <th class="col-path">Path<div class="col-resizer"></div></th>
                </tr>
            </thead>
            <tbody id="results-body">
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">
                        ${t.initialMessage}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- 크기 조절 스플리터 -->
    <div class="resizer" id="resizer"></div>

    <!-- 소스 미리보기 -->
    <div class="preview-area" id="preview-area">
        <div class="preview-header" id="preview-file-path">${t.noFileSelected}</div>
        <pre class="preview-body"><code id="preview-content">${t.previewPlaceholder}</code></pre>
    </div>

    <!-- 상태 바 -->
    <div class="status-bar">
        <span id="status-text">${t.ready}</span>
        <span>${t.statusBarHelp}</span>
    </div>

    <script>
        const lang = "${lang}";
        const t = ${JSON.stringify(t)};
        const vscode = acquireVsCodeApi();
        const searchInput = document.getElementById('search-input');
        const filterInput = document.getElementById('filter-input');
        const resultsBody = document.getElementById('results-body');
        const previewArea = document.getElementById('preview-area');
        const previewFilePath = document.getElementById('preview-file-path');
        const previewContent = document.getElementById('preview-content');
        const statusText = document.getElementById('status-text');
        const resizer = document.getElementById('resizer');

        let searchDebounceTimer;
        let selectedIndex = -1;
        let resultsData = [];
        let userPreviewHeight = 250;
        let isCompactMode = false;
        let currentStyle = 'intellij';
        let currentScope = 'project';
        let dockMode = false;

        const moduleSelect = document.getElementById('module-select');
        const directoryWrapper = document.getElementById('directory-input-wrapper');
        const directorySelect = document.getElementById('directory-select');
        const directoryBrowseBtn = document.getElementById('directory-browse-btn');
        const scopeSelect = document.getElementById('scope-select');

        // 스타일 모드 변경 함수 정의
        const btnIntellij = document.getElementById('style-intellij');
        const btnEclipse = document.getElementById('style-eclipse');
        const btnKeepOpen = document.getElementById('btn-keep-open');

        btnIntellij.addEventListener('click', () => setStyleMode('intellij'));
        btnEclipse.addEventListener('click', () => setStyleMode('eclipse'));
        btnKeepOpen.addEventListener('click', () => {
            setDockMode(!dockMode);
        });

        // 범위 탭 클릭 이벤트 및 상태 제어
        const scopeTabContainer = document.getElementById('search-scope-tabs');
        const scopeButtons = scopeTabContainer.querySelectorAll('.tab-btn');

        scopeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const newScope = btn.getAttribute('data-scope');
                setSearchScope(newScope);
            });
        });

        // 상세 컨트롤 변경 이벤트 바인딩
        moduleSelect.addEventListener('change', () => {
            saveState();
            if (searchInput.value.trim()) triggerSearch();
        });
        directorySelect.addEventListener('change', () => {
            saveState();
            if (searchInput.value.trim()) triggerSearch();
        });
        scopeSelect.addEventListener('change', () => {
            saveState();
            if (searchInput.value.trim()) triggerSearch();
        });

        // 디렉터리 찾아보기 버튼 클릭 이벤트
        directoryBrowseBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'browseDirectory' });
        });

        function saveState() {
            vscode.setState({ 
                currentStyle: currentStyle, 
                userPreviewHeight: userPreviewHeight, 
                currentScope: currentScope,
                selectedModule: moduleSelect.value,
                selectedDirectory: directorySelect.value,
                selectedScopeDetail: scopeSelect.value,
                dockMode: dockMode
            });
        }

        function setDockMode(active) {
            dockMode = active;
            if (active) {
                btnKeepOpen.classList.add('active');
            } else {
                btnKeepOpen.classList.remove('active');
            }
            saveState();
            vscode.postMessage({
                command: 'saveDockMode',
                dockMode: active
            });
        }

        function setSearchScope(scope) {
            currentScope = scope;
            scopeButtons.forEach(btn => {
                if (btn.getAttribute('data-scope') === scope) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // 상세 제어 노출 토글
            moduleSelect.style.display = (scope === 'module') ? 'block' : 'none';
            directoryWrapper.style.display = (scope === 'directory') ? 'flex' : 'none';
            scopeSelect.style.display = (scope === 'scope') ? 'block' : 'none';

            // 상태 보존 저장
            saveState();

            // 검색어 입력값이 있으면 즉시 검색
            if (searchInput.value.trim()) {
                triggerSearch();
            }
        }

        // 디렉토리 셀렉트 박스에 항목 추가 헬퍼 함수
        function addDirectoryToSelect(dirPath) {
            if (!dirPath) return;
            let exists = false;
            for (let i = 0; i < directorySelect.options.length; i++) {
                if (directorySelect.options[i].value === dirPath) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = dirPath;
                opt.textContent = dirPath;
                directorySelect.appendChild(opt);
            }
        }

        function setStyleMode(mode) {
            currentStyle = mode;
            if (mode === 'intellij') {
                document.body.classList.remove('eclipse-style');
                document.body.classList.add('intellij-style');
                btnIntellij.classList.add('active');
                btnEclipse.classList.remove('active');
            } else {
                document.body.classList.remove('intellij-style');
                document.body.classList.add('eclipse-style');
                btnEclipse.classList.add('active');
                btnIntellij.classList.remove('active');
            }
            
            // 상태 보존 저장
            saveState();
            
            // 백엔드에 글로벌 설정 저장 요청
            vscode.postMessage({
                command: 'saveStyleMode',
                style: mode
            });
            
            // 결과 렌더링 갱신
            if (resultsData.length > 0) {
                renderResults();
            }
        }

        function adjustLayout() {
            const count = resultsData.length;
            const gridArea = document.querySelector('.grid-area');
            const previewArea = document.getElementById('preview-area');
            const resizer = document.getElementById('resizer');

            // 공통 레이아웃 초기화 (하단 빈 공간 방지 및 리사이저 항상 표시)
            resizer.style.display = 'block';
            gridArea.style.flex = '1 1 0%';
            gridArea.style.height = 'auto';
            previewArea.style.flex = '0 0 auto';

            if (count >= 1 && count <= 5) {
                isCompactMode = true;
                // 기본 높이일 경우 화면 절반 크기 지정, 이미 조절한 이력이 있으면 해당 높이 유지
                if (userPreviewHeight === 250) {
                    previewArea.style.height = '50vh';
                } else {
                    previewArea.style.height = userPreviewHeight + 'px';
                }
            } else {
                isCompactMode = false;
                previewArea.style.height = userPreviewHeight + 'px';
            }
            
            // 상태 보존 저장
            saveState();
        }

        // 포커스 자동 지정
        searchInput.focus();

        // 실시간 입력 이벤트 리스너
        searchInput.addEventListener('input', triggerSearch);
        filterInput.addEventListener('input', triggerSearch);

        function triggerSearch() {
            const query = searchInput.value;
            const filter = filterInput.value;
            
            clearTimeout(searchDebounceTimer);
            
            if (!query.trim()) {
                resultsData = [];
                renderResults();
                clearPreview();
                statusText.innerText = t.ready;
                return;
            }

            statusText.innerText = t.searching;
            // 200ms 디바운스
            searchDebounceTimer = setTimeout(() => {
                vscode.postMessage({
                    command: 'search',
                    query: query,
                    filter: filter,
                    scope: currentScope,
                    moduleValue: moduleSelect.value,
                    directoryValue: directorySelect.value,
                    scopeValue: scopeSelect.value
                });
            }, 200);
        }

        // 백엔드(Extension)로부터 수신된 결과 처리
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'searchResults':
                    resultsData = message.data;
                    renderResults();
                    break;
                case 'previewContent':
                    renderPreview(message.path, message.content, message.line, message.query);
                    break;
                case 'setQuery':
                    searchInput.value = message.text;
                    triggerSearch();
                    searchInput.focus();
                    searchInput.select(); // 포커스 및 전체 선택
                    break;
                case 'initScopeData':
                    // 모듈 채우기
                    moduleSelect.innerHTML = '';
                    if (message.modules && message.modules.length > 0) {
                        message.modules.forEach(mod => {
                            const opt = document.createElement('option');
                            opt.value = mod.value;
                            opt.textContent = mod.label;
                            moduleSelect.appendChild(opt);
                        });
                    } else {
                        const opt = document.createElement('option');
                        opt.value = '';
                        opt.textContent = '-';
                        moduleSelect.appendChild(opt);
                    }

                    // 디렉터리 이력 채우기
                    directorySelect.innerHTML = '';
                    if (message.directories && message.directories.length > 0) {
                        message.directories.forEach(dir => {
                            addDirectoryToSelect(dir);
                        });
                    }
                    
                    // 만약 복원했던 기존 선택 데이터가 있다면 셀렉트 박스값 복원
                    const restoredState = vscode.getState() || {};
                    if (restoredState.selectedModule && moduleSelect.value !== restoredState.selectedModule) {
                        moduleSelect.value = restoredState.selectedModule;
                    }
                    if (restoredState.selectedDirectory && directorySelect.value !== restoredState.selectedDirectory) {
                        addDirectoryToSelect(restoredState.selectedDirectory);
                        directorySelect.value = restoredState.selectedDirectory;
                    }
                    break;
                case 'directorySelected':
                    if (message.path) {
                        addDirectoryToSelect(message.path);
                        directorySelect.value = message.path;
                        saveState();
                        if (searchInput.value.trim()) {
                            triggerSearch();
                        }
                    }
                    break;
            }
        });

        // 결과 리스트 렌더링
        function renderResults() {
            resultsBody.innerHTML = '';
            selectedIndex = -1;

            if (resultsData.length === 0) {
                resultsBody.innerHTML = \`
                    <tr>
                        <td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">
                            \${t.noResults}
                        </td>
                    </tr>
                \`;
                statusText.innerText = t.noMatchesFound;
                clearPreview();
                return;
            }

            statusText.innerText = lang === 'ko'
                ? \`\${resultsData.length}\${t.foundMatches}\`
                : \`Found \${resultsData.length}\${t.foundMatches}\`;

            resultsData.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.dataset.index = index;

                if (currentStyle === 'intellij') {
                    // IntelliJ 스타일 렌더링 (좌측 코드, 우측 경로+라인)
                    const leftDiv = document.createElement('div');
                    leftDiv.className = 'intellij-row-left';
                    
                    const query = searchInput.value;
                    leftDiv.innerHTML = escapeHtmlAndHighlight(item.text, query);
                    
                    const rightDiv = document.createElement('div');
                    rightDiv.className = 'intellij-row-right';
                    rightDiv.textContent = \`\${item.relativePath} \${item.line}\`;
                    
                    tr.appendChild(leftDiv);
                    tr.appendChild(rightDiv);
                } else {
                    // Eclipse 스타일 렌더링 (기존 테이블 구조)
                    const tdLine = document.createElement('td');
                    tdLine.className = 'col-line';
                    tdLine.textContent = item.line;

                    const tdText = document.createElement('td');
                    tdText.className = 'col-text';
                    const query = searchInput.value;
                    tdText.innerHTML = escapeHtmlAndHighlight(item.text, query);

                    const tdPath = document.createElement('td');
                    tdPath.className = 'col-path';
                    tdPath.textContent = item.relativePath;
                    tdPath.title = item.absolutePath;

                    tr.appendChild(tdLine);
                    tr.appendChild(tdText);
                    tr.appendChild(tdPath);
                }

                // 클릭 이벤트
                tr.addEventListener('click', () => {
                    selectRow(index);
                });

                // 더블 클릭 시 파일 열기
                tr.addEventListener('dblclick', () => {
                    openFile(index);
                });

                resultsBody.appendChild(tr);
            });

            // 최초 진입 시 기본값이 이미 들어있다면 즉시 검색 실행
            if (resultsData.length > 0) {
                selectRow(0);
            }
            adjustLayout();
        }

        function selectRow(index) {
            if (index < 0 || index >= resultsData.length) return;
            
            const rows = resultsBody.querySelectorAll('tr');
            if (rows[selectedIndex]) {
                rows[selectedIndex].classList.remove('selected');
            }

            selectedIndex = index;
            const newSelectedRow = rows[selectedIndex];
            newSelectedRow.classList.add('selected');
            
            // 스크롤 동기화
            newSelectedRow.scrollIntoView({ block: 'nearest' });

            // 백엔드에 미리보기 데이터 요청
            const selectedItem = resultsData[selectedIndex];
            vscode.postMessage({
                command: 'requestPreview',
                path: selectedItem.absolutePath,
                line: selectedItem.line,
                query: searchInput.value
            });
        }

        // 파일 편집기 열기
        function openFile(index) {
            if (index < 0 || index >= resultsData.length) return;
            const item = resultsData[index];
            vscode.postMessage({
                command: 'openFile',
                path: item.absolutePath,
                line: item.line,
                query: searchInput.value,
                dockMode: dockMode
            });
        }

        function clearPreview() {
            previewFilePath.innerText = t.noFileSelected;
            previewContent.innerHTML = t.previewPlaceholder;
        }

        function renderPreview(filePath, contentLines, targetLine, query) {
            previewFilePath.innerText = filePath;
            previewFilePath.title = filePath;
            previewContent.innerHTML = '';

            let targetSpan = null;

            contentLines.forEach(item => {
                const lineSpan = document.createElement('span');
                
                // 줄 전체 이스케이프
                let escapedText = escapeHtml(item.text);
                
                // 타겟 검색어 하이라이트
                if (query) {
                    const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
                    escapedText = escapedText.replace(regex, '<span class="match-term">$1</span>');
                }

                lineSpan.innerHTML = escapedText + '\\n';

                if (item.line === targetLine) {
                    lineSpan.className = 'highlight-line';
                    targetSpan = lineSpan;
                }
                previewContent.appendChild(lineSpan);
            });

            if (targetSpan) {
                targetSpan.scrollIntoView({ block: 'center' });
            }
        }

        // 키보드 네비게이션 및 ESC 제어
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                vscode.postMessage({ command: 'close' });
            } else if (event.key === 'ArrowDown') {
                if (resultsData.length > 0) {
                    event.preventDefault();
                    let nextIndex = selectedIndex + 1;
                    if (nextIndex >= resultsData.length) nextIndex = 0;
                    selectRow(nextIndex);
                }
            } else if (event.key === 'ArrowUp') {
                if (resultsData.length > 0) {
                    event.preventDefault();
                    let prevIndex = selectedIndex - 1;
                    if (prevIndex < 0) prevIndex = resultsData.length - 1;
                    selectRow(prevIndex);
                }
            } else if (event.key === 'Enter') {
                if (selectedIndex !== -1) {
                    event.preventDefault();
                    openFile(selectedIndex);
                }
            }
        });

        // 세로 크기 조절 스플리터 드래그 로직
        resizer.addEventListener('mousedown', initDrag);

        function initDrag(e) {
            e.preventDefault();
            
            const startY = e.clientY;
            const startHeight = parseInt(document.defaultView.getComputedStyle(previewArea).height, 10);
            
            resizer.classList.add('active');
            document.body.style.userSelect = 'none';

            function doDrag(e) {
                const dy = startY - e.clientY;
                const newHeight = startHeight + dy;
                
                // 최소 높이 60px, 최대 높이는 전체 화면의 80%
                const minHeight = 60;
                const maxHeight = window.innerHeight * 0.8;
                
                if (newHeight >= minHeight && newHeight <= maxHeight) {
                    previewArea.style.height = newHeight + 'px';
                    userPreviewHeight = newHeight;
                    vscode.setState({ currentStyle: currentStyle, userPreviewHeight: userPreviewHeight });
                }
            }

            function stopDrag() {
                resizer.classList.remove('active');
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', doDrag);
                window.removeEventListener('mouseup', stopDrag);
            }

            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', stopDrag);
        }

        // 가로 열 크기 조절 (Column Resizing) 로직
        document.querySelectorAll('th').forEach(th => {
            const resizer = th.querySelector('.col-resizer');
            if (!resizer) return;
            
            resizer.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const startX = e.clientX;
                const startWidth = th.offsetWidth;
                
                resizer.classList.add('resizing');
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'col-resize';
                
                const allThs = document.querySelectorAll('th');
                allThs.forEach(otherTh => {
                    if (!otherTh.style.width) {
                        otherTh.style.width = otherTh.offsetWidth + 'px';
                    }
                });
                
                function doDrag(e) {
                    const dx = e.clientX - startX;
                    const newWidth = Math.max(40, startWidth + dx);
                    th.style.width = newWidth + 'px';
                    th.style.minWidth = newWidth + 'px';
                    th.style.maxWidth = newWidth + 'px';
                }
                
                function stopDrag() {
                    resizer.classList.remove('resizing');
                    document.body.style.userSelect = '';
                    document.body.style.cursor = '';
                    window.removeEventListener('mousemove', doDrag);
                    window.removeEventListener('mouseup', stopDrag);
                }
                
                window.addEventListener('mousemove', doDrag);
                window.addEventListener('mouseup', stopDrag);
            });
        });

        // 로드 시 기존 저장된 상태(스타일 및 높이) 복원
        const savedState = vscode.getState() || {};
        userPreviewHeight = savedState.userPreviewHeight || 250;
        const savedStyle = savedState.currentStyle || "${defaultStyle}";
        const savedScope = savedState.currentScope || 'project';
        const savedDockMode = savedState.dockMode !== undefined ? savedState.dockMode : ${defaultDockMode};
        setStyleMode(savedStyle);
        setSearchScope(savedScope);
        setDockMode(savedDockMode);

        // 상세 필터 복원
        if (savedState.selectedModule) {
            moduleSelect.value = savedState.selectedModule;
        }
        if (savedState.selectedDirectory) {
            addDirectoryToSelect(savedState.selectedDirectory);
            directorySelect.value = savedState.selectedDirectory;
        }
        if (savedState.selectedScopeDetail) {
            scopeSelect.value = savedState.selectedScopeDetail;
        }

        // 최초 진입 시 기본값이 이미 들어있다면 즉시 검색 실행
        if (searchInput.value) {
            triggerSearch();
        }

        // 헬퍼 함수: HTML 이스케이프 및 매칭 텍스트 하이라이트
        function escapeHtmlAndHighlight(text, query) {
            const escaped = escapeHtml(text);
            if (!query) return escaped;
            try {
                const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
                return escaped.replace(regex, '<span class="match-term">$1</span>');
            } catch (e) {
                return escaped;
            }
        }

        // 정규식 특수문자 이스케이프
        function escapeRegExp(string) {
            return string.replace(/[.*+?^\${}()|[\\]\\\\\\/]/g, '\\\\$&');
        }

        function escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>`;
}
