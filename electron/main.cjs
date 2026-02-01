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
  const isPackaged = app.isPackaged;

  let serverPath;
  let cwd;

  if (isPackaged) {
    // In packaged app, server-dist is unpacked from asar
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');
    serverPath = path.join(unpackedPath, 'server-dist', 'index.js');
    cwd = unpackedPath;
  } else {
    // In development
    serverPath = path.join(__dirname, '..', 'server-dist', 'index.js');
    cwd = path.join(__dirname, '..');
  }

  // Set data directory to user's app data folder
  const dataDir = path.join(app.getPath('userData'), 'data');

  // Use Electron's bundled Node.js executable in packaged app
  const nodeExecutable = isPackaged ? process.execPath : 'node';

  const env = {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: PORT.toString(),
  };

  if (isPackaged) {
    // Run Electron as Node.js runtime for the server
    env.ELECTRON_RUN_AS_NODE = '1';
  }

  console.log('Starting server:', serverPath);
  console.log('Data directory:', dataDir);

  serverProcess = spawn(nodeExecutable, [serverPath], {
    env,
    stdio: 'inherit',
    cwd
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
