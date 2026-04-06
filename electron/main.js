const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, protocol, net, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');
const { GmDashBot, verifyToken, htmlToImage } = require('./telegramBot');
const firebase = require('./firebaseApi');
const aiApi = require('./aiApi');
const AdmZip = require('adm-zip');
const os = require('os');
const Store = require('electron-store').default;

// Diagnostic log buffer (last 200 entries)
const diagLog = [];
function logDiag(type, msg) {
  diagLog.push({ time: new Date().toISOString(), type, msg });
  if (diagLog.length > 200) diagLog.shift();
}

function findUniqueName(folder, name) {
  let candidate = path.join(folder, name);
  if (!fs.existsSync(candidate)) return candidate;
  const ext = path.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  let i = 1;
  while (true) {
    candidate = path.join(folder, ext ? `${base} (${i})${ext}` : `${base} (${i})`);
    if (!fs.existsSync(candidate)) return candidate;
    i++;
  }
}

function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

// Catch uncaught errors
process.on('uncaughtException', (err) => {
  logDiag('crash', `Uncaught exception: ${err.message}`);
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  logDiag('crash', `Unhandled rejection: ${reason}`);
  console.error('Unhandled rejection:', reason);
});

const isDev = !app.isPackaged;

// Custom protocol app:// — DEVE essere registrato prima di app.ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}]);

const gmBot = new GmDashBot();

const store = new Store({
  defaults: {
    recentProjects: [],
    projectStates: {},
    windowBounds: { width: 1400, height: 900 }
  }
});

const globalStore = new Store({
  name: 'global-settings',
  defaults: {
    firebaseCredentials: null,
    downloadQuota: { date: '', bytesUsed: 0 },
    dismissedBroadcastId: '',
    globalAiConfig: { enabled: false, provider: '', apiKey: '', openaiImageKey: '', model: '', effort: 'medium' }
  }
});

// ── safeStorage helpers per credenziali/API key ──

function safeEncrypt(text) {
  if (!text) return text;
  if (safeStorage.isEncryptionAvailable()) {
    return { __enc: safeStorage.encryptString(text).toString('base64') };
  }
  return text; // fallback: testo in chiaro
}

function safeDecrypt(value) {
  if (!value) return value;
  if (typeof value === 'object' && value.__enc) {
    try {
      return safeStorage.decryptString(Buffer.from(value.__enc, 'base64'));
    } catch { return ''; }
  }
  return value; // legacy: testo in chiaro o base64
}

function encryptProjectState(state) {
  if (!state?.aiConfig) return state;
  const clone = JSON.parse(JSON.stringify(state));
  if (clone.aiConfig.apiKey) clone.aiConfig.apiKey = safeEncrypt(clone.aiConfig.apiKey);
  if (clone.aiConfig.openaiImageKey) clone.aiConfig.openaiImageKey = safeEncrypt(clone.aiConfig.openaiImageKey);
  return clone;
}

function decryptProjectState(state) {
  if (!state?.aiConfig) return state;
  const clone = JSON.parse(JSON.stringify(state));
  if (clone.aiConfig.apiKey) clone.aiConfig.apiKey = safeDecrypt(clone.aiConfig.apiKey);
  if (clone.aiConfig.openaiImageKey) clone.aiConfig.openaiImageKey = safeDecrypt(clone.aiConfig.openaiImageKey);
  return clone;
}

// ── Download quota (100 MB/giorno) ──
const DAILY_DOWNLOAD_LIMIT = 1024 * 1024 * 1024; // 1 GB/giorno

function getDownloadQuota() {
  const today = new Date().toISOString().split('T')[0];
  const quota = globalStore.get('downloadQuota', { date: '', bytesUsed: 0 });
  if (quota.date !== today) return { date: today, bytesUsed: 0 };
  return quota;
}

function recordDownloadBytes(bytes) {
  const quota = getDownloadQuota();
  quota.bytesUsed += bytes;
  globalStore.set('downloadQuota', quota);
}

let mainWindow;

function createWindow() {
  const bounds = store.get('windowBounds');
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1714',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL('app://local/index.html');

  // Open DevTools with F12 (solo in sviluppo)
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }

  // Prevent main window navigation (link clicks in markdown would navigate away)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow app:// protocol (internal navigation)
    if (url.startsWith('app://')) return;
    event.preventDefault();
  });

  // Handle target="_blank" or window.open
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Open in popup browser window
      openPopupBrowser(url);
    }
    return { action: 'deny' };
  });

  const saveBounds = () => {
    if (mainWindow.isMaximized() || mainWindow.isMinimized()) return;
    const { x, y, width, height } = mainWindow.getBounds();
    store.set('windowBounds', { x, y, width, height });
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    logDiag('crash', `Renderer crashed: ${details.reason} (code ${details.exitCode})`);
  });
  mainWindow.on('unresponsive', () => {
    logDiag('warn', 'Finestra non risponde');
  });
  mainWindow.on('responsive', () => {
    logDiag('info', 'Finestra tornata responsiva');
  });
}

