const { contextBridge } = require('electron');

// Expose any APIs to the renderer process here if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
});
