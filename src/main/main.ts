import { app, BrowserWindow, ipcMain, session, Menu, dialog, DownloadItem, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const activeDownloads = new Map<string, DownloadItem>();
let askForDownloadPath = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '..', '..', 'logo-app.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // ===== BLOCK ELECTRON DEFAULTS & FORWARD ALL BROWSER SHORTCUTS =====
  Menu.setApplicationMenu(null);

  // Intercept ALL keyboard events — including when webview has focus — and forward as IPC
  // Crucially, we must attach this to the main window AND any webviews.
  const attachKeyInterceptor = (contents: Electron.WebContents) => {
    // Only attach once per WebContents
    if ((contents as any)._hasKeyInterceptor) return;
    (contents as any)._hasKeyInterceptor = true;

    contents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const ctrl = input.control || input.meta;
      const shift = input.shift;
      const alt = input.alt;
      const key = input.key.toLowerCase();

      let action: string | null = null;

      // --- Ctrl shortcuts ---
      if (ctrl && !alt) {
        if (key === 't' && !shift) action = 'new-tab';
        else if (key === 't' && shift) action = 'reopen-tab';
        else if (key === 'w' && !shift) action = 'close-tab';
        else if (key === 'tab' && !shift) action = 'next-tab';
        else if (key === 'tab' && shift) action = 'prev-tab';
        else if (key === 'pagedown') action = 'next-tab';
        else if (key === 'pageup') action = 'prev-tab';
        else if (/^[1-9]$/.test(key)) action = `switch-tab-${key}`;
        else if (key === 'l' || key === 'k') action = 'focus-url';
        else if (key === 'r' && !shift) action = 'reload';
        else if (key === 'r' && shift) action = 'hard-reload';
        else if (key === 'd' && !shift) action = 'toggle-bookmark';
        else if (key === 'h' && !shift) action = 'open-history';
        else if (key === 'b') action = 'toggle-sidebar';
        else if (key === 'n' && !shift) action = 'new-tab';
        else if (key === 'i' && shift) action = 'webview-devtools';
        else if (key === 'j' && shift) action = 'host-devtools';
        else if (key === 'f' && !shift) action = 'find';
        else if (key === 'p' && !shift) action = 'print';
        else if (key === '=' || key === '+') action = 'zoom-in';
        else if (key === '-') action = 'zoom-out';
        else if (key === '0') action = 'zoom-reset';
        else if (key === 'delete' && shift) action = 'open-settings';
        else if (key === 'g') { event.preventDefault(); return; } // block Electron find
      }

      // --- Alt shortcuts ---
      if (alt && !ctrl) {
        if (key === 'arrowleft') action = 'go-back';
        else if (key === 'arrowright') action = 'go-forward';
        else if (key === 'home') action = 'go-home';
      }

      // --- Function keys ---
      if (!ctrl && !alt) {
        if (key === 'f5' && !shift) action = 'reload';
        else if (key === 'f5' && shift) action = 'hard-reload';
        else if (key === 'f6') action = 'focus-url';
        else if (key === 'f11') action = 'fullscreen';
        else if (key === 'f12') action = 'webview-devtools';
        else if (key === 'escape') action = 'escape';
      }

      if (action) {
        event.preventDefault();
        mainWindow?.webContents.send('shortcut', action);
      }
    });
  };

  attachKeyInterceptor(mainWindow.webContents);

  app.on('web-contents-created', (_, contents) => {
    if (contents.isDestroyed()) return;
    attachKeyInterceptor(contents);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // ===== WINDOW CONTROL IPC =====
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // ===== CONTEXT MENU IPC =====
  ipcMain.on('context-menu:show', (_event, params: {
    x: number;
    y: number;
    linkURL?: string;
    srcURL?: string;
    selectionText?: string;
    isEditable?: boolean;
    mediaType?: string;
  }) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    // Link actions
    if (params.linkURL) {
      menuItems.push(
        { label: 'Open Link in New Tab', click: () => mainWindow?.webContents.send('context-menu:open-link', params.linkURL) },
        { label: 'Copy Link Address', click: () => { const { clipboard } = require('electron'); clipboard.writeText(params.linkURL!); } },
        { type: 'separator' },
      );
    }

    // Image actions
    if (params.mediaType === 'image' && params.srcURL) {
      menuItems.push(
        { label: 'Open Image in New Tab', click: () => mainWindow?.webContents.send('context-menu:open-link', params.srcURL) },
        { label: 'Copy Image Address', click: () => { const { clipboard } = require('electron'); clipboard.writeText(params.srcURL!); } },
        { type: 'separator' },
      );
    }

    // Text selection actions
    if (params.selectionText) {
      menuItems.push(
        { label: 'Copy', role: 'copy' },
        { label: `Search Google for "${params.selectionText.slice(0, 30)}${params.selectionText.length > 30 ? '…' : ''}"`, click: () => {
          const query = encodeURIComponent(params.selectionText!);
          mainWindow?.webContents.send('context-menu:open-link', `https://www.google.com/search?q=${query}`);
        }},
        { type: 'separator' },
      );
    }

    // Edit actions
    if (params.isEditable) {
      menuItems.push(
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
        { type: 'separator' },
      );
    }

    // Standard actions (always show)
    menuItems.push(
      { label: 'Back', click: () => mainWindow?.webContents.send('context-menu:back') },
      { label: 'Forward', click: () => mainWindow?.webContents.send('context-menu:forward') },
      { label: 'Reload', click: () => mainWindow?.webContents.send('context-menu:reload') },
      { type: 'separator' },
      { label: 'Inspect Element', click: () => mainWindow?.webContents.send('context-menu:inspect') },
    );

    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup({ window: mainWindow!, x: params.x, y: params.y });
  });

  // ===== ZOOM IPC =====
  ipcMain.on('zoom:in', () => mainWindow?.webContents.send('zoom:in'));
  ipcMain.on('zoom:out', () => mainWindow?.webContents.send('zoom:out'));
  ipcMain.on('zoom:reset', () => mainWindow?.webContents.send('zoom:reset'));

  // ===== FULLSCREEN IPC =====
  ipcMain.on('window:fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  ipcMain.on('window:toggle-devtools', () => {
    mainWindow?.webContents.toggleDevTools();
  });

  // ===== DOWNLOAD IPC =====
  ipcMain.handle('download:show-save', async (_event, filename: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: filename,
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.filePath || null;
  });

  ipcMain.on('download:pause', (_e, id: string) => {
    const item = activeDownloads.get(id);
    if (item && !item.isPaused()) item.pause();
  });

  ipcMain.on('download:resume', (_e, id: string) => {
    const item = activeDownloads.get(id);
    if (item && item.canResume()) item.resume();
  });

  ipcMain.on('download:cancel', (_e, id: string) => {
    const item = activeDownloads.get(id);
    if (item) item.cancel();
  });

  ipcMain.on('download:open-folder', async (_e, filename: string) => {
    const fullPath = path.join(app.getPath('downloads'), filename);
    shell.showItemInFolder(fullPath);
  });

  ipcMain.on('settings:sync', (_e, { key, value }) => {
    if (key === 'aura-ask-download') {
      askForDownloadPath = value === true || value === 'true';
    }
  });

  // ===== PASSWORD MANAGER IPC =====
  const passwordFile = path.join(app.getPath('userData'), 'aura-passwords.json');

  const loadPasswords = (): any[] => {
    try {
      if (fs.existsSync(passwordFile)) {
        const data = fs.readFileSync(passwordFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch {}
    return [];
  };

  const savePasswords = (passwords: any[]) => {
    try {
      fs.writeFileSync(passwordFile, JSON.stringify(passwords, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save passwords:', e);
    }
  };

  ipcMain.handle('passwords:get', () => loadPasswords());
  ipcMain.handle('passwords:save', (_event, entry: { id: string; site: string; username: string; password: string }) => {
    const passwords = loadPasswords();
    const existing = passwords.findIndex((p: any) => p.id === entry.id);
    if (existing >= 0) {
      passwords[existing] = entry;
    } else {
      passwords.push(entry);
    }
    savePasswords(passwords);
    return passwords;
  });
  ipcMain.handle('passwords:delete', (_event, id: string) => {
    let passwords = loadPasswords();
    passwords = passwords.filter((p: any) => p.id !== id);
    savePasswords(passwords);
    return passwords;
  });

  // ===== PERMISSION HANDLING =====
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-sanitized-write'];
    callback(allowedPermissions.includes(permission));
  });

  // ===== DOWNLOAD HANDLING =====
  session.defaultSession.on('will-download', (_event, item: DownloadItem) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    const filename = item.getFilename();
    
    if (!askForDownloadPath) {
      const savePath = path.join(app.getPath('downloads'), filename);
      item.setSavePath(savePath);
    }
    
    activeDownloads.set(id, item);

    // Initial event
    mainWindow?.webContents.send('download:start', { id, filename, totalBytes: item.getTotalBytes() });

    item.on('updated', (_e, state) => {
      if (state === 'interrupted') {
        mainWindow?.webContents.send('download:progress', { id, state: 'interrupted', receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes() });
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          mainWindow?.webContents.send('download:progress', { id, state: 'paused', receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes() });
        } else {
          mainWindow?.webContents.send('download:progress', { id, state: 'progressing', receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes() });
        }
      }
    });

    item.on('done', (_e, state) => {
      activeDownloads.delete(id);
      if (state === 'completed') {
        mainWindow?.webContents.send('download:complete', { id, filename });
      } else if (state === 'cancelled' || state === 'interrupted') {
        mainWindow?.webContents.send('download:cancelled', { id, filename });
      }
    });
  });

  // ===== HEADERS =====
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
      },
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