app.whenReady().then(() => {
  // Registra handler per protocollo app://
  const distRoot = path.resolve(__dirname, '..', 'dist');
  protocol.handle('app', (request) => {
    let { pathname } = new URL(request.url);
    pathname = decodeURIComponent(pathname);

    if (pathname.startsWith('/-/')) {
      // File locale dal filesystem: app://local/-/C:/path/to/file
      const filePath = path.resolve(pathname.substring(3));

      // Validazione path: solo file dentro directory di progetto note o dist/
      const allowed = store.get('recentProjects').map(p => path.resolve(p.path));
      allowed.push(distRoot);
      const isAllowed = allowed.some(root => filePath.startsWith(root + path.sep) || filePath === root);
      if (!isAllowed) {
        logDiag('warn', `app:// bloccato path fuori progetto: ${filePath}`);
        return new Response('Forbidden', { status: 403 });
      }

      return net.fetch(pathToFileURL(filePath).href);
    }

    // File dell'app: app://local/index.html → dist/index.html
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    const resolved = path.resolve(path.join(distRoot, pathname));
    // Validazione: deve restare dentro dist/
    if (!resolved.startsWith(distRoot + path.sep) && resolved !== distRoot) {
      logDiag('warn', `app:// bloccato path traversal dist: ${resolved}`);
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(resolved).href);
  });

  createWindow();

  // === Installation tracking ===
  const crypto = require('crypto');
  let installId = globalStore.get('installationId');
  const isNewInstall = !installId;
  if (isNewInstall) {
    installId = crypto.randomUUID();
    globalStore.set('installationId', installId);
  }
  const today = new Date().toISOString().split('T')[0];
  const installData = {
    lastSeen: today,
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  };
  if (isNewInstall) installData.firstSeen = today;
  firebase.registerInstallation(installId, installData);

  // === Auto-Updater ===
  logDiag('info', `App avviata v${app.getVersion()} (${isDev ? 'dev' : 'prod'})`);
  if (isDev) {
    logDiag('update', 'Auto-update disabilitato in dev mode');
  } else {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      logDiag('update', 'Controllo aggiornamenti...');
    });

    autoUpdater.on('update-not-available', () => {
      logDiag('update', 'Nessun aggiornamento disponibile');
    });

    autoUpdater.on('update-available', (info) => {
      logDiag('update', `Aggiornamento disponibile: v${info.version}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', { version: info.version });
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-progress', {
          percent: Math.round(progress.percent),
          transferred: progress.transferred,
          total: progress.total
        });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      logDiag('update', `Download completato: v${info.version}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', { version: info.version });
      }
    });

    autoUpdater.on('error', (err) => {
      logDiag('error', `Auto-updater: ${err.message}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', { message: err.message });
      }
    });

    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 500);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// === Popup Browser Window ===
function openPopupBrowser(url) {
  const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const parentBounds = parent ? parent.getBounds() : { x: 100, y: 100, width: 1200, height: 800 };
  const popupWidth = Math.min(1100, parentBounds.width - 80);
  const popupHeight = Math.min(750, parentBounds.height - 80);
  const popup = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: parentBounds.x + Math.round((parentBounds.width - popupWidth) / 2),
    y: parentBounds.y + Math.round((parentBounds.height - popupHeight) / 2),
    parent,
    modal: false,
    autoHideMenuBar: true,
    title: url,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'popupPreload.js')
    }
  });

  // Inject toolbar bar with URL + "Open in browser" button
  popup.webContents.on('did-finish-load', () => {
    const currentUrl = popup.webContents.getURL();
    popup.webContents.insertCSS(`
      #gm-popup-bar { position: fixed; top: 0; left: 0; right: 0; height: 32px; z-index: 999999;
        background: #1a1815; border-bottom: 1px solid #3a3530; display: flex; align-items: center;
        padding: 0 8px; gap: 8px; font-family: -apple-system, sans-serif; }
      #gm-popup-bar span { flex: 1; font-size: 11px; color: #8a8070; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      #gm-popup-bar button { background: none; border: 1px solid #3a3530; border-radius: 3px;
        padding: 2px 10px; color: #c9a96e; font-size: 11px; cursor: pointer; flex-shrink: 0; }
      #gm-popup-bar button:hover { background: #2a2520; border-color: #c9a96e; }
      body { padding-top: 32px !important; }
    `).catch(() => {});
    const safeUrl = currentUrl.replace(/[`$\\]/g, '\\$&').replace(/'/g, "\\'");
    popup.webContents.executeJavaScript(`
      if (!document.getElementById('gm-popup-bar')) {
        const bar = document.createElement('div');
        bar.id = 'gm-popup-bar';
        const urlSpan = document.createElement('span');
        urlSpan.textContent = '${safeUrl}';
        bar.appendChild(urlSpan);
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copia URL';
        copyBtn.addEventListener('click', () => navigator.clipboard.writeText(window.location.href));
        bar.appendChild(copyBtn);
        const extBtn = document.createElement('button');
        extBtn.textContent = 'Apri nel browser';
        extBtn.addEventListener('click', () => window.__gmOpenExternal(window.location.href));
        bar.appendChild(extBtn);
        document.body.prepend(bar);
      }
    `).catch(() => {});
  });

  popup.loadURL(url);
  // Prevent popup from navigating to non-http URLs
  popup.webContents.on('will-navigate', (event, navUrl) => {
    if (!navUrl.startsWith('http://') && !navUrl.startsWith('https://')) {
      event.preventDefault();
    }
  });
  popup.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    if (newUrl.startsWith('http://') || newUrl.startsWith('https://')) {
      popup.loadURL(newUrl);
    }
    return { action: 'deny' };
  });
}

// === IPC Handlers ===

// Open project folder in system file explorer
ipcMain.handle('open-project-folder', async (_, folderPath) => {
  try { await shell.openPath(folderPath); } catch (e) { console.error('open-project-folder:', e.message); }
});

// Open URL in system default browser (solo http/https)
ipcMain.handle('open-external', async (_, url) => {
  try {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
    }
  } catch (e) { console.error('open-external:', e.message); }
});

// Open URL in popup browser window (in-app)
ipcMain.handle('open-popup-browser', (_, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    openPopupBrowser(url);
  }
});

// Project management
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0].replace(/\\/g, '/');
  }
  return null;
});

ipcMain.handle('get-recent-projects', () => {
  return store.get('recentProjects');
});

ipcMain.handle('add-recent-project', (event, project) => {
  const projects = store.get('recentProjects');
  // Remove if already exists (to re-add at top with updated timestamp)
  const filtered = projects.filter(p => p.path !== project.path);
  filtered.unshift(project);
  // Keep max 20 recent projects
  const trimmed = filtered.slice(0, 20);
  store.set('recentProjects', trimmed);
  return trimmed;
});

ipcMain.handle('remove-recent-project', (event, projectPath) => {
  const projects = store.get('recentProjects');
  const filtered = projects.filter(p => p.path !== projectPath);
  store.set('recentProjects', filtered);
  const escapedPath = projectPath.replace(/\./g, '\\.');
  store.delete(`projectStates.${escapedPath}`);
  return filtered;
});

// === Path conversion helpers (absolute ↔ relative for portability) ===
function convertPath(filePath, projectPath, toRelative) {
  if (!filePath || typeof filePath !== 'string') return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  if (toRelative) {
    if (!path.isAbsolute(normalized)) return normalized; // già relativo
    return path.relative(projectPath, normalized).replace(/\\/g, '/');
  } else {
    if (path.isAbsolute(normalized)) return normalized; // già assoluto (retrocompat)
    return path.resolve(projectPath, normalized).replace(/\\/g, '/');
  }
}

