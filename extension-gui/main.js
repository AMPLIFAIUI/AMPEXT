// © 2025 AMPIQ All rights reserved.
// Main Electron process for AMPiQ Desktop (Native Messaging Only)

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const AMPSQLiteStorage = require('./sqlite-storage');

let mainWindow;
let sqliteStorage;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    resizable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon256.png'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#1a1a2e'
  });

  const startUrl = `file://${path.join(__dirname, 'index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Memory',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-memory');
          }
        },
        {
          label: 'Clear Memory',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('clear-memory');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AMPiQ',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AMPiQ',
              message: 'AMPiQ - Advanced Memory Persistence Interface',
              detail: 'Version 2.0.0\n\nAdvanced memory management for AI conversations.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Initialize SQLite storage
  sqliteStorage = new AMPSQLiteStorage();
  const storageInitialized = await sqliteStorage.initialize();
  
  if (!storageInitialized) {
    console.error('Failed to initialize SQLite storage');
    dialog.showErrorBox('Storage Error', 'Failed to initialize conversation storage');
  }
  
  createWindow();
  createMenu();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
  
  // Close SQLite connection
  if (sqliteStorage) {
    sqliteStorage.close();
  }
});

// IPC handlers (keep for renderer communication)
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Native messaging implementation
const { spawn } = require('child_process');
let nativeHost = null;
let nativeConnected = false;

function getNativeHostPath() {
  if (isDev) {
    // Use absolute path for dev build
    return path.resolve(__dirname, '..', 'amp-native-host.js');
  }
  return path.join(__dirname, '..', 'amp-native-host.js');
}

ipcMain.on('native-connect', (event, hostName) => {
  console.log('[AMP] Native messaging connect requested:', hostName);

  if (nativeHost) {
    console.log('[AMP] Native host already connected');
    return;
  }

  try {
    // Spawn the native messaging host
    const hostPath = getNativeHostPath();
    console.log('[AMP] Spawning native host at:', hostPath);
    nativeHost = spawn('node', [hostPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
    });

    nativeHost.on('spawn', () => {
      console.log('[AMP] Native host process spawned successfully');
    });

    nativeHost.stdout.on('data', (data) => {
      try {
        // Native messaging protocol: first 4 bytes are message length
        const msgLen = data.readUInt32LE(0);
        const msgData = data.slice(4, 4 + msgLen);
        const message = JSON.parse(msgData.toString());

        console.log('[AMP] Native host message:', message);

        // Forward memory stats to renderer
        if ((message.type === 'memory_update' || message.type === 'storage_stats') && mainWindow) {
          mainWindow.webContents.send('memory-update', message.data);
        }

        // Handle specific message types with SQLite storage
        handleNativeMessage(message, event);

        event.reply('native-response', message);

        if (message.type === 'pong') {
          nativeConnected = true;
          console.log('[AMP] Native host connection established (pong received)');
        }
      } catch (err) {
        console.error('[AMP] Error parsing native message:', err, data);
      }
    });

    nativeHost.stderr.on('data', (data) => {
      console.error('[AMP] Native host error (stderr):', data.toString());
      if (mainWindow) {
        mainWindow.webContents.send('memory-update', { error: '[AMP] Native host error: ' + data.toString() });
      }
    });

    nativeHost.on('close', (code) => {
      console.log('[AMP] Native host closed with code:', code);
      nativeHost = null;
      nativeConnected = false;
      event.reply('native-disconnected');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      createWindow();
      if (mainWindow) {
        mainWindow.webContents.send('memory-update', { error: '[AMP] Native host closed with code: ' + code });
      }
    });

    nativeHost.on('error', (err) => {
      console.error('[AMP] Failed to spawn native host process:', err);
      if (mainWindow) {
        mainWindow.webContents.send('memory-update', { error: '[AMP] Failed to spawn native host: ' + err.message });
      }
    });

    // Send initial ping
    sendNativeMessage({ type: 'ping' });

  } catch (error) {
    console.error('[AMP] Failed to start native host:', error);
    event.reply('native-disconnected');
    if (mainWindow) {
      mainWindow.webContents.send('memory-update', { error: '[AMP] Failed to start native host: ' + error.message });
    }
  }
});

function sendNativeMessage(message) {
  if (!nativeHost || !nativeHost.stdin.writable) {
    console.error('Native host not connected');
    return;
  }
  
  const json = JSON.stringify(message);
  const buffer = Buffer.alloc(4 + Buffer.byteLength(json));
  buffer.writeUInt32LE(Buffer.byteLength(json), 0);
  buffer.write(json, 4);
  
  nativeHost.stdin.write(buffer);
}

ipcMain.on('native-message', (event, message) => {
  console.log('Sending native message:', message);
  sendNativeMessage(message);
});

ipcMain.on('native-disconnect', (event) => {
  console.log('Native messaging disconnect requested');
  if (nativeHost) {
    nativeHost.kill();
    nativeHost = null;
    nativeConnected = false;
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle native messaging with SQLite integration
async function handleNativeMessage(message, event) {
  if (!sqliteStorage || !sqliteStorage.isInitialized) {
    console.warn('SQLite storage not available for message:', message.type);
    return;
  }

  try {
    switch (message.type) {
      case 'overflow_saved':
      case 'all_memory_saved':
        // Store chunks in SQLite when they overflow or are manually saved
        if (message.chunks && Array.isArray(message.chunks)) {
          for (const chunk of message.chunks) {
            await sqliteStorage.storeMemoryChunk(chunk);
          }
          console.log(`Stored ${message.chunks.length} chunks in SQLite`);
        }
        break;
        
      case 'get_memory_data':
        // Respond with memory data from SQLite
        const conversations = sqliteStorage.getConversations(message.filters || {}, 50, 0);
        const memoryData = [];
        
        for (const conv of conversations) {
          const chunks = sqliteStorage.getConversationChunks(conv.id, 10);
          if (chunks.length > 0) {
            memoryData.push({
              id: conv.id,
              provider: conv.provider,
              topic: conv.topic,
              timestamp: conv.updated_at,
              content: chunks.map(c => c.content).join('\n\n'),
              chunkCount: chunks.length
            });
          }
        }
        
        event.reply('native-response', {
          type: 'memory_data_response',
          data: memoryData
        });
        break;
        
      case 'search_memory':
        // Search memory using SQLite FTS
        const searchResults = sqliteStorage.searchMemory(message.query, message.filters || {}, 20);
        event.reply('native-response', {
          type: 'search_results',
          data: searchResults,
          query: message.query
        });
        break;
        
      case 'get_stats':
        // Get storage statistics
        const stats = sqliteStorage.getStorageStats();
        event.reply('native-response', {
          type: 'storage_stats',
          data: stats
        });
        break;
    }
  } catch (error) {
    console.error('Error handling native message:', error);
  }
}

// IPC handlers for SQLite operations
ipcMain.handle('get-memory-data', async (event, filters) => {
  if (!sqliteStorage) return [];
  return sqliteStorage.getConversations(filters, 50, 0);
});

ipcMain.handle('search-memory', async (event, query, filters) => {
  if (!sqliteStorage) return [];
  return sqliteStorage.searchMemory(query, filters, 20);
});

ipcMain.handle('get-storage-stats', async () => {
  if (!sqliteStorage) return {};
  return sqliteStorage.getStorageStats();
});

ipcMain.handle('export-conversation', async (event, conversationId) => {
  if (!sqliteStorage) return null;
  return sqliteStorage.exportConversation(conversationId);
});