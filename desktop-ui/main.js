// © 2025 AMPIQ All rights reserved.
// Main Electron process for AMPiQ Desktop (Native Messaging)
// Version: 4.0.0 - Production

// Production logging - set to false to disable debug logs
const AMP_DEBUG = false;
const log = (...args) => AMP_DEBUG && console.log('[AMP Main]', ...args);
const logError = (...args) => console.error('[AMP Main]', ...args);

const path = require('path');
const fs = require('fs');
const AMPSQLiteStorage = require('./sqlite-storage');

// Only import Electron modules
let app, BrowserWindow, Menu, ipcMain, dialog;
let mainWindow;
let sqliteStorage;
let isDev;

// Import Electron modules
const electron = require('electron');
app = electron.app;
BrowserWindow = electron.BrowserWindow;
Menu = electron.Menu;
ipcMain = electron.ipcMain;
dialog = electron.dialog;

isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Connection state management
let extensionConnected = false;

// Connection states
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  CONNECTING: 'connecting'
};

// Message queue for offline desktop app
class MessageQueue {
  constructor() {
    this.queue = [];
    this.maxSize = 1000;
  }
  enqueue(message) {
    this.queue.push({
      ...message,
      timestamp: Date.now(),
      id: this.generateId()
    });
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
  }
  dequeue() {
    return this.queue.shift();
  }
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// In-memory storage for when SQLite is not available
class InMemoryStorage {
  constructor() {
    this.chunks = new Map();
    this.stats = {
      totalChunks: 0,
      totalSize: 0,
      domChunks: 0,
      hotBufferChunks: 0,
      archivedChunks: 0,
      domSize: 0,
      hotBufferSize: 0,
      archiveSize: 0,
      totalCharacters: 0
    };
  }

  storeMemoryChunk(chunk) {
    const id = chunk.id || this.generateId();
    this.chunks.set(id, {
      ...chunk,
      id,
      timestamp: Date.now(),
      size: JSON.stringify(chunk).length
    });
    
    // Update stats
    this.stats.totalChunks = this.chunks.size;
    this.stats.totalSize = Array.from(this.chunks.values()).reduce((sum, c) => sum + (c.size || 0), 0);
    this.stats.totalCharacters = Array.from(this.chunks.values()).reduce((sum, c) => sum + (c.content?.length || 0), 0);
    
    // Categorize chunks
    this.stats.domChunks = Array.from(this.chunks.values()).filter(c => c.inDom).length;
    this.stats.hotBufferChunks = Array.from(this.chunks.values()).filter(c => c.inHot && !c.inDom).length;
    this.stats.archivedChunks = Array.from(this.chunks.values()).filter(c => !c.inHot && !c.inDom).length;
    
    this.stats.domSize = Array.from(this.chunks.values()).filter(c => c.inDom).reduce((sum, c) => sum + (c.size || 0), 0);
    this.stats.hotBufferSize = Array.from(this.chunks.values()).filter(c => c.inHot && !c.inDom).reduce((sum, c) => sum + (c.size || 0), 0);
    this.stats.archiveSize = Array.from(this.chunks.values()).filter(c => !c.inHot && !c.inDom).reduce((sum, c) => sum + (c.size || 0), 0);
    
    return id;
  }

  getStorageStats() {
    return this.stats;
  }

  searchMemory(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const chunk of this.chunks.values()) {
      const content = chunk.content || chunk.fullText || '';
      if (content.toLowerCase().includes(queryLower)) {
        results.push({
          id: chunk.id,
          content: content,
          ai_provider: chunk.ai_provider,
          timestamp: chunk.timestamp,
          topic: chunk.topic
        });
      }
    }
    
    // Sort by relevance (simple implementation)
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getAllMemoryChunks() {
    return Array.from(this.chunks.values());
  }
  
  // Get conversations (group chunks by conversation_id)
  getConversations(limit = 50, offset = 0) {
    const conversationMap = new Map();
    
    for (const chunk of this.chunks.values()) {
      const convId = chunk.conversation_id || 'unknown';
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          provider: chunk.ai_provider || 'unknown',
          topic: chunk.topic || 'conversation',
          created_at: chunk.timestamp,
          updated_at: chunk.timestamp,
          message_count: 0,
          total_size: 0
        });
      }
      
