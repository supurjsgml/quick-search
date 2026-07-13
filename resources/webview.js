const lang = "{{lang}}";
const t = {{translationsJson}};
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
        case 'focusInput':
            setTimeout(() => {
                searchInput.focus();
                searchInput.select();
            }, 50);
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
        resultsBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">
                    ${t.noResults}
                </td>
            </tr>
        `;
        statusText.innerText = t.noMatchesFound;
        clearPreview();
        return;
    }

    statusText.innerText = lang === 'ko'
        ? `${resultsData.length}${t.foundMatches}`
        : `Found ${resultsData.length}${t.foundMatches}`;

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
            rightDiv.textContent = `${item.relativePath} ${item.line}`;
            
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
            try {
                const escapedQuery = escapeHtml(query);
                const regex = new RegExp('(' + escapeRegExp(escapedQuery) + ')', 'gi');
                escapedText = escapedText.replace(regex, '<span class="match-term">$1</span>');
            } catch (e) {
                // 하이라이팅 실패 시 에러 전파 방지 및 원본 텍스트 유지
            }
        }

        lineSpan.innerHTML = escapedText + '\n';

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
const savedStyle = savedState.currentStyle || "{{defaultStyle}}";
const savedScope = savedState.currentScope || 'project';
const savedDockMode = savedState.dockMode !== undefined ? savedState.dockMode : {{defaultDockMode}};
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
} else {
    // 드래그된 텍스트가 없는 경우 포커스 지정 (렌더링 지연 대응을 위해 지연 적용)
    setTimeout(() => {
        searchInput.focus();
    }, 100);
}

// 헬퍼 함수: HTML 이스케이프 및 매칭 텍스트 하이라이트
function escapeHtmlAndHighlight(text, query) {
    const escaped = escapeHtml(text);
    if (!query) return escaped;
    try {
        const escapedQuery = escapeHtml(query);
        const regex = new RegExp('(' + escapeRegExp(escapedQuery) + ')', 'gi');
        return escaped.replace(regex, '<span class="match-term">$1</span>');
    } catch (e) {
        return escaped;
    }
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