function convertStatePaths(state, projectPath, toRelative) {
  if (!state) return state;
  const s = JSON.parse(JSON.stringify(state)); // deep clone
  const c = (p) => convertPath(p, projectPath, toRelative);

  // viewerDocument
  if (s.viewerDocument?.path) s.viewerDocument.path = c(s.viewerDocument.path);

  // calFile
  if (s.calFile?.path) s.calFile.path = c(s.calFile.path);

  // slotDocuments A/B/C
  if (s.slotDocuments) {
    for (const slot of ['A', 'B', 'C']) {
      if (!Array.isArray(s.slotDocuments[slot])) continue;
      s.slotDocuments[slot] = s.slotDocuments[slot].map(item => ({
        ...item,
        ...(item.path ? { path: c(item.path) } : {}),
        ...(item.sourcePath ? { sourcePath: c(item.sourcePath) } : {})
      }));
    }
  }

  // notes
  if (Array.isArray(s.notes)) {
    s.notes = s.notes.map(n => n.sourcePath ? { ...n, sourcePath: c(n.sourcePath) } : n);
  }

  // checklist
  if (Array.isArray(s.checklist)) {
    s.checklist = s.checklist.map(item => item.sourcePath ? { ...item, sourcePath: c(item.sourcePath) } : item);
  }

  // viewerTabs
  if (Array.isArray(s.viewerTabs)) {
    s.viewerTabs = s.viewerTabs.map(tab => {
      if (tab.file?.path) return { ...tab, file: { ...tab.file, path: c(tab.file.path) } };
      return tab;
    });
  }

  // savedMediaItems
  if (Array.isArray(s.savedMediaItems)) {
    s.savedMediaItems = s.savedMediaItems.map(item => item.path ? { ...item, path: c(item.path) } : item);
  }

  return s;
}

ipcMain.handle('get-project-state', (event, projectPath) => {
  const escapedPath = projectPath.replace(/\./g, '\\.');
  const state = store.get(`projectStates.${escapedPath}`);
  return state ? convertStatePaths(decryptProjectState(state), projectPath, false) : null;
});

ipcMain.handle('save-project-state', (event, projectPath, state) => {
  const escapedPath = projectPath.replace(/\./g, '\\.');
  store.set(`projectStates.${escapedPath}`, encryptProjectState(convertStatePaths(state, projectPath, true)));
});

// File system
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = entries
      .filter(e => !e.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name).replace(/\\/g, '/'),
        isDirectory: entry.isDirectory(),
        extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase()
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    return result;
  } catch (err) {
    logDiag('error', `read-directory fallito: ${dirPath} — ${err.message}`);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (err) {
    logDiag('error', `read-file fallito: ${filePath} — ${err.message}`);
    return null;
  }
});

ipcMain.handle('read-file-binary', async (event, filePath) => {
  try { return fs.readFileSync(filePath); }
  catch (err) {
    logDiag('error', `read-file-binary fallito: ${filePath} — ${err.message}`);
    return null;
  }
});

ipcMain.handle('get-file-url', async (event, filePath) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `app://local/-/${normalizedPath}`;
});

ipcMain.handle('search-files', async (event, folderPath, query) => {
  const results = [];
  const queryLower = query.toLowerCase();
  let totalMatches = 0;
  const SNIPPET_RADIUS = 80;

  function stripHtmlTags(html) {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<[^>]+>/g, '');
  }

  function extractSnippet(content, matchIndex, qLen) {
    const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
    const end = Math.min(content.length, matchIndex + qLen + SNIPPET_RADIUS);
    let snippet = '';
    if (start > 0) snippet += '...';
    snippet += content.substring(start, end);
    if (end < content.length) snippet += '...';
    return snippet;
  }

  function searchDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.md', '.html', '.htm', '.txt'].includes(ext)) {
            try {
              const rawContent = fs.readFileSync(fullPath, 'utf-8');
              // For HTML files, search in stripped text
              const searchContent = (ext === '.html' || ext === '.htm')
                ? stripHtmlTags(rawContent) : rawContent;
              const searchLower = searchContent.toLowerCase();

              if (!searchLower.includes(queryLower)) continue;

              const matchingLines = [];
              const lines = searchContent.split('\n');
              let charOffset = 0;
              for (let i = 0; i < lines.length; i++) {
                const lineLower = lines[i].toLowerCase();
                let pos = 0;
                while ((pos = lineLower.indexOf(queryLower, pos)) !== -1) {
                  const offset = charOffset + pos;
                  const snippet = extractSnippet(searchContent, offset, query.length);
                  matchingLines.push({ line: i + 1, text: snippet, offset });
                  pos += queryLower.length;
                  if (matchingLines.length >= 10) break;
                }
                charOffset += lines[i].length + 1; // +1 for \n
                if (matchingLines.length >= 10) break;
              }

              if (matchingLines.length > 0) {
                const relPath = path.relative(folderPath, fullPath).replace(/\\/g, '/');
                totalMatches += matchingLines.length;
                results.push({
                  path: fullPath.replace(/\\/g, '/'),
                  relativePath: relPath,
                  name: entry.name,
                  matches: matchingLines
                });
              }
            } catch (e) { logDiag('warn', 'search-read-skip', e.message); }
          }
        }
        if (results.length >= 50) return;
      }
    } catch (e) { logDiag('warn', 'search-dir-skip', e.message); }
  }

  searchDir(folderPath);
  return { results, totalMatches, totalFiles: results.length };
});

// File picker (project-scoped)
ipcMain.handle('select-project-file', async (event, projectPath, customFilters) => {
  const filters = customFilters || [
    { name: 'Documenti', extensions: ['md', 'html', 'htm', 'pdf'] }
  ];
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: projectPath,
    filters,
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return path.relative(projectPath, filePath).replace(/\\/g, '/');
});

// Copy file to destination folder
ipcMain.handle('copy-file', async (event, sourcePath, destFolder) => {
  try {
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destFolder, fileName);
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
    return { success: true, destPath: destPath.replace(/\\/g, '/') };
  } catch (err) {
    return { error: err.message };
  }
});

