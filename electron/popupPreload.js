const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__gmOpenExternal', (url) => {
  ipcRenderer.invoke('open-external', url);
});
