const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Project management
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  addRecentProject: (project) => ipcRenderer.invoke('add-recent-project', project),
  removeRecentProject: (path) => ipcRenderer.invoke('remove-recent-project', path),
  getProjectState: (path) => ipcRenderer.invoke('get-project-state', path),
  saveProjectState: (path, state) => ipcRenderer.invoke('save-project-state', path, state),

  // Open folder in system explorer
  openProjectFolder: (folderPath) => ipcRenderer.invoke('open-project-folder', folderPath),
  // Open URL in system default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // File system
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readFileBinary: (filePath) => ipcRenderer.invoke('read-file-binary', filePath),
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),
  searchFiles: (folderPath, query) => ipcRenderer.invoke('search-files', folderPath, query),
  selectProjectFile: (projectPath, filters) => ipcRenderer.invoke('select-project-file', projectPath, filters),
  copyFile: (source, destFolder) => ipcRenderer.invoke('copy-file', source, destFolder),
  importItems: (sourcePaths, destFolder) => ipcRenderer.invoke('import-items', sourcePaths, destFolder),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  selectProjectSubfolder: (projectPath) => ipcRenderer.invoke('select-project-subfolder', projectPath),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  exportDiagnostics: () => ipcRenderer.invoke('export-diagnostics'),

  // Auto-update
  onUpdateAvailable: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('update-available', h); return () => ipcRenderer.removeListener('update-available', h); },
  onUpdateProgress: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('update-progress', h); return () => ipcRenderer.removeListener('update-progress', h); },
  onUpdateDownloaded: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('update-downloaded', h); return () => ipcRenderer.removeListener('update-downloaded', h); },
  onUpdateError: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('update-error', h); return () => ipcRenderer.removeListener('update-error', h); },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Telegram
  telegramVerifyToken: (token) => ipcRenderer.invoke('telegram-verify-token', token),
  telegramStartBot: (token, sessionCode, players) => ipcRenderer.invoke('telegram-start-bot', token, sessionCode, players),
  telegramStopBot: () => ipcRenderer.invoke('telegram-stop-bot'),
  telegramUpdateSession: (sessionCode, players) => ipcRenderer.invoke('telegram-update-session', sessionCode, players),
  telegramSendMessage: (chatId, text) => ipcRenderer.invoke('telegram-send-message', chatId, text),
  telegramSendPhoto: (chatId, filePath, caption) => ipcRenderer.invoke('telegram-send-photo', chatId, filePath, caption),
  telegramSendDocument: (chatId, filePath, caption) => ipcRenderer.invoke('telegram-send-document', chatId, filePath, caption),
  telegramSendHtmlAsPhoto: (chatId, htmlFilePath, caption) => ipcRenderer.invoke('telegram-send-html-as-photo', chatId, htmlFilePath, caption),
  telegramGetBotInfo: () => ipcRenderer.invoke('telegram-get-bot-info'),
  telegramSendReply: (chatId, text) => ipcRenderer.invoke('telegram-send-reply', chatId, text),
  onTelegramPlayerJoined: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('telegram-player-joined', h); return () => ipcRenderer.removeListener('telegram-player-joined', h); },
  onTelegramPlayerLeft: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('telegram-player-left', h); return () => ipcRenderer.removeListener('telegram-player-left', h); },
  onTelegramMessageReceived: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('telegram-message-received', h); return () => ipcRenderer.removeListener('telegram-message-received', h); },

  // Broadcast
  fetchBroadcast: () => ipcRenderer.invoke('fetch-broadcast'),
  dismissBroadcast: (messageId) => ipcRenderer.invoke('dismiss-broadcast', messageId),

  // Firebase Auth
  firebaseRegister: (email, password, displayName) => ipcRenderer.invoke('firebase-register', email, password, displayName),
  firebaseLogin: (email, password) => ipcRenderer.invoke('firebase-login', email, password),
  firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
  firebaseGetUser: () => ipcRenderer.invoke('firebase-get-user'),
  firebaseAutoLogin: () => ipcRenderer.invoke('firebase-auto-login'),
  firebaseResetPassword: (email) => ipcRenderer.invoke('firebase-reset-password', email),
  firebaseUpdateVisibility: (adventureId, visibility) => ipcRenderer.invoke('firebase-update-visibility', adventureId, visibility),
  firebaseFetchMyAdventures: (userId) => ipcRenderer.invoke('firebase-fetch-my-adventures', userId),

  // AI
  aiChat: (messages, projectPath, options) => ipcRenderer.invoke('ai-chat', messages, projectPath, options),
  aiVerifyKey: (provider, key) => ipcRenderer.invoke('ai-verify-key', provider, key),
  aiGetQuota: () => ipcRenderer.invoke('ai-get-quota'),
  aiGenerateImage: (prompt, projectPath, options) => ipcRenderer.invoke('ai-generate-image', prompt, projectPath, options),

  // Adventures
  adventureExport: (projectPath, metadata, forPublish) => ipcRenderer.invoke('adventure-export', projectPath, metadata, forPublish),
  adventureImportFromFile: () => ipcRenderer.invoke('adventure-import-from-file'),
  adventureFetchCatalog: () => ipcRenderer.invoke('adventure-fetch-catalog'),
  adventureDownload: (url, name) => ipcRenderer.invoke('adventure-download', url, name),
  adventureGetDownloadQuota: () => ipcRenderer.invoke('adventure-get-download-quota'),
  adventurePublish: (zipPath, metadata) => ipcRenderer.invoke('adventure-publish', zipPath, metadata),
  adventureUnpublish: (adventureId) => ipcRenderer.invoke('adventure-unpublish', adventureId),
  onAdventureProgress: (callback) => { const h = (_, data) => callback(data); ipcRenderer.on('adventure-progress', h); return () => ipcRenderer.removeListener('adventure-progress', h); }
});