// Import files/folders via drag & drop
ipcMain.handle('import-items', async (event, sourcePaths, destFolder) => {
  const result = { imported: 0, renamed: [], errors: [] };
  try {
    const resolvedDest = path.resolve(destFolder);
    const allowed = store.get('recentProjects').map(p => path.resolve(p.path));
    const isAllowed = allowed.some(root => resolvedDest.startsWith(root + path.sep) || resolvedDest === root);
    if (!isAllowed) {
      logDiag('warn', `import-items bloccato: dest fuori progetto: ${resolvedDest}`);
      return { ...result, errors: ['Destination folder is outside any known project'] };
    }
    if (!fs.existsSync(resolvedDest)) fs.mkdirSync(resolvedDest, { recursive: true });
    for (const src of sourcePaths) {
      try {
        const stat = fs.statSync(src);
        const name = path.basename(src);
        const destPath = findUniqueName(resolvedDest, name);
        const finalName = path.basename(destPath);
        if (stat.isDirectory()) {
          fs.cpSync(src, destPath, { recursive: true });
        } else {
          fs.copyFileSync(src, destPath);
        }
        result.imported++;
        if (finalName !== name) result.renamed.push(`${name} → ${finalName}`);
      } catch (err) {
        const msg = `${path.basename(src)}: ${err.message}`;
        result.errors.push(msg);
        logDiag('warn', `import-items errore: ${msg}`);
      }
    }
  } catch (err) {
    result.errors.push(err.message);
    logDiag('warn', `import-items errore generale: ${err.message}`);
  }
  return result;
});

// Folder picker scoped to project
ipcMain.handle('select-project-subfolder', async (event, projectPath) => {
  const normalizedDefault = path.resolve(projectPath);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Scegli cartella di destinazione',
    defaultPath: normalizedDefault,
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selected = path.resolve(result.filePaths[0]);
  if (!selected.startsWith(path.resolve(projectPath))) return null;
  return selected.replace(/\\/g, '/');
});

// Window controls
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => mainWindow.close());

// === App info ===
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-diagnostics', () => {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osVersion: require('os').release(),
    locale: app.getLocale(),
    screen: `${primaryDisplay.size.width}x${primaryDisplay.size.height} @${primaryDisplay.scaleFactor}x`,
    installPath: app.getAppPath(),
    userData: app.getPath('userData'),
    isDev,
    log: diagLog.slice()
  };
});

ipcMain.handle('export-diagnostics', () => {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const diagDir = path.join(app.getPath('userData'), 'diagnostics');

  // Clean old files
  if (fs.existsSync(diagDir)) {
    for (const f of fs.readdirSync(diagDir)) {
      fs.unlinkSync(path.join(diagDir, f));
    }
  } else {
    fs.mkdirSync(diagDir, { recursive: true });
  }

  // System info
  const sysInfo = [
    `GENKAI GM Dashboard — Diagnostica`,
    `══════════════════════════════════`,
    `Versione: ${app.getVersion()}`,
    `Electron: ${process.versions.electron}`,
    `Chrome: ${process.versions.chrome}`,
    `Node: ${process.versions.node}`,
    `OS: ${process.platform} ${os.release()} (${process.arch})`,
    `Locale: ${app.getLocale()}`,
    `Schermo: ${primaryDisplay.size.width}x${primaryDisplay.size.height} @${primaryDisplay.scaleFactor}x`,
    `Percorso app: ${app.getAppPath()}`,
    `Dati utente: ${app.getPath('userData')}`,
    `Dev mode: ${isDev}`,
    `Memoria: ${Math.round(os.totalmem() / 1024 / 1024)} MB totale, ${Math.round(os.freemem() / 1024 / 1024)} MB libera`,
    `Uptime OS: ${Math.round(os.uptime() / 60)} minuti`,
    `══════════════════════════════════`,
    `Esportazione: ${new Date().toISOString()}`
  ].join('\n');

  // Event log
  const logLines = diagLog.length > 0
    ? diagLog.map(e => `[${e.time}] ${e.type.toUpperCase().padEnd(7)} ${e.msg}`).join('\n')
    : '(nessun evento registrato)';

  // Write files
  fs.writeFileSync(path.join(diagDir, 'sistema.txt'), sysInfo, 'utf-8');
  fs.writeFileSync(path.join(diagDir, 'eventi.txt'), logLines, 'utf-8');

  // Check for electron-updater log
  const updaterLog = path.join(app.getPath('userData'), 'logs', 'main.log');
  if (fs.existsSync(updaterLog)) {
    fs.copyFileSync(updaterLog, path.join(diagDir, 'updater.log'));
  }

  // Create zip
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipName = `diagnostica-${timestamp}.zip`;
  const zipPath = path.join(diagDir, zipName);
  const zip = new AdmZip();
  for (const f of fs.readdirSync(diagDir)) {
    if (f.endsWith('.zip')) continue;
    zip.addLocalFile(path.join(diagDir, f));
  }
  zip.writeZip(zipPath);

  // Remove raw files, keep only zip
  for (const f of fs.readdirSync(diagDir)) {
    if (!f.endsWith('.zip')) {
      fs.unlinkSync(path.join(diagDir, f));
    }
  }

  // Open folder
  shell.openPath(diagDir);

  return { path: zipPath };
});

// === Auto-Update IPC ===
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

ipcMain.handle('start-update-download', () => {
  autoUpdater.downloadUpdate();
});

// === Telegram ===
ipcMain.handle('telegram-verify-token', async (event, token) => {
  return await verifyToken(token);
});

