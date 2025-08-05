// © 2025 AMPiQ - Preload Script
// Secure bridge between renderer and main process

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPath: () => ipcRenderer.invoke('get-app-path'),
  
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Native messaging
  connectNative: (hostName) => {
    // Simulate native messaging for Electron environment
    const port = {
      postMessage: (message) => {
        ipcRenderer.send('native-message', message);
      },
      disconnect: () => {
        ipcRenderer.send('native-disconnect');
      },
      onMessage: {
        addListener: (callback) => {
          ipcRenderer.on('native-response', (event, message) => {
            callback(message);
          });
        }
      },
      onDisconnect: {
        addListener: (callback) => {
          ipcRenderer.on('native-disconnected', callback);
        }
      }
    };
    
    // Initiate connection
    ipcRenderer.send('native-connect', hostName);
    return port;
  },
  
  // Memory operations
  onMemoryUpdate: (callback) => ipcRenderer.on('memory-update', callback),
  onStatsUpdate: (callback) => ipcRenderer.on('stats-update', callback),
  exportMemory: () => ipcRenderer.send('export-memory'),
  clearMemory: () => ipcRenderer.send('clear-memory'),
  sendSearchRequest: (query) => ipcRenderer.invoke('search-memory', query),
  sendNativeMessage: (message) => ipcRenderer.invoke('send-native-message', message),
  getMemoryData: () => ipcRenderer.invoke('get-memory-data'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
});

// Override chrome.runtime for Electron environment
window.chrome = window.chrome || {};
window.chrome.runtime = window.chrome.runtime || {};
window.chrome.runtime.connectNative = (hostName) => {
  return window.electronAPI.connectNative(hostName);
}; 