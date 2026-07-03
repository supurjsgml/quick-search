import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getWebviewContent } from './webviewContent';

export function activate(context: vscode.ExtensionContext) {
    // 빌드 결과물(out/extension.js)이 변경되면 확장 호스트를 자동으로 재시작하여 변경 사항 즉시 반영
    let reloadTimeout: NodeJS.Timeout | undefined;
    const extensionJsPath = path.join(context.extensionPath, 'out', 'extension.js');
    if (fs.existsSync(extensionJsPath)) {
        const watcher = fs.watch(extensionJsPath, () => {
            if (reloadTimeout) {
                clearTimeout(reloadTimeout);
            }
            reloadTimeout = setTimeout(() => {
                vscode.commands.executeCommand('workbench.action.restartExtensionHost');
            }, 1000); // 파일 쓰기가 완전히 완료될 수 있도록 1초 대기 후 재시작
        });
        context.subscriptions.push({
            dispose: () => {
                watcher.close();
                if (reloadTimeout) {
                    clearTimeout(reloadTimeout);
                }
            }
        });
    }

    let activePanel: vscode.WebviewPanel | undefined = undefined;

    let disposable = vscode.commands.registerCommand('quick-search.open', () => {
        // 현재 에디터에서 선택(드래그)된 텍스트 획득
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                // 여러 줄 선택 가능성도 있으므로 양끝 공백만 깔끔히 트림
                selectedText = editor.document.getText(selection).trim();
            }
        }

        // 이미 탭이 열려있다면 해당 탭을 활성화하고 검색어 업데이트 메시지 전송
        if (activePanel) {
            activePanel.reveal(vscode.ViewColumn.Active);
            if (selectedText) {
                activePanel.webview.postMessage({
                    command: 'setQuery',
                    text: selectedText
                });
            }
            return;
        }

        // 새로운 Webview 탭 생성
        activePanel = vscode.window.createWebviewPanel(
            'quickSearchTab',
            'Quick Search',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true // 백그라운드로 가도 상태 유지
            }
        );

        // HTML 콘텐츠 주입 (초기 검색어 및 에디터 언어 정보 전달)
        const locale = vscode.env.language || 'en';
        const savedStyle = context.globalState.get<string>('searchStyleMode') || 'intellij';
        activePanel.webview.html = getWebviewContent(selectedText, locale, savedStyle);

        // 초기 검색 범위 데이터(모듈, 최근 디렉터리 등) 수집 및 전달
        sendInitialScopeData(activePanel);

        // 탭이 닫힐 때 이벤트 처리
        activePanel.onDidDispose(() => {
            activePanel = undefined;
        }, null, context.subscriptions);

        // Webview로부터 오는 메시지 처리
        activePanel.webview.onDidReceiveMessage(async (message) => {
            if (!activePanel) { return; }

            switch (message.command) {
                case 'saveStyleMode':
                    await context.globalState.update('searchStyleMode', message.style);
                    break;
                case 'search':
                    await handleSearch(
                        activePanel, 
                        message.query, 
                        message.filter, 
                        message.scope,
                        message.moduleValue,
                        message.directoryValue,
                        message.scopeValue
                    );
                    break;
                case 'requestPreview':
                    await handlePreview(activePanel, message.path, message.line, message.query);
                    break;
                case 'openFile':
                    if (activePanel) {
                        activePanel.dispose();
                    }
                    await handleOpenFile(message.path, message.line, message.query);
                    break;
                case 'close':
                    activePanel.dispose();
                    break;
                case 'browseDirectory':
                    const folders = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: locale.startsWith('ko') ? '폴더 선택' : 'Select Folder'
                    });
                    if (folders && folders[0] && activePanel) {
                        activePanel.webview.postMessage({
                            command: 'directorySelected',
                            path: folders[0].fsPath
                        });
                    }
                    break;
            }
        }, null, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}

