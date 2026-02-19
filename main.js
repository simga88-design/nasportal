const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: {
            nodeIntegration: true,            // Node.js 사용 허용
            contextIsolation: false,          // 격리 해제
            nodeIntegrationInSubFrames: true, // ★ iframe 안에서도 Node.js 사용 허용 (이게 핵심!)
            webviewTag: true                  // webview 태그 허용
        }
    });

    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});