      const conv = conversationMap.get(convId);
      conv.message_count++;
      conv.total_size += chunk.size || 0;
      if (chunk.timestamp > conv.updated_at) {
        conv.updated_at = chunk.timestamp;
      }
      if (chunk.timestamp < conv.created_at) {
        conv.created_at = chunk.timestamp;
      }
    }
    
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => b.updated_at - a.updated_at);
    
    return conversations.slice(offset, offset + limit);
  }
  
  // Get chunks for a specific conversation
  getChunks(conversationId, limit = 100) {
    const chunks = Array.from(this.chunks.values())
      .filter(c => c.conversation_id === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return chunks.slice(0, limit);
  }
  
  // Search with limit
  search(query, limit = 20) {
    return this.searchMemory(query).slice(0, limit);
  }
  
  // Get recent activity
  getRecent(limit = 20) {
    return Array.from(this.chunks.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(chunk => ({
        id: chunk.id,
        conversation_id: chunk.conversation_id,
        provider: chunk.ai_provider,
        topic: chunk.topic,
        preview: (chunk.content || chunk.fullText || '').substring(0, 100),
        timestamp: chunk.timestamp,
        size: chunk.size
      }));
  }
  
  // Get all data for UI display
  getAllData() {
    return {
      conversations: this.getConversations(1000, 0),
      chunks: Array.from(this.chunks.values()),
      stats: this.getStorageStats(),
      zipperData: { fatZipper: [], thinZipper: [] }
    };
  }
}

const messageQueue = new MessageQueue();
const inMemoryStorage = new InMemoryStorage();

// Communication is via Native Messaging (amp-native-host.js)
// The native host handles all extension <-> desktop communication
// No HTTP server needed - native messaging is more secure and efficient

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
      preload: path.join(__dirname, 'preload.js'),
      // Disable multimedia features to avoid ffmpeg dependency
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
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
    
    // Test IPC bridge
    log('🔧 Main: Testing IPC bridge...');
    setTimeout(() => {
      log('🔧 Main: Sending test event to renderer...');
      mainWindow.webContents.send('memory-update', { 
        connected: true, 
        timestamp: Date.now(),
        test: true 
      });
    }, 2000);
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
              detail: 'Version 4.0.0\n\nAdvanced memory management for AI conversations.'
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
  // Disable multimedia features to avoid ffmpeg dependency
  app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture,WebCodecs');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
  
  // Initialize SQLite storage with error handling
  try {
    log('[AMP] Creating SQLite storage instance...');
    sqliteStorage = new AMPSQLiteStorage();
    log('[AMP] SQLite storage instance created, initializing...');
    const storageInitialized = await sqliteStorage.initialize();
    
    if (!storageInitialized) {
      logError('[AMP] Failed to initialize SQLite storage - continuing without storage');
      sqliteStorage = null;
    } else {
      log('[AMP] SQLite storage initialized successfully');
    }
  } catch (error) {
    logError('[AMP] Error initializing SQLite storage:', error);
    logError('[AMP] Error stack:', error.stack);
    log('[AMP] Continuing without SQLite storage...');
    sqliteStorage = null;
  }
  
  // Native messaging is handled by separate native host process (amp-native-host.js)
  // No HTTP server needed - native messaging is direct and secure
  
  createWindow();
  createMenu();
  
  // Start health monitoring
  healthMonitor.startMonitoring();
  
  // Initialize native messaging (desktop app acts as the host)
  initializeNativeMessaging();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuiting = true;

  // Clear stats update interval
  if (statsUpdateInterval) {
    clearInterval(statsUpdateInterval);
    statsUpdateInterval = null;
  }

  // Close SQLite connection
  if (sqliteStorage) {
    sqliteStorage.close();
  }

  // Force cleanup after 2 seconds
  setTimeout(() => {
    log('[AMP] Force cleanup - terminating all processes');
    process.exit(0);
  }, 2000);
});

// Handle uninstall cleanup
app.on('quit', () => {
  log('[AMP] App quitting - cleaning up processes');
  
  // Only kill AMPiQ processes (not all electron/node processes which could affect other apps)
  const { exec } = require('child_process');
  
  // Kill AMPiQ processes only - this is safe and specific to our app
  exec('taskkill /f /im AMPiQ.exe', (error) => {
    if (error) log('[AMP] No AMPiQ.exe processes to kill');
    else log('[AMP] Killed AMPiQ.exe processes');
  });
  
  // Note: Removed taskkill for electron.exe and node.exe as they could kill
  // unrelated applications. AMPiQ.exe is sufficient for cleanup.
});

// Handle window close
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log('[AMP] All windows closed - initiating cleanup');
    
    // Force quit after 1 second
    setTimeout(() => {
      app.quit();
    }, 1000);
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

// Native messaging implementation - Desktop app IS the native host
let statsUpdateInterval = null;

