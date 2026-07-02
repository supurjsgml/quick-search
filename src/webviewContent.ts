export function getWebviewContent(initialQuery: string = ''): string {
    // HTML 이스케이프 (인풋 태그 내 주입 시 깨짐 방지)
    const escapedQuery = initialQuery
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Quick Search</title>
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
        }
        th, td {
            padding: 6px 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
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
        .col-line { width: 60px; text-align: right; color: var(--vscode-editorLineNumber-foreground, #858585); }
        .col-text { width: auto; font-family: var(--vscode-editor-font-family, Consolas, monospace); }
        .col-path { width: 350px; color: var(--vscode-descriptionForeground, #8c8c8c); font-size: 11px; }

        tr.selected .col-line, tr.selected .col-path {
            color: inherit;
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
        .highlight-line {
            background-color: var(--vscode-editor-wordHighlightBackground, #57575740);
            display: inline-block;
            width: 100%;
            font-weight: bold;
            border-left: 3px solid var(--vscode-focusBorder, #007acc);
            padding-left: 2px;
        }
        .match-term {
            background-color: var(--vscode-editor-findMatchHighlightBackground, #ea5c0050);
            border-bottom: 1px solid var(--vscode-editor-findMatchBorder, #ea5c00);
            border-radius: 1px;
        }
        .status-bar {
            margin-top: 6px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground, #8c8c8c);
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>

    <!-- 검색 입력 영역 -->
    <div class="search-area">
        <div class="search-box-wrapper">
            <span class="label">Search Pattern (Case Insensitive)</span>
            <input type="text" id="search-input" placeholder="Type pattern to search..." autofocus autocomplete="off" value="${escapedQuery}">
        </div>
        <div class="filter-box-wrapper">
            <span class="label">File Name Filter (e.g. *.java, src/)</span>
            <input type="text" id="filter-input" placeholder="e.g. *.java" autocomplete="off">
        </div>
    </div>

    <!-- 검색 결과 목록 -->
    <div class="grid-area">
        <table>
            <thead>
                <tr>
                    <th class="col-line">Line</th>
                    <th class="col-text">Text</th>
                    <th class="col-path">Path</th>
                </tr>
            </thead>
            <tbody id="results-body">
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">
                        검색어를 입력해 주세요. (ESC를 누르면 창이 닫힙니다)
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- 크기 조절 스플리터 -->
    <div class="resizer" id="resizer"></div>

    <!-- 소스 미리보기 -->
    <div class="preview-area" id="preview-area">
        <div class="preview-header" id="preview-file-path">No File Selected</div>
        <pre class="preview-body"><code id="preview-content">// Select an item to preview code</code></pre>
    </div>

    <!-- 상태 바 -->
    <div class="status-bar">
        <span id="status-text">Ready</span>
        <span>ESC: Close | Arrow Up/Down: Navigate | Enter: Open File</span>
    </div>

    <script>
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
                statusText.innerText = "Ready";
                return;
            }

            statusText.innerText = "Searching...";
            // 200ms 디바운스
            searchDebounceTimer = setTimeout(() => {
                vscode.postMessage({
                    command: 'search',
                    query: query,
                    filter: filter
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
                            검색 결과가 없습니다.
                        </td>
                    </tr>
                \`;
                statusText.innerText = "No matches found";
                clearPreview();
                return;
            }

            statusText.innerText = \`Found \${resultsData.length} match(es)\`;

            resultsData.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.dataset.index = index;

                const tdLine = document.createElement('td');
                tdLine.className = 'col-line';
                tdLine.textContent = item.line;

                const tdText = document.createElement('td');
                tdText.className = 'col-text';
                
                // 검색어 하이라이트 처리
                const query = searchInput.value;
                tdText.innerHTML = escapeHtmlAndHighlight(item.text, query);

                const tdPath = document.createElement('td');
                tdPath.className = 'col-path';
                tdPath.textContent = item.relativePath;
                tdPath.title = item.absolutePath;

                tr.appendChild(tdLine);
                tr.appendChild(tdText);
                tr.appendChild(tdPath);

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

            // 첫 번째 매칭 결과 자동 선택 및 미리보기 로딩
            if (resultsData.length > 0) {
                selectRow(0);
            }
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

        function openFile(index) {
            if (index < 0 || index >= resultsData.length) return;
            const item = resultsData[index];
            vscode.postMessage({
                command: 'openFile',
                path: item.absolutePath,
                line: item.line
            });
        }

        function clearPreview() {
            previewFilePath.innerText = 'No File Selected';
            previewContent.innerHTML = '// Select an item to preview code';
        }

        function renderPreview(filePath, contentLines, targetLine, query) {
            previewFilePath.innerText = filePath;
            previewFilePath.title = filePath;
            previewContent.innerHTML = '';

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
                }
                previewContent.appendChild(lineSpan);
            });
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