// 파일 데이터 인코딩 감지 및 디코딩 헬퍼 (UTF-8 및 EUC-KR 지원)
function decodeFileContent(fileData: Uint8Array): string {
    try {
        // UTF-8로 에러(fatal) 조건 검사를 걸고 디코딩 시도
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        return utf8Decoder.decode(fileData);
    } catch (e) {
        try {
            // UTF-8 디코딩 중 에러가 나면 EUC-KR(CP949)로 디코딩
            const eucKrDecoder = new TextDecoder('euc-kr');
            return eucKrDecoder.decode(fileData);
        } catch (e2) {
            // 둘 다 실패하면 기본 UTF-8 강제 디코딩 (대체 문자  포함)
            return new TextDecoder('utf-8').decode(fileData);
        }
    }
}

// 프로젝트 전체 텍스트 검색 처리
async function handleSearch(
    panel: vscode.WebviewPanel, 
    queryText: string, 
    filterText: string, 
    scopeText: string = 'project',
    moduleValue: string = '',
    directoryValue: string = '',
    scopeValue: string = 'all'
) {
    if (!queryText || queryText.trim().length === 0) {
        return;
    }

    const cleanQuery = queryText.toLowerCase().trim();
    let results: any[] = [];
    
    // 파일 필터 조건 생성 (라이크 및 와일드카드 부분 일치 검색 가능하도록 변환)
    let filePattern = '**/*';
    if (filterText && filterText.trim()) {
        let pattern = filterText.trim();
        if (pattern.includes('**/')) {
            filePattern = pattern;
        } else {
            if (!pattern.includes('*')) {
                if (pattern.endsWith('/')) {
                    pattern = `**/${pattern}**/*`;
                } else {
                    pattern = `*${pattern}*`;
                }
            }
            if (!pattern.startsWith('**/')) {
                if (pattern.startsWith('/')) {
                    pattern = `**${pattern}`;
                } else {
                    pattern = `**/${pattern}`;
                }
            }
            filePattern = pattern;
        }
    }

    // 제외할 대표적인 빌드 및 바이너리 폴더들
    const excludePattern = '{**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/target/**,**/bin/**,**/out/**}';

    try {
        let files: vscode.Uri[] = [];

        // 검색 범위 분기 처리
        if (scopeText === 'module') {
            let targetUri: vscode.Uri | undefined;
            if (moduleValue) {
                targetUri = vscode.Uri.file(moduleValue);
            } else {
                const activeEditor = vscode.window.activeTextEditor;
                const folder = activeEditor ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri) : undefined;
                if (folder) {
                    targetUri = folder.uri;
                }
            }

            if (targetUri) {
                const searchPattern = new vscode.RelativePattern(targetUri, filePattern);
                files = await vscode.workspace.findFiles(searchPattern, excludePattern, 1500);
            } else {
                files = await vscode.workspace.findFiles(filePattern, excludePattern, 1500);
            }
        } else if (scopeText === 'directory') {
            let targetUri: vscode.Uri | undefined;
            if (directoryValue) {
                targetUri = vscode.Uri.file(directoryValue);
            } else {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    targetUri = vscode.Uri.joinPath(activeEditor.document.uri, '..');
                }
            }

            if (targetUri) {
                const searchPattern = new vscode.RelativePattern(targetUri, filePattern);
                files = await vscode.workspace.findFiles(searchPattern, excludePattern, 1500);
            } else {
                files = await vscode.workspace.findFiles(filePattern, excludePattern, 1500);
            }
        } else if (scopeText === 'scope') {
            if (scopeValue === 'open_files') {
                // 열려 있는 탭들만 검색
                const openUris: vscode.Uri[] = [];
                vscode.window.tabGroups.all.forEach(group => {
                    group.tabs.forEach(tab => {
                        if (tab.input instanceof vscode.TabInputText) {
                            openUris.push(tab.input.uri);
                        }
                    });
                });
                
                const filterLower = filterText ? filterText.toLowerCase().trim() : '';
                files = openUris.filter(uri => {
                    const relPath = vscode.workspace.asRelativePath(uri);
                    const relPathLower = relPath.toLowerCase();
                    
                    // 제외 경로 체크
                    if (relPathLower.includes('node_modules/') || 
                        relPathLower.includes('dist/') || 
                        relPathLower.includes('build/') || 
                        relPathLower.includes('.git/') || 
                        relPathLower.includes('target/') || 
                        relPathLower.includes('bin/') || 
                        relPathLower.includes('out/')) {
                        return false;
                    }
                    
                    // 파일 패턴 매치 검사
                    if (filterLower) {
                        const cleanPattern = filterLower.replace(/\*/g, '');
                        if (!relPathLower.includes(cleanPattern)) {
                            return false;
                        }
                    }
                    return true;
                });
            } else {
                // 프로젝트 전체 파일을 가져온 뒤 필터링 처리
                const allFiles = await vscode.workspace.findFiles(filePattern, excludePattern, 1500);
                if (scopeValue === 'production_files') {
                    files = allFiles.filter(uri => {
                        const pathLower = uri.fsPath.toLowerCase();
                        return !pathLower.includes('/test/') && 
                               !pathLower.includes('\\test\\') && 
                               !pathLower.includes('test.') && 
                               !pathLower.includes('spec.');
                    });
                } else if (scopeValue === 'test_files') {
                    files = allFiles.filter(uri => {
                        const pathLower = uri.fsPath.toLowerCase();
                        return pathLower.includes('/test/') || 
                               pathLower.includes('\\test\\') || 
                               pathLower.includes('test.') || 
                               pathLower.includes('spec.');
                    });
                } else {
                    // 'all' 또는 'project_files'
                    files = allFiles;
                }
            }
        } else {
            // 기본값 'project' (전체 검색)
            files = await vscode.workspace.findFiles(filePattern, excludePattern, 1500);
        }
        
        // 각 파일에서 텍스트 검색 수행
        const promises = files.map(async (uri) => {
            try {
                // 파일 정보 가져오기 (stat)
                const stat = await vscode.workspace.fs.stat(uri);
                
                // 크기 제한: 2MB 초과 파일은 성능 및 렉 방지를 위해 스킵
                if (stat.size > 2 * 1024 * 1024) {
                    return;
                }

                const fileData = await vscode.workspace.fs.readFile(uri);
                
                // 바이너리 파일 체크 (널 바이트 존재 시 스킵)
                if (fileData.includes(0)) {
                    return;
                }

                // 한글 깨짐 대응 디코딩
                const content = decodeFileContent(fileData);
                const lines = content.split(/\r?\n/);
                const relativePath = vscode.workspace.asRelativePath(uri);

                lines.forEach((lineText, index) => {
                    if (lineText.toLowerCase().includes(cleanQuery)) {
                        results.push({
                            absolutePath: uri.fsPath,
                            relativePath: relativePath,
                            line: index + 1,
                            text: lineText.trim()
                        });
                    }
                });
            } catch (err) {
                // 개별 파일 처리 중 에러는 무시
            }
        });

        await Promise.all(promises);

        // 결과 정렬 (경로 알파벳 순 -> 라인 순)
        results.sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

        // 결과 개수 제한 (최대 300개)
        if (results.length > 300) {
            results = results.slice(0, 300);
        }

        panel.webview.postMessage({
            command: 'searchResults',
            data: results
        });
    } catch (error: any) {
        const isKorean = (vscode.env.language || 'en').startsWith('ko');
        const errorPrefix = isKorean ? '검색 중 오류 발생: ' : 'Error during search: ';
        vscode.window.showErrorMessage(errorPrefix + error.message);
    }
}