// Connection state machine and retry logic
let connectionState = ConnectionState.DISCONNECTED;
let connectionAttempts = 0;
const maxRetries = 5;

function setConnectionState(state) {
  connectionState = state;
  extensionConnected = (state === ConnectionState.CONNECTED);
  // Don't call updateConnectionStatus here to avoid infinite loop
  // updateConnectionStatus is called directly when needed
}

// Health monitoring system
class HealthMonitor {
  constructor() {
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = 30000;
    this.maxMissedHeartbeats = 3;
    this.missedHeartbeats = 0;
    this.monitorInterval = null;
  }
  startMonitoring() {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(() => this.checkHealth(), this.heartbeatInterval);
  }
  checkHealth() {
    const now = Date.now();
    if (now - this.lastHeartbeat > this.heartbeatInterval) {
      this.missedHeartbeats++;
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        this.handleConnectionLoss();
      }
    } else {
      this.missedHeartbeats = 0;
    }
  }
  handleConnectionLoss() {
    logError('Connection lost - attempting reconnection');
    setConnectionState(ConnectionState.DISCONNECTED);
  }
  heartbeat() {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
  }
}
const healthMonitor = new HealthMonitor();

// Initialize native messaging via stdin/stdout
function initializeNativeMessaging() {
  log('[AMP] Desktop app ready as native messaging host...');
  
  // The desktop app IS the native messaging host
  // It doesn't need to connect to anything - extensions connect to it
  setConnectionState(ConnectionState.CONNECTED);
  
  // Set up periodic stats updates
  if (!statsUpdateInterval) {
    statsUpdateInterval = setInterval(() => {
      updateUI();
    }, 10000);
  }
}

// Send message to extension via stdout
function sendToExtension(message) {
  try {
    const json = JSON.stringify(message);
    const buffer = Buffer.alloc(4 + Buffer.byteLength(json));
    buffer.writeUInt32LE(Buffer.byteLength(json), 0);
    buffer.write(json, 4);
    
    process.stdout.write(buffer);
    log('[AMP] Sent to extension:', message.type);
  } catch (error) {
    logError('[AMP] Error sending to extension:', error);
    messageQueue.enqueue(message); // Enqueue message for retry
  }
}

// Handle messages from extension
function handleExtensionMessage(message) {
  switch (message.type) {
    case 'ping':
      // Respond to ping with pong
      sendToExtension({ type: 'pong', time: Date.now() });
      setConnectionState(ConnectionState.CONNECTED);
      healthMonitor.heartbeat();
      log('[AMP] Extension connected via native messaging');
      break;
      
    case 'overflow':
      // Handle overflow from slot 5 - save to SQLite
      if (sqliteStorage && message.chunk) {
        sqliteStorage.storeMemoryChunk(message.chunk);
        log('[AMP] Stored overflow chunk:', message.chunk.id);
        
        // Send confirmation
        sendToExtension({
          type: 'overflow_saved',
          success: true,
          chunkId: message.chunk.id,
          timestamp: Date.now()
        });
      }
      break;
      
    case 'sendAllMemory':
      // Handle "Send All to GUI" request - save all chunks to SQLite
      if (sqliteStorage && Array.isArray(message.chunks)) {
        let successCount = 0;
        for (const chunk of message.chunks) {
          const result = sqliteStorage.storeMemoryChunk(chunk);
          if (result.success) successCount++;
        }
        
        log(`[AMP] Stored ${successCount}/${message.chunks.length} chunks`);
        
        // Send confirmation
        sendToExtension({
          type: 'all_memory_saved',
          success: true,
          storedCount: successCount,
          totalCount: message.chunks.length,
          timestamp: Date.now()
        });
      }
      break;
      
    case 'getMemoryStats':
      // Send memory statistics
      if (sqliteStorage) {
        const stats = sqliteStorage.getStorageStats();
        sendToExtension({
          type: 'memory_stats',
          stats: stats,
          timestamp: Date.now()
        });
      }
      break;
      
    case 'status':
      // Return desktop app status
      const stats = sqliteStorage ? sqliteStorage.getStorageStats() : { totalChunks: 0, totalSize: 0 };
      sendToExtension({ 
        type: 'status_response', 
        success: true,
        online: true,
        stats: stats,
        timestamp: Date.now()
      });
      break;
      
    default:
      log('[AMP] Unknown message type from extension:', message.type);
  }
  
  // Update UI with latest data
  updateUI();
}

// Request stats from extension
function requestStatsFromExtension() {
  sendToExtension({ type: 'getStats' });
}

