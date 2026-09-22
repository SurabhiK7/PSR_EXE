const { app, BrowserWindow, shell } = require('electron');

// The centrally-hosted deployment this desktop shell connects to - the app and its data
// live on Render + MongoDB Atlas, not on this machine, so the .exe works for anyone who
// has it regardless of whether this laptop is on.
const APP_URL = process.env.PSR_TRACKER_URL || 'https://psr-tracker.onrender.com';

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: 'PSR Tracker',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  // Open any link that tries to open a new window (e.g. target="_blank") in the user's
  // real browser instead of a second Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
