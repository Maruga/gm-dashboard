const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
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
  defaults: { firebaseCredentials: null, downloadQuota: { date: '', bytesUsed: 0 } }
});

// ── Download quota (100 MB/giorno) ──
const DAILY_DOWNLOAD_LIMIT = 100 * 1024 * 1024;

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
    autoUpdater.autoDownload = true;
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

    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// === IPC Handlers ===

// Open project folder in system file explorer
ipcMain.handle('open-project-folder', async (_, folderPath) => {
  await shell.openPath(folderPath);
});

// Open URL in system default browser
ipcMain.handle('open-external', async (_, url) => {
  await shell.openExternal(url);
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

ipcMain.handle('ai-chat', async (event, messages, projectPath, options = {}) => {
  logDiag('info', `AI chat richiesta (${messages.length} messaggi)`);
  try {
    // Read AI config from project state
    const states = store.get('projectStates');
    const projectState = states[projectPath];
    const aiConfig = projectState?.aiConfig;

    let provider, apiKey, model;

    if (aiConfig?.apiKey && aiConfig?.provider) {
      // Utente ha la sua key
      provider = aiConfig.provider;
      apiKey = aiConfig.apiKey;
      model = aiConfig.model || (provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-5-mini');
    } else {
      // Usa key owner da Firebase
      const user = firebase.getCurrentUser();
      if (!user) return { error: 'Effettua il login per usare la quota gratuita AI' };

      const config = await firebase.fetchAiConfig();
      if (!config || config.error) return { error: 'Configurazione AI non disponibile' };

      const usage = await firebase.getAiUsage(user.uid);
      const allowance = usage.customAllowance || config.tokenAllowance || 1000000;
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
    const context = aiApi.buildContext(projectPath, question, options.allowedFiles || null);
    const projectName = projectState?.settings?.projectName || projectPath.split('/').pop();
    const systemPrompt = aiApi.buildSystemPrompt(context, projectName);

    // Compose full messages: system + conversation
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const effort = aiConfig?.effort || undefined;
    const result = await aiApi.chat({ provider, apiKey, model, maxTokens: 1024, effort }, fullMessages);

    // Increment usage if using owner key and return quota info
    if (!aiConfig?.apiKey && result.tokensUsed) {
      const user = firebase.getCurrentUser();
      if (user) {
        await firebase.incrementAiUsage(user.uid, result.tokensUsed);
        const updatedUsage = await firebase.getAiUsage(user.uid);
        const config = await firebase.fetchAiConfig();
        const allowance = updatedUsage.customAllowance || config?.tokenAllowance || 1000000;
        result.quota = {
          tokensUsed: updatedUsage.tokensUsed || 0,
          tokenAllowance: allowance,
          remaining: Math.max(0, allowance - (updatedUsage.tokensUsed || 0))
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
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
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
      try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
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
