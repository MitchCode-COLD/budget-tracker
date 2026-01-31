const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const PORT = 5555;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'Budget Tracker',
    autoHideMenuBar: true
  });

  // Wait for server to be ready, then load the app
  waitForServer(() => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function waitForServer(callback, retries = 30) {
  const http = require('http');

  const check = () => {
    http.get(`http://localhost:${PORT}/api/accounts`, (res) => {
      callback();
    }).on('error', () => {
      if (retries > 0) {
        setTimeout(() => waitForServer(callback, retries - 1), 500);
      } else {
        console.error('Server failed to start');
        app.quit();
      }
    });
  };

  check();
}

function startServer() {
  const serverPath = path.join(__dirname, '../server-dist/index.js');

  // Set data directory to user's app data folder
  const dataDir = path.join(app.getPath('userData'), 'data');

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: PORT.toString()
    },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});
