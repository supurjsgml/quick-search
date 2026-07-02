import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';

export function activate(context: vscode.ExtensionContext) {
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

        // HTML 콘텐츠 주입 (초기 검색어 전달)
        activePanel.webview.html = getWebviewContent(selectedText);

        // 탭이 닫힐 때 이벤트 처리
        activePanel.onDidDispose(() => {
            activePanel = undefined;
        }, null, context.subscriptions);

        // Webview로부터 오는 메시지 처리
        activePanel.webview.onDidReceiveMessage(async (message) => {
            if (!activePanel) { return; }

            switch (message.command) {
                case 'search':
                    await handleSearch(activePanel, message.query, message.filter);
                    break;
                case 'requestPreview':
                    await handlePreview(activePanel, message.path, message.line, message.query);
                    break;
                case 'openFile':
                    await handleOpenFile(message.path, message.line);
                    if (activePanel) {
                        activePanel.dispose();
                    }
                    break;
                case 'close':
                    activePanel.dispose();
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
async function handleSearch(panel: vscode.WebviewPanel, queryText: string, filterText: string) {
    if (!queryText || queryText.trim().length === 0) {
        return;
    }

    const cleanQuery = queryText.toLowerCase().trim();
    let results: any[] = [];
    
    // 파일 필터 조건 생성
    let filePattern = '**/*';
    if (filterText && filterText.trim()) {
        filePattern = filterText.trim();
        if (filePattern.startsWith('*.')) {
            filePattern = '**/' + filePattern;
        }
    }

    // 제외할 대표적인 빌드 및 바이너리 폴더들
    const excludePattern = '{**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/target/**,**/bin/**,**/out/**}';

    try {
        // VS Code 내장 파일 검색 API 실행 (최대 1500개 파일 스캔)
        const files = await vscode.workspace.findFiles(filePattern, excludePattern, 1500);
        
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
        vscode.window.showErrorMessage('검색 중 오류 발생: ' + error.message);
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
        
        // 전후 7줄씩 미리보기 제공 (총 15줄)
        const start = Math.max(0, targetIndex - 7);
        const end = Math.min(lines.length - 1, targetIndex + 7);

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
        panel.webview.postMessage({
            command: 'previewContent',
            path: filePath,
            content: [{ line: targetLine, text: '파일 내용을 읽을 수 없습니다.' }],
            line: targetLine,
            query: ''
        });
    }
}

// 실제 파일 편집기로 열기 및 타겟 라인으로 포커스
async function handleOpenFile(filePath: string, targetLine: number) {
    try {
        const fileUri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(fileUri);
        
        // 파일 열기 및 특정 줄(Line) 선택/이동
        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        
        // 0-indexed 이므로 targetLine - 1
        const position = new vscode.Position(targetLine - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        
        // 해당 영역이 보이도록 스크롤 이동
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    } catch (error: any) {
        vscode.window.showErrorMessage('파일을 여는 중 오류 발생: ' + error.message);
    }
}

export function deactivate() {}
