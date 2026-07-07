import * as fs from 'fs';
import * as path from 'path';

export function getWebviewContent(extensionPath: string, initialQuery: string = '', locale: string = 'en', defaultStyle: string = 'intellij', defaultDockMode: boolean = false): string {
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

    try {
        // 리소스 파일 읽기
        const htmlPath = path.join(extensionPath, 'resources', 'webview.html');
        const cssPath = path.join(extensionPath, 'resources', 'webview.css');
        const jsPath = path.join(extensionPath, 'resources', 'webview.js');

        let html = fs.readFileSync(htmlPath, 'utf8');
        const css = fs.readFileSync(cssPath, 'utf8');
        const js = fs.readFileSync(jsPath, 'utf8');

        // 리소스 치환
        html = html.replace('{{styles}}', css);
        html = html.replace('{{scripts}}', js);

        // 기본 변수 치환
        html = html.replace(/\{\{lang\}\}/g, lang);
        html = html.replace(/\{\{escapedQuery\}\}/g, escapedQuery);
        html = html.replace(/\{\{defaultStyle\}\}/g, defaultStyle);
        html = html.replace(/\{\{defaultDockMode\}\}/g, String(defaultDockMode));
        html = html.replace(/\{\{translationsJson\}\}/g, JSON.stringify(t));

        // 번역 데이터 일괄 치환
        for (const key of Object.keys(t)) {
            const regex = new RegExp(`\\{\\{t\\.${key}\\}\\}`, 'g');
            html = html.replace(regex, t[key]);
        }

        return html;
    } catch (err: any) {
        return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h2>Failed to load Webview Resources</h2>
        <p><b>Error:</b> ${err.message}</p>
        <pre style="background: #252526; color: #ccc; padding: 10px; border-radius: 4px; overflow: auto;">${err.stack}</pre>
    </div>
</body>
</html>`;
    }
}
