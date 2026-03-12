const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { GmDashBot, verifyToken, htmlToImage } = require('./telegramBot');
const github = require('./githubApi');
const AdmZip = require('adm-zip');
const os = require('os');
const Store = require('electron-store').default;

const isDev = !app.isPackaged;

const gmBot = new GmDashBot();

const store = new Store({
  defaults: {
    recentProjects: [],
    projectStates: {},
    windowBounds: { width: 1400, height: 900 }
  }
});

let mainWindow;

function createWindow() {
  const bounds = store.get('windowBounds');
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1714',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Open DevTools with F12
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    store.set('windowBounds', { width, height });
  });
}

app.whenReady().then(() => {
  createWindow();

  // === Auto-Updater ===
  if (isDev) {
    console.log('Auto-update disabilitato in dev mode');
  } else {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', { version: info.version });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', { version: info.version });
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err.message);
    });

    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// === IPC Handlers ===

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
  // Optionally remove its state too
  const states = store.get('projectStates');
  delete states[projectPath];
  store.set('projectStates', states);
  return filtered;
});

ipcMain.handle('get-project-state', (event, projectPath) => {
  const states = store.get('projectStates');
  return states[projectPath] || null;
});

ipcMain.handle('save-project-state', (event, projectPath, state) => {
  const states = store.get('projectStates');
  states[projectPath] = state;
  store.set('projectStates', states);
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
    console.error('Error reading directory:', err);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
});

ipcMain.handle('get-file-url', async (event, filePath) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `file:///${normalizedPath}`;
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
            } catch (e) { /* skip unreadable files */ }
          }
        }
        if (results.length >= 50) return;
      }
    } catch (e) { /* skip unreadable dirs */ }
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

// === Auto-Update IPC ===
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// === Telegram ===
ipcMain.handle('telegram-verify-token', async (event, token) => {
  return await verifyToken(token);
});

ipcMain.handle('telegram-start-bot', async (event, token, sessionCode, players) => {
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
  return await gmBot.start(token, sessionCode, players);
});

ipcMain.handle('telegram-stop-bot', async () => {
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

// === GitHub ===
ipcMain.handle('github-verify-token', async (event, token) => {
  return await github.verifyToken(token);
});

ipcMain.handle('github-save-token', (event, token) => {
  github.saveToken(token);
});

ipcMain.handle('github-get-token', () => {
  return github.getToken();
});

ipcMain.handle('github-clear-token', () => {
  github.clearToken();
});

// === Adventures ===

ipcMain.handle('adventure-export', async (event, projectPath, metadata, forPublish) => {
  try {
    // Write _adventure.json
    const adventureJson = {
      id: metadata.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      ...metadata,
      exportedAt: new Date().toISOString().split('T')[0]
    };
    const adventureJsonPath = path.join(projectPath, '_adventure.json');
    fs.writeFileSync(adventureJsonPath, JSON.stringify(adventureJson, null, 2), 'utf-8');

    // Create zip
    const zip = new AdmZip();
    const SKIP = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db']);

    function addDir(dirPath, zipPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, entry.name);
        const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDir(fullPath, entryZipPath);
        } else {
          zip.addLocalFile(fullPath, zipPath || '');
        }
      }
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

    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    return { zipPath, zipName, size: stats.size, sizeMB, metadata: adventureJson };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('adventure-import-from-file', async () => {
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
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
    }

    const projectPath = extractPath.replace(/\\/g, '/');
    const projectName = metadata?.name || zipBaseName;

    return { path: projectPath, name: projectName, metadata };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('adventure-fetch-catalog', async () => {
  return await github.fetchCatalog();
});

ipcMain.handle('adventure-download', async (event, url, adventureName) => {
  try {
    // Pick destination folder
    const destResult = await dialog.showOpenDialog(mainWindow, {
      title: 'Scegli dove scaricare l\'avventura',
      defaultPath: path.join(os.homedir(), 'Documents'),
      properties: ['openDirectory', 'createDirectory']
    });
    if (destResult.canceled || destResult.filePaths.length === 0) return { canceled: true };

    const destFolder = destResult.filePaths[0];

    // Download with progress
    const buffer = await github.downloadFile(url, (downloaded, total) => {
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

    // Read _adventure.json if present
    let metadata = null;
    const metaPath = path.join(extractPath, '_adventure.json');
    if (fs.existsSync(metaPath)) {
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
    }

    const projectPath = extractPath.replace(/\\/g, '/');
    const projectName = metadata?.name || safeName;

    return { path: projectPath, name: projectName, metadata };
  } catch (err) {
    return { error: err.message };
  }
});

// === Adventure publish operations ===

ipcMain.handle('adventure-publish', async (event, zipPath, metadata) => {
  try {
    const token = github.getToken();
    if (!token) return { error: 'Token GitHub non configurato' };

    const adventureId = metadata.id;
    const version = metadata.version || '1.0';
    const tag = `adventure-${adventureId}-v${version}`;
    const releaseName = `${metadata.name} v${version}`;

    // Step 1: Create release
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'creating-release' });
    }
    const release = await github.createRelease(tag, releaseName, metadata.description || '', token);

    // Step 2: Upload zip asset
    const zipBuffer = fs.readFileSync(zipPath);
    const fileName = `${adventureId}.zip`;

    const asset = await github.uploadReleaseAsset(release.id, fileName, zipBuffer, token, (sent, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adventure-progress', {
          phase: 'uploading',
          downloaded: sent,
          total,
          percent: total > 0 ? Math.round((sent / total) * 100) : 0
        });
      }
    });

    // Step 3: Update catalog
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adventure-progress', { phase: 'updating-catalog' });
    }

    const { catalog, sha, error: catError } = await github.getCatalogWithSha(token);
    if (catError) return { error: catError };

    const sizeMB = (zipBuffer.length / (1024 * 1024)).toFixed(1) + ' MB';
    const catalogEntry = {
      id: adventureId,
      name: metadata.name,
      system: metadata.system || '',
      author: metadata.author || '',
      authorGithub: (await github.verifyToken(token)).username || '',
      version,
      description: metadata.description || '',
      players: metadata.players || '',
      duration: metadata.duration || '',
      language: metadata.language || 'it',
      size: sizeMB,
      downloadUrl: asset.browser_download_url,
      releaseTag: tag,
      tags: metadata.tags || [],
      publishedAt: new Date().toISOString().split('T')[0]
    };

    // Replace existing or add new
    const idx = catalog.adventures.findIndex(a => a.id === adventureId);
    if (idx >= 0) {
      catalog.adventures[idx] = catalogEntry;
    } else {
      catalog.adventures.push(catalogEntry);
    }

    const updateResult = await github.updateCatalog(catalog, sha, token, `Add adventure: ${metadata.name}`);
    if (updateResult.error) return { error: updateResult.error };

    return { success: true, downloadUrl: asset.browser_download_url };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('adventure-unpublish', async (event, adventureId) => {
  try {
    const token = github.getToken();
    if (!token) return { error: 'Token GitHub non configurato' };

    const { catalog, sha, error: catError } = await github.getCatalogWithSha(token);
    if (catError) return { error: catError };

    catalog.adventures = catalog.adventures.filter(a => a.id !== adventureId);
    const updateResult = await github.updateCatalog(catalog, sha, token, `Remove adventure: ${adventureId}`);
    if (updateResult.error) return { error: updateResult.error };

    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});