ipcMain.handle('telegram-start-bot', async (event, token, sessionCode, players) => {
  logDiag('info', `Telegram bot avvio (sessione: ${sessionCode}, players: ${players?.length || 0})`);
  // Forward bot events to renderer
  gmBot.removeAllListeners('player-joined');
  gmBot.removeAllListeners('player-left');
  gmBot.removeAllListeners('message-received');
  gmBot.on('player-joined', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-player-joined', data);
    }
  });
  gmBot.on('player-left', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-player-left', data);
    }
  });
  gmBot.on('message-received', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-message-received', data);
    }
  });
  gmBot.on('gm-private-message', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-gm-private', data);
    }
  });
  gmBot.on('manual-search', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-manual-search', data);
    }
  });
  gmBot.on('manual-select', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telegram-manual-select', data);
    }
  });
  try {
    const result = await gmBot.start(token, sessionCode, players);
    logDiag('info', 'Telegram bot avviato');
    return result;
  } catch (err) {
    logDiag('error', `Telegram bot avvio fallito: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('telegram-stop-bot', async () => {
  logDiag('info', 'Telegram bot fermato');
  await gmBot.stop();
});

ipcMain.handle('telegram-update-session', (event, sessionCode, players) => {
  gmBot.updateSession(sessionCode, players);
});

ipcMain.handle('telegram-send-message', async (event, chatId, text) => {
  return await gmBot.sendMessage(chatId, text);
});

ipcMain.handle('telegram-send-photo', async (event, chatId, filePath, caption) => {
  return await gmBot.sendPhoto(chatId, filePath, caption);
});

ipcMain.handle('telegram-send-document', async (event, chatId, filePath, caption) => {
  return await gmBot.sendDocument(chatId, filePath, caption);
});

ipcMain.handle('telegram-send-html-as-photo', async (event, chatId, htmlFilePath, caption) => {
  try {
    const buffer = await htmlToImage(BrowserWindow, htmlFilePath);
    return await gmBot.sendPhoto(chatId, buffer, caption);
  } catch (err) {
    logDiag('error', `Telegram send-html-as-photo fallito: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('telegram-send-reply', async (event, chatId, text) => {
  return await gmBot.sendMessage(chatId, text);
});

ipcMain.handle('telegram-get-bot-info', () => {
  if (!gmBot.running || !gmBot.botInfo) return null;
  return { username: gmBot.botInfo.username, firstName: gmBot.botInfo.first_name };
});

// === AI ===

// Global AI config (encrypted in global-settings store)
ipcMain.handle('get-global-ai-config', () => {
  const config = globalStore.get('globalAiConfig');
  if (!config) return { enabled: false, provider: '', apiKey: '', openaiImageKey: '', model: '', effort: 'medium' };
  return { ...config, apiKey: safeDecrypt(config.apiKey), openaiImageKey: safeDecrypt(config.openaiImageKey) };
});

ipcMain.handle('set-global-ai-config', (event, config) => {
  const encrypted = {
    ...config,
    apiKey: config.apiKey ? safeEncrypt(config.apiKey) : '',
    openaiImageKey: config.openaiImageKey ? safeEncrypt(config.openaiImageKey) : ''
  };
  globalStore.set('globalAiConfig', encrypted);
  return true;
});

// Helper: resolve effective AI config (project → global → Firebase)
function getEffectiveAiConfig(projectAiConfig) {
  if (projectAiConfig?.apiKey && projectAiConfig?.provider) return projectAiConfig;
  const global = globalStore.get('globalAiConfig');
  if (global?.enabled && global?.apiKey) {
    const decrypted = { ...global, apiKey: safeDecrypt(global.apiKey), openaiImageKey: safeDecrypt(global.openaiImageKey) };
    return decrypted;
  }
  return null; // fallback to Firebase owner key
}

ipcMain.handle('ai-chat', async (event, messages, projectPath, options = {}) => {
  logDiag('info', `AI chat richiesta (${messages.length} messaggi)`);
  try {
    // Read AI config from project state (decrypt sensitive fields)
    const escapedPath = projectPath.replace(/\./g, '\\.');
    const projectState = decryptProjectState(store.get(`projectStates.${escapedPath}`));
    const aiConfig = projectState?.aiConfig;

    // Resolve: project key → global key → Firebase owner key
    const effectiveConfig = getEffectiveAiConfig(aiConfig);

    let provider, apiKey, model, usage, allowance;

    if (effectiveConfig) {
      // Usa key personale (progetto o globale)
      provider = effectiveConfig.provider;
      apiKey = effectiveConfig.apiKey;
      model = effectiveConfig.model || aiConfig?.model || (provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-5-mini');
    } else {
      // Usa key owner da Firebase
      const user = firebase.getCurrentUser();
      if (!user) return { error: 'Effettua il login per usare la quota gratuita AI' };

      const config = await firebase.fetchAiConfig();
      if (!config || config.error) {
        const detail = config?.error || 'documento config/ai non trovato in Firestore';
        logDiag('error', `AI config non disponibile: ${detail}`);
        return { error: `Configurazione AI non disponibile (${detail})` };
      }

      usage = await firebase.getAiUsage(user.uid);
      allowance = usage.customAllowance || config.tokenAllowance || 1000000;
      if (usage.tokensUsed >= allowance) {
        return { error: `Quota gratuita esaurita (${usage.tokensUsed.toLocaleString()} token usati su ${allowance.toLocaleString()} disponibili). Per continuare, configura una chiave API nelle Impostazioni.` };
      }

      provider = config.defaultProvider || 'openai';
      apiKey = provider === 'anthropic' ? config.ownerKeyAnthropic : config.ownerKeyOpenai;
      model = config.defaultModel || 'gpt-5-mini';

      if (!apiKey) return { error: 'Chiave AI dell\'app non configurata' };
    }

    // Build context from project files
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const question = lastUserMsg?.content || '';
    const contextMaxChars = aiConfig?.contextMaxChars || 16000;
    const context = aiApi.buildContext(projectPath, question, options.allowedFiles || null, options.allowedFiles ? undefined : contextMaxChars);
    const projectName = projectState?.settings?.projectName || projectPath.split('/').pop();
    logDiag('info', `AI context: projectPath=${projectPath}, question="${question.substring(0, 50)}", contextLength=${context.length}, allowedFiles=${options.allowedFiles ? options.allowedFiles.length : 'null'}`);
    const systemPrompt = options.systemPromptOverride
      ? options.systemPromptOverride + (context ? '\n\n=== DOCUMENTI ATTIVI ===\n' + context : '')
      : aiApi.buildSystemPrompt(context, projectName);

    // Compose full messages: system + conversation
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const effort = effectiveConfig?.effort || aiConfig?.effort || undefined;
    const maxTokens = options.maxTokens || 1024;
    const result = await aiApi.chat({ provider, apiKey, model, maxTokens, effort }, fullMessages);

    // Increment usage if using owner key (no personal/global key) and return quota info
    if (!effectiveConfig && result.tokensUsed) {
      const user = firebase.getCurrentUser();
      if (user) {
        await firebase.incrementAiUsage(user.uid, result.tokensUsed);
        const newTokensUsed = (usage.tokensUsed || 0) + result.tokensUsed;
        result.quota = {
          tokensUsed: newTokensUsed,
          tokenAllowance: allowance,
          remaining: Math.max(0, allowance - newTokensUsed)
        };
      }
    }

    return result;
  } catch (err) {
    logDiag('error', `AI chat fallita: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('ai-verify-key', async (event, provider, key) => {
  return await aiApi.verifyKey(provider, key);
});

ipcMain.handle('ai-get-quota', async () => {
  try {
    const user = firebase.getCurrentUser();
    if (!user) return { error: 'Non autenticato' };

    const config = await firebase.fetchAiConfig();
    if (!config || config.error) return { tokensUsed: 0, tokenAllowance: 0, remaining: 0 };

    const usage = await firebase.getAiUsage(user.uid);
    const allowance = usage.customAllowance || config.tokenAllowance || 1000000;
    return {
      tokensUsed: usage.tokensUsed || 0,
      tokenAllowance: allowance,
      remaining: Math.max(0, allowance - (usage.tokensUsed || 0))
    };
  } catch (err) {
    logDiag('error', `AI quota check fallito: ${err.message}`);
    return { error: err.message };
  }
});

// === AI Image Generation ===
ipcMain.handle('ai-generate-image', async (event, prompt, projectPath, options = {}) => {
  logDiag('info', `AI genera immagine: "${prompt.substring(0, 50)}..."`);
  try {
    const escapedPath = projectPath.replace(/\./g, '\\.');
    const projectState = decryptProjectState(store.get(`projectStates.${escapedPath}`));
    const aiConfig = projectState?.aiConfig;

    // Cascata key OpenAI per immagini: progetto → globale → Firebase owner
    let apiKey = null;
    let usingOwnerKey = false;

    if (aiConfig?.provider === 'openai' && aiConfig?.apiKey) {
      apiKey = aiConfig.apiKey;
    } else if (aiConfig?.openaiImageKey) {
      apiKey = aiConfig.openaiImageKey;
    } else {
      // Try global config
      const globalCfg = globalStore.get('globalAiConfig');
      if (globalCfg?.enabled) {
        if (globalCfg.provider === 'openai' && globalCfg.apiKey) {
          apiKey = safeDecrypt(globalCfg.apiKey);
        } else if (globalCfg.openaiImageKey) {
          apiKey = safeDecrypt(globalCfg.openaiImageKey);
        }
      }
    }

    if (!apiKey) {
      // Fallback: owner key da Firebase
      const user = firebase.getCurrentUser();
      if (!user) return { error: 'Per generare immagini serve una chiave OpenAI o il login' };

      const config = await firebase.fetchAiConfig();
      if (!config || config.error) return { error: 'Configurazione AI non disponibile' };
      if (!config.ownerKeyOpenai) return { error: 'Chiave immagini non configurata' };

      // Controlla quota
      const usage = await firebase.getAiUsage(user.uid);
      const allowance = usage.customAllowance || config.tokenAllowance || 1000000;
      const tokensPerImage = config.tokensPerImage || 100000;
      if (usage.tokensUsed + tokensPerImage > allowance) {
        return { error: 'Quota insufficiente per generare un\'immagine' };
      }

      apiKey = config.ownerKeyOpenai;
      usingOwnerKey = true;
    }

    if (!apiKey) return { error: 'Nessuna chiave OpenAI disponibile' };

    // Genera
    const result = await aiApi.generateImage(apiKey, prompt, options);
    if (result.error) return result;

    // Salva file nel progetto
    const dir = path.join(projectPath, '_generated');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const timestamp = Date.now();
    const fileName = `ai-${timestamp}.png`;
    const filePath = path.join(dir, fileName);

    if (result.b64) {
      aiApi.saveBase64Image(result.b64, filePath);
    } else if (result.url) {
      // Download da URL (fallback per modelli che restituiscono URL)
      const urlData = await new Promise((resolve, reject) => {
        const https = require('https');
        https.get(result.url, (res) => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
      fs.writeFileSync(filePath, urlData);
    }

    // Incrementa quota se owner key
    if (usingOwnerKey) {
      const user = firebase.getCurrentUser();
      const config = await firebase.fetchAiConfig();
      const tokensPerImage = config?.tokensPerImage || 100000;
      await firebase.incrementAiUsage(user.uid, tokensPerImage);
      const newTokensUsed = (usage.tokensUsed || 0) + tokensPerImage;
      result.quota = {
        tokensUsed: newTokensUsed,
        tokenAllowance: allowance,
        remaining: Math.max(0, allowance - newTokensUsed)
      };
    }

    return {
      filePath,
      fileName,
      relativePath: `_generated/${fileName}`,
      quota: result.quota || null
    };
  } catch (err) {
    logDiag('error', `AI genera immagine fallita: ${err.message}`);
    return { error: err.message };
  }
});

// === Broadcast ===
ipcMain.handle('fetch-broadcast', async () => {
  try {
    const data = await firebase.fetchBroadcast();
    if (!data || !data.active) return null;
    const appVersion = app.getVersion();
    if (data.minVersion && compareSemver(appVersion, data.minVersion) < 0) return null;
    if (data.maxVersion && compareSemver(appVersion, data.maxVersion) > 0) return null;
    const dismissedId = globalStore.get('dismissedBroadcastId', '');
    const dismissed = !data.persistent && dismissedId === data.id;
    return { ...data, dismissed };
  } catch (err) {
    logDiag('error', `Broadcast fetch fallito: ${err.message}`);
    return null;
  }
});

ipcMain.handle('dismiss-broadcast', (_, messageId) => {
  globalStore.set('dismissedBroadcastId', messageId);
});

// === Firebase Auth ===
ipcMain.handle('firebase-register', async (_, email, password, displayName) => {
  logDiag('info', `Firebase registrazione: ${email}`);
  try {
    const result = await firebase.register(email, password, displayName);
    if (result?.error) logDiag('error', `Firebase registrazione fallita: ${result.error}`);
    return result;
  } catch (err) {
    logDiag('error', `Firebase registrazione errore: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('firebase-login', async (_, email, password) => {
  logDiag('info', `Firebase login: ${email}`);
  try {
    const result = await firebase.login(email, password);
    if (result?.error) logDiag('error', `Firebase login fallito: ${result.error}`);
    else logDiag('info', 'Firebase login OK');
    return result;
  } catch (err) {
    logDiag('error', `Firebase login errore: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('firebase-logout', async () => {
  logDiag('info', 'Firebase logout');
  await firebase.logout();
});

ipcMain.handle('firebase-get-user', async () => {
  return firebase.getCurrentUser();
});

ipcMain.handle('firebase-auto-login', async () => {
  return await firebase.tryAutoLogin();
});

ipcMain.handle('firebase-reset-password', async (_, email) => {
  logDiag('info', `Firebase reset password: ${email}`);
  return await firebase.resetPassword(email);
});

ipcMain.handle('firebase-update-visibility', async (_, adventureId, visibility) => {
  return await firebase.updateAdventureVisibility(adventureId, visibility);
});

ipcMain.handle('firebase-fetch-my-adventures', async (_, userId) => {
  return await firebase.fetchMyAdventures(userId);
});

// === Adventures ===

ipcMain.handle('adventure-export', async (event, projectPath, metadata, forPublish) => {
  logDiag('info', `Adventure export: ${metadata?.name || 'unnamed'} (publish: ${!!forPublish})`);
  try {
    // Write _adventure.json (exclude internal config fields)
    const { exportExcludes, ...metaClean } = metadata;
    const adventureJson = {
      id: metadata.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      ...metaClean,
      exportedAt: new Date().toISOString().split('T')[0]
    };
    const adventureJsonPath = path.join(projectPath, '_adventure.json');
    fs.writeFileSync(adventureJsonPath, JSON.stringify(adventureJson, null, 2), 'utf-8');

    // Save project state as portable JSON (decrypted keys in chiaro)
    const escapedPath = projectPath.replace(/\./g, '\\.');
    const rawState = store.get(`projectStates.${escapedPath}`);
    if (rawState) {
      const portableState = decryptProjectState(rawState);
      // Strip sensitive keys if includeKeys is false
      const includeKeys = metadata.includeKeys !== false; // default true
      if (!includeKeys) {
        if (portableState.telegram) portableState.telegram.botToken = '';
        if (portableState.aiConfig) {
          portableState.aiConfig.apiKey = '';
          portableState.aiConfig.openaiImageKey = '';
        }
      }
      const statePath = path.join(projectPath, '_project-state.json');
      fs.writeFileSync(statePath, JSON.stringify(portableState, null, 2), 'utf-8');
    }

    // Create zip
    const zip = new AdmZip();

    // Parse export exclude patterns
    const DEFAULT_EXCLUDES = '.git/\nnode_modules/\n.DS_Store\nThumbs.db\n.claude/\nCLAUDE.md\nwebsite/\n*.bak\n*.tmp\n*.log\n*.swp';
    const excludeSource = (metadata.exportExcludes || '').trim() || DEFAULT_EXCLUDES;
    const excludePatterns = excludeSource.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    function shouldExclude(name, isDirectory) {
      // Dotfiles always excluded as safety fallback
      if (name.startsWith('.')) return true;
      for (const pattern of excludePatterns) {
        // *.ext — extension match
        if (pattern.startsWith('*.') && !pattern.includes('*', 1)) {
          const ext = pattern.slice(1); // ".ext"
          if (name.endsWith(ext)) return true;
          continue;
        }
        // name/ — directory-only match
        if (pattern.endsWith('/')) {
          const dirName = pattern.slice(0, -1);
          if (isDirectory && name === dirName) return true;
          continue;
        }
        // *text* — contains
        if (pattern.startsWith('*') && pattern.endsWith('*') && pattern.length > 2) {
          const text = pattern.slice(1, -1);
          if (name.includes(text)) return true;
          continue;
        }
        // text* — starts with
        if (pattern.endsWith('*') && !pattern.startsWith('*')) {
          const text = pattern.slice(0, -1);
          if (name.startsWith(text)) return true;
          continue;
        }
        // *text — ends with
        if (pattern.startsWith('*') && !pattern.endsWith('*')) {
          const text = pattern.slice(1);
          if (name.endsWith(text)) return true;
          continue;
        }
        // Exact name match (file or directory)
        if (name === pattern) return true;
      }
      return false;
    }

    function addDir(dirPath, zipPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (shouldExclude(entry.name, entry.isDirectory())) continue;
        const fullPath = path.join(dirPath, entry.name);
        const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDir(fullPath, entryZipPath);
        } else {
          zip.addLocalFile(fullPath, zipPath || '');
        }
      }
    }

    if (forPublish && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'packaging' });
    }

    addDir(projectPath, '');

    const zipName = adventureJson.id + '.zip';
    let zipPath;

    if (forPublish) {
      // Save to temp for upload
      zipPath = path.join(os.tmpdir(), zipName);
    } else {
      // Ask user where to save
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Esporta avventura',
        defaultPath: path.join(os.homedir(), 'Documents', zipName),
        filters: [{ name: 'Archivio ZIP', extensions: ['zip'] }]
      });
      if (saveResult.canceled || !saveResult.filePath) return { canceled: true };
      zipPath = saveResult.filePath;
    }

    zip.writeZip(zipPath);

    // Cleanup: remove _project-state.json from disk (contains plaintext keys)
    const stateCleanup = path.join(projectPath, '_project-state.json');
    if (fs.existsSync(stateCleanup)) fs.unlinkSync(stateCleanup);

    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    logDiag('info', `Adventure export OK: ${zipName} (${sizeMB} MB)`);
    return { zipPath, zipName, size: stats.size, sizeMB, metadata: adventureJson };
  } catch (err) {
    logDiag('error', `Adventure export fallito: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('adventure-import-from-file', async () => {
  logDiag('info', 'Adventure import da file');
  try {
    // Pick zip file
    const zipResult = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Pacchetto avventura', extensions: ['zip'] }],
      properties: ['openFile']
    });
    if (zipResult.canceled || zipResult.filePaths.length === 0) return null;

    // Pick destination folder
    const destResult = await dialog.showOpenDialog(mainWindow, {
      title: 'Scegli dove estrarre l\'avventura',
      properties: ['openDirectory', 'createDirectory']
    });
    if (destResult.canceled || destResult.filePaths.length === 0) return null;

    const zipFile = zipResult.filePaths[0];
    const destFolder = destResult.filePaths[0];
    const zipBaseName = path.basename(zipFile, '.zip');
    const extractPath = path.join(destFolder, zipBaseName);

    // Create extract dir
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

    const zip = new AdmZip(zipFile);
    zip.extractAllTo(extractPath, true);

    // Read _adventure.json if present
    let metadata = null;
    const metaPath = path.join(extractPath, '_adventure.json');
    if (fs.existsSync(metaPath)) {
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch (e) { logDiag('error', 'adventure-meta-parse', e.message); }
    }

    // Restore project state from _project-state.json if present
    const stateJsonPath = path.join(extractPath, '_project-state.json');
    if (fs.existsSync(stateJsonPath)) {
      try {
        const portableState = JSON.parse(fs.readFileSync(stateJsonPath, 'utf-8'));
        const projectPathKey = extractPath.replace(/\\/g, '/');
        const escapedKey = projectPathKey.replace(/\./g, '\\.');
        store.set(`projectStates.${escapedKey}`, encryptProjectState(portableState));
        // Remove plaintext state file from disk
        fs.unlinkSync(stateJsonPath);
        logDiag('info', 'Project state restored from _project-state.json');
      } catch (e) { logDiag('error', 'project-state-restore', e.message); }
    }

    const projectPath = extractPath.replace(/\\/g, '/');
    const projectName = metadata?.name || zipBaseName;

    logDiag('info', `Adventure import OK: ${projectName}`);
    return { path: projectPath, name: projectName, metadata };
  } catch (err) {
    logDiag('error', `Adventure import fallito: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('adventure-fetch-catalog', async () => {
  return await firebase.fetchPublicAdventures();
});

ipcMain.handle('adventure-get-download-quota', () => {
  const quota = getDownloadQuota();
  return {
    bytesUsed: quota.bytesUsed,
    limit: DAILY_DOWNLOAD_LIMIT,
    remaining: Math.max(0, DAILY_DOWNLOAD_LIMIT - quota.bytesUsed),
    remainingMB: Math.max(0, (DAILY_DOWNLOAD_LIMIT - quota.bytesUsed) / (1024 * 1024)).toFixed(1)
  };
});

ipcMain.handle('adventure-download', async (event, url, adventureName) => {
  logDiag('info', `Adventure download: ${adventureName}`);
  try {
    // Check download quota
    const quota = getDownloadQuota();
    const remaining = DAILY_DOWNLOAD_LIMIT - quota.bytesUsed;
    if (remaining <= 0) {
      return { error: 'Quota di download giornaliera esaurita (100 MB/giorno). Riprova domani.' };
    }

    // Pick destination folder
    const destResult = await dialog.showOpenDialog(mainWindow, {
      title: 'Scegli dove scaricare l\'avventura',
      defaultPath: path.join(os.homedir(), 'Documents'),
      properties: ['openDirectory', 'createDirectory']
    });
    if (destResult.canceled || destResult.filePaths.length === 0) return { canceled: true };

    const destFolder = destResult.filePaths[0];

    // Download with progress
    const buffer = await firebase.downloadAdventureZip(url, (downloaded, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adventure-progress', {
          phase: 'download',
          downloaded,
          total,
          percent: total > 0 ? Math.round((downloaded / total) * 100) : 0
        });
      }
    });

    // Extract
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'extracting' });
    }

    const safeName = adventureName.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_') || 'adventure';
    const extractPath = path.join(destFolder, safeName);
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

    const zip = new AdmZip(buffer);
    zip.extractAllTo(extractPath, true);

    // Record download bytes for quota tracking
    recordDownloadBytes(buffer.length);

    // Read _adventure.json if present
    let metadata = null;
    const metaPath = path.join(extractPath, '_adventure.json');
    if (fs.existsSync(metaPath)) {
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch (e) { logDiag('error', 'adventure-meta-parse', e.message); }
    }

    // Restore project state from _project-state.json if present
    const stateJsonPath = path.join(extractPath, '_project-state.json');
    if (fs.existsSync(stateJsonPath)) {
      try {
        const portableState = JSON.parse(fs.readFileSync(stateJsonPath, 'utf-8'));
        const projectPathKey = extractPath.replace(/\\/g, '/');
        const escapedKey = projectPathKey.replace(/\./g, '\\.');
        store.set(`projectStates.${escapedKey}`, encryptProjectState(portableState));
        // Remove plaintext state file from disk
        fs.unlinkSync(stateJsonPath);
        logDiag('info', 'Project state restored from _project-state.json');
      } catch (e) { logDiag('error', 'project-state-restore', e.message); }
    }

    const projectPath = extractPath.replace(/\\/g, '/');
    const projectName = metadata?.name || safeName;

    // Return download quota info
    const updatedQuota = getDownloadQuota();
    return {
      path: projectPath, name: projectName, metadata,
      downloadQuota: {
        remaining: Math.max(0, DAILY_DOWNLOAD_LIMIT - updatedQuota.bytesUsed),
        remainingMB: Math.max(0, (DAILY_DOWNLOAD_LIMIT - updatedQuota.bytesUsed) / (1024 * 1024)).toFixed(1)
      }
    };
  } catch (err) {
    logDiag('error', `Adventure download fallito: ${err.message}`);
    return { error: err.message };
  }
});

// === Adventure publish operations ===

ipcMain.handle('adventure-publish', async (event, zipPath, metadata) => {
  logDiag('info', `Adventure publish: ${metadata?.id || 'unknown'}`);
  try {
    const user = firebase.getCurrentUser();
    if (!user) return { error: 'Non sei autenticato' };

    const adventureId = metadata.id;
    const zipBuffer = fs.readFileSync(zipPath);
    const sizeMB = (zipBuffer.length / (1024 * 1024)).toFixed(1) + ' MB';

    // Step 1: Upload ZIP a Firebase Storage
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'uploading', percent: 0 });
    }

    const uploadResult = await firebase.uploadAdventureZip(user.uid, adventureId, zipBuffer, (percent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adventure-progress', { phase: 'uploading', percent });
      }
    });
    if (uploadResult.error) return { error: uploadResult.error };

    // Step 2: Salva metadata in Firestore
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'updating-catalog' });
    }

    const firestoreData = {
      name: metadata.name,
      system: metadata.system || '',
      authorId: user.uid,
      authorName: user.displayName || '',
      version: metadata.version || '1.0',
      description: metadata.description || '',
      players: metadata.players || '',
      duration: metadata.duration || '',
      language: metadata.language || 'it',
      tags: metadata.tags || [],
      visibility: metadata.visibility || 'public',
      size: sizeMB,
      downloadUrl: uploadResult.downloadUrl,
      publishedAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const pubResult = await firebase.publishAdventure(adventureId, firestoreData);
    if (pubResult.error) return { error: pubResult.error };

    logDiag('info', 'Adventure publish OK');
    return { success: true, downloadUrl: uploadResult.downloadUrl };
  } catch (err) {
    logDiag('error', `Adventure publish fallito: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('adventure-unpublish', async (event, adventureId) => {
  logDiag('info', `Adventure unpublish: ${adventureId}`);
  try {
    const user = firebase.getCurrentUser();
    if (!user) return { error: 'Non sei autenticato' };

    // Elimina file ZIP da Storage
    await firebase.deleteAdventureZip(user.uid, adventureId);

    // Elimina documento da Firestore
    const result = await firebase.unpublishAdventure(adventureId);
    if (result.error) return { error: result.error };

    logDiag('info', `Adventure unpublish OK: ${adventureId}`);
    return { success: true };
  } catch (err) {
    logDiag('error', `Adventure unpublish fallito: ${err.message}`);
    return { error: err.message };
  }
});
