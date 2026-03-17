const { contextBridge, ipcRenderer } = require('electron');

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
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),
  searchFiles: (folderPath, query) => ipcRenderer.invoke('search-files', folderPath, query),
  selectProjectFile: (projectPath, filters) => ipcRenderer.invoke('select-project-file', projectPath, filters),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Auto-update
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, data) => callback(data)),
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
  onTelegramPlayerJoined: (callback) => ipcRenderer.on('telegram-player-joined', (_, data) => callback(data)),
  onTelegramPlayerLeft: (callback) => ipcRenderer.on('telegram-player-left', (_, data) => callback(data)),
  onTelegramMessageReceived: (callback) => ipcRenderer.on('telegram-message-received', (_, data) => callback(data)),
  removeTelegramListeners: () => {
    ipcRenderer.removeAllListeners('telegram-player-joined');
    ipcRenderer.removeAllListeners('telegram-player-left');
    ipcRenderer.removeAllListeners('telegram-message-received');
  },

  // Firebase Auth
  firebaseRegister: (email, password, displayName) => ipcRenderer.invoke('firebase-register', email, password, displayName),
  firebaseLogin: (email, password) => ipcRenderer.invoke('firebase-login', email, password),
  firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
  firebaseGetUser: () => ipcRenderer.invoke('firebase-get-user'),
  firebaseAutoLogin: () => ipcRenderer.invoke('firebase-auto-login'),
  firebaseUpdateVisibility: (adventureId, visibility) => ipcRenderer.invoke('firebase-update-visibility', adventureId, visibility),
  firebaseFetchMyAdventures: (userId) => ipcRenderer.invoke('firebase-fetch-my-adventures', userId),

  // AI
  aiChat: (messages, projectPath, options) => ipcRenderer.invoke('ai-chat', messages, projectPath, options),
  aiVerifyKey: (provider, key) => ipcRenderer.invoke('ai-verify-key', provider, key),
  aiGetQuota: () => ipcRenderer.invoke('ai-get-quota'),

  // Adventures
  adventureExport: (projectPath, metadata, forPublish) => ipcRenderer.invoke('adventure-export', projectPath, metadata, forPublish),
  adventureImportFromFile: () => ipcRenderer.invoke('adventure-import-from-file'),
  adventureFetchCatalog: () => ipcRenderer.invoke('adventure-fetch-catalog'),
  adventureDownload: (url, name) => ipcRenderer.invoke('adventure-download', url, name),
  adventurePublish: (zipPath, metadata) => ipcRenderer.invoke('adventure-publish', zipPath, metadata),
  adventureUnpublish: (adventureId) => ipcRenderer.invoke('adventure-unpublish', adventureId),
  onAdventureProgress: (callback) => ipcRenderer.on('adventure-progress', (_, data) => callback(data)),
  removeAdventureListeners: () => {
    ipcRenderer.removeAllListeners('adventure-progress');
  }
});
