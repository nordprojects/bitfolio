import {app, BrowserWindow, ipcMain, screen} from 'electron';
import {join, resolve} from 'node:path';
import {platform} from 'node:os'
import DirWatcher from './DirWatcher';

function getExternalDisplay() {
  const displays = screen.getAllDisplays()
  return displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0
  })
}

const isRunningOnLinux = platform() === 'linux';

async function createWindow() {
  const externalDisplay = getExternalDisplay();

  const browserWindow = new BrowserWindow({
    show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    ...(externalDisplay ? {x: externalDisplay.bounds.x + 50, y: externalDisplay.bounds.y + 50} : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(app.getAppPath(), 'packages/preload/dist/index.cjs'),
    },
  });

  /**
   * If the 'show' property of the BrowserWindow's constructor is omitted from the initialization options,
   * it then defaults to 'true'. This can cause flickering as the window loads the html content,
   * and it also has show problematic behaviour with the closing of the window.
   * Use `show: false` and listen to the  `ready-to-show` event to show the window.
   *
   * @see https://github.com/electron/electron/issues/25012 for the afford mentioned issue.
   */
  browserWindow.on('ready-to-show', () => {
    browserWindow?.show();

    if (isRunningOnLinux) {
      browserWindow.setFullScreen(true);
    }
  });

  /**
   * Load the main page of the main window.
   */
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined) {
    /**
     * Load from the Vite dev server for development.
     */
    await browserWindow.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
  } else {
    /**
     * Load from the local file system for production and test.
     *
     * Use BrowserWindow.loadFile() instead of BrowserWindow.loadURL() for WhatWG URL API limitations
     * when path contains special characters like `#`.
     * Let electron handle the path quirks.
     * @see https://github.com/nodejs/node/issues/12682
     * @see https://github.com/electron/electron/issues/6869
     */
    await browserWindow.loadFile(resolve(__dirname, '../../renderer/dist/index.html'));
  }

  const dirWatcher = new DirWatcher();
  dirWatcher.didUpdate = () => {
    console.log('didUpdate', dirWatcher.files);
    // send to the renderer
    browserWindow.webContents.send('files', dirWatcher.files);
  }
  dirWatcher.watch();

  ipcMain.on('request-files', (event) => {
    event.reply('files', dirWatcher.files);
  })

  return browserWindow;
}

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}