// 선택한 줄의 전후 미리보기 소스 코드 로드
async function handlePreview(panel: vscode.WebviewPanel, filePath: string, targetLine: number, queryText: string) {
    try {
        const fileUri = vscode.Uri.file(filePath);
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        
        // 한글 깨짐 대응 디코딩
        const content = decodeFileContent(fileData);
        const lines = content.split(/\r?\n/);
        
        const targetIndex = targetLine - 1; // 0-indexed
        
        // 전후 25줄씩 미리보기 제공
        const start = Math.max(0, targetIndex - 25);
        const end = Math.min(lines.length - 1, targetIndex + 25);

        const previewLines = [];
        for (let i = start; i <= end; i++) {
            previewLines.push({
                line: i + 1,
                text: lines[i]
            });
        }

        panel.webview.postMessage({
            command: 'previewContent',
            path: filePath,
            content: previewLines,
            line: targetLine,
            query: queryText
        });
    } catch (error) {
        const isKorean = (vscode.env.language || 'en').startsWith('ko');
        const readError = isKorean ? '파일 내용을 읽을 수 없습니다.' : 'Cannot read file content.';
        panel.webview.postMessage({
            command: 'previewContent',
            path: filePath,
            content: [{ line: targetLine, text: readError }],
            line: targetLine,
            query: ''
        });
    }
}