// Update connection status in UI
function updateConnectionStatus(connected) {
  try {
    // Guard against rapid successive calls
    if (updateConnectionStatus.lastCall && Date.now() - updateConnectionStatus.lastCall < 1000) {
      return; // Skip if called within 1 second
    }
    updateConnectionStatus.lastCall = Date.now();
    
    log(`🔧 Main: updateConnectionStatus called with: ${connected}`);
    
    // Update the connection state variable
    extensionConnected = connected;
    
    // Update connection state
    setConnectionState(connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED);
    
    // Send status to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      log('🔧 Main: Sending memory-update to renderer with connected:', connected);
      const eventData = {
        connected: connected,
        timestamp: Date.now()
      };
      log('🔧 Main: Event data being sent:', eventData);
      mainWindow.webContents.send('memory-update', eventData);
    } else {
      console.warn('🔧 Main: Cannot send to renderer - window not available');
    }
    
    log(`[AMP] Native messaging connection: ${connected ? 'Connected' : 'Disconnected'}`);
  } catch (error) {
    logError('updateConnectionStatus failed:', error);
  }
}

// Update UI with latest data
function updateUI() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    let stats, conversations = [];
    
    if (sqliteStorage && sqliteStorage.isInitialized) {
      stats = sqliteStorage.getStorageStats();
      conversations = sqliteStorage.getConversations({}, 50, 0);
    } else {
      stats = inMemoryStorage.getStorageStats();
      // In-memory storage doesn't have conversations yet
    }
    
    mainWindow.webContents.send('memory-update', {
      stats: stats,
      conversations: conversations,
      connected: extensionConnected
    });
  }
}

// Legacy IPC handlers (for compatibility)
ipcMain.on('extension-connected', (event) => {
  extensionConnected = true;
  log('[AMP] Extension connected via IPC (legacy)');
});

ipcMain.on('extension-disconnected', (event) => {
  extensionConnected = false;
  log('[AMP] Extension disconnected via IPC (legacy)');
});

ipcMain.on('extension-stats', (event, stats) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('memory-update', { stats });
  }
});

// Handle search requests
ipcMain.handle('search-memory', async (event, query) => {
  try {
    let results = [];
    
    if (sqliteStorage && sqliteStorage.isInitialized) {
      // Search SQLite storage
      results = await sqliteStorage.searchMemory(query);
    } else {
      // Search in-memory storage
      results = inMemoryStorage.searchMemory(query);
    }
    
    return results;
  } catch (error) {
    logError('[AMP] Search failed:', error);
    return [];
  }
});

// Handle native message requests from renderer
ipcMain.handle('send-native-message', async (event, message) => {
  try {
    // Handle message directly since we're the native host
    let response = { success: false, error: 'Unknown message type' };
    
    if (message.action === 'searchMemory' && sqliteStorage && sqliteStorage.isInitialized) {
      const results = sqliteStorage.searchMemory(message.query, {}, 20);
      response = { success: true, results };
    } else if (message.action === 'getStats' && sqliteStorage && sqliteStorage.isInitialized) {
      const stats = sqliteStorage.getStorageStats();
      response = { success: true, stats };
    } else if (message.action === 'getConversations' && sqliteStorage && sqliteStorage.isInitialized) {
      const conversations = sqliteStorage.getConversations({}, 50, 0);
      response = { success: true, conversations };
    }
    
    return response;
  } catch (error) {
    logError('[AMP] Native message failed:', error);
    return { error: error.message };
  }
});

// Handle memory data requests from renderer
ipcMain.handle('get-memory-data', async (event) => {
  try {
    let memoryData = [];
    
    if (sqliteStorage && sqliteStorage.isInitialized) {
      // Get from SQLite storage
      memoryData = await sqliteStorage.getAllMemoryChunks();
    } else {
      // Get from in-memory storage
      memoryData = inMemoryStorage.getAllMemoryChunks();
    }
    
    log(`🔧 Main: Returning ${memoryData.length} memory chunks to renderer`);
    return memoryData;
  } catch (error) {
    logError('[AMP] Get memory data failed:', error);
    return [];
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', promise, 'reason:', reason);
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
          log(`Stored ${message.chunks.length} chunks in SQLite`);
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
    logError('Error handling native message:', error);
  }
}

// IPC handlers for SQLite operations
// Removed duplicate get-memory-data handler - already exists above

// Removed duplicate search-memory handler

ipcMain.handle('get-storage-stats', async () => {
  if (!sqliteStorage) return {};
  return sqliteStorage.getStorageStats();
});

ipcMain.handle('export-conversation', async (event, conversationId) => {
  if (!sqliteStorage) return null;
  return sqliteStorage.exportConversation(conversationId);
});
