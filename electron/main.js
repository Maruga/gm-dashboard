const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { GmDashBot, verifyToken, htmlToImage } = require('./telegramBot');
const Store = require('electron-store').default;

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

app.whenReady().then(createWindow);

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
ipcMain.handle('select-project-file', async (event, projectPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: projectPath,
    filters: [
      { name: 'Documenti', extensions: ['md', 'html', 'htm', 'pdf'] }
    ],
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