// 실제 파일 편집기로 열기 및 타겟 라인으로 포커스
async function handleOpenFile(filePath: string, targetLine: number, query?: string) {
    try {
        const fileUri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(fileUri);
        
        // 파일 열기 및 특정 줄(Line) 선택/이동
        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false
        });
        
        const lineIndex = targetLine - 1;
        let startChar = 0;
        let endChar = 0;

        if (query && query.trim()) {
            const lineText = doc.lineAt(lineIndex).text;
            const lowerLine = lineText.toLowerCase();
            const cleanQuery = query.toLowerCase().trim();
            const matchIndex = lowerLine.indexOf(cleanQuery);
            if (matchIndex !== -1) {
                startChar = matchIndex;
                endChar = matchIndex + cleanQuery.length;
            }
        }

        const startPosition = new vscode.Position(lineIndex, startChar);
        const endPosition = new vscode.Position(lineIndex, endChar);
        editor.selection = new vscode.Selection(startPosition, endPosition);
        
        // 해당 영역이 보이도록 스크롤 이동
        const range = new vscode.Range(startPosition, endPosition);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error: any) {
        vscode.window.showErrorMessage('파일을 여는 중 오류 발생: ' + error.message);
    }
}

// 초기 스코프 데이터 전집 및 웹뷰 전송
async function sendInitialScopeData(panel: vscode.WebviewPanel) {
    const modules: { label: string; value: string }[] = [];
    const directories: string[] = [];

    // 모듈 (1단계 서브 디렉터리) 수집
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        for (const folder of workspaceFolders) {
            try {
                // 루트 폴더 자체도 첫 항목으로 추가
                modules.push({
                    label: `[Project] ${folder.name}`,
                    value: folder.uri.fsPath
                });

                const children = await vscode.workspace.fs.readDirectory(folder.uri);
                for (const [name, type] of children) {
                    if (type === vscode.FileType.Directory) {
                        // 빌드 및 제외 폴더 제외
                        const excludes = ['node_modules', 'dist', 'build', '.git', 'target', 'bin', 'out', '.gradle', '.idea', '.vscode'];
                        if (!excludes.includes(name.toLowerCase())) {
                            const subUri = vscode.Uri.joinPath(folder.uri, name);
                            modules.push({
                                label: `${folder.name}/${name}`,
                                value: subUri.fsPath
                            });
                        }
                    }
                }
            } catch (e) {
                // 디렉터리 읽기 에러
            }
        }
    }

    // 현재 활성화된 에디터가 있다면 해당 파일의 디렉터리를 디렉터리 기본값에 세팅
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const parentDir = vscode.Uri.joinPath(activeEditor.document.uri, '..').fsPath;
        directories.push(parentDir);
    }

    // 워크스페이스 폴더 루트 자체도 디렉터리 이력에 추가
    if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
            if (!directories.includes(folder.uri.fsPath)) {
                directories.push(folder.uri.fsPath);
            }
        });
    }

    // 웹뷰 로딩이 완료된 시점에 전달되도록 500ms 지연 발송
    setTimeout(() => {
        if (panel && panel.webview) {
            panel.webview.postMessage({
                command: 'initScopeData',
                modules: modules,
                directories: directories
            });
        }
    }, 500);
}

export function deactivate() {}
