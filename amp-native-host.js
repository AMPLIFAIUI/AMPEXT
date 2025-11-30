#!/usr/bin/env node
// Native Messaging Host for AMPiQ - Bridge between Chrome extension and Desktop app

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Import SQLite storage from desktop-ui
const AMPSQLiteStorage = require('./desktop-ui/sqlite-storage');

// Create storage directory in user's home folder
const storageDir = path.join(process.env.HOME || process.env.USERPROFILE, '.ampiq', 'storage');
const overflowDir = path.join(storageDir, 'overflow');
const allMemoryDir = path.join(storageDir, 'all-memory');

// Initialize SQLite storage
let sqliteStorage = null;
let sqliteAvailable = false;

async function initializeStorage() {
  try {
    sqliteStorage = new AMPSQLiteStorage();
    const initialized = await sqliteStorage.initialize();
    if (initialized) {
      console.error('SQLite storage initialized successfully');
      sqliteAvailable = true;
    } else {
      console.error('Failed to initialize SQLite storage - will use file-based fallback');
      sqliteAvailable = false;
    }
  } catch (error) {
    console.error('Error initializing SQLite storage - will use file-based fallback:', error.message);
    sqliteAvailable = false;
  }
}

// Initialize storage on startup
initializeStorage();

// Ensure directories exist (for fallback file storage)
function ensureDirectories() {
  [storageDir, overflowDir, allMemoryDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initialize directories on startup
ensureDirectories();

// Save chunk to SQLite storage
function saveSQLiteChunk(chunk) {
  try {
    if (sqliteStorage && sqliteStorage.isInitialized) {
      sqliteStorage.storeMemoryChunk(chunk);
      return { success: true };
    } else {
      return { success: false, error: 'SQLite not initialized' };
    }
  } catch (error) {
    console.error('Failed to save chunk to SQLite:', error);
    return { success: false, error: error.message };
  }
}

let messageBuffer = Buffer.alloc(0);

// Connection state machine and retry logic for native messaging
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};
let connectionState = ConnectionState.DISCONNECTED;
let connectionAttempts = 0;
const maxRetries = 5;

function setConnectionState(state) {
  connectionState = state;
  // Optionally notify listeners or update UI
}

function processMessages() {
  while (messageBuffer.length >= 4) {
    const msgLen = messageBuffer.readUInt32LE(0);
    
    if (messageBuffer.length < 4 + msgLen) {
      // Not enough data yet
      break;
    }
    
    // Extract the complete message
    const msgData = messageBuffer.slice(4, 4 + msgLen);
    messageBuffer = messageBuffer.slice(4 + msgLen);
    
    try {
      const message = JSON.parse(msgData.toString());
      handleMessage(message);
    } catch (e) {
      console.error('Error parsing message:', e);
      writeMessage({ type: 'error', error: e.message });
    }
  }
}

function writeMessage(msg) {
  const json = JSON.stringify(msg);
  const buffer = Buffer.alloc(4 + Buffer.byteLength(json));
  buffer.writeUInt32LE(Buffer.byteLength(json), 0);
  buffer.write(json, 4);
  fs.writeSync(1, buffer);
}

// Save overflow chunk to local storage
function saveOverflowChunk(chunk) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `overflow_${chunk.id}_${timestamp}.json`;
    const filepath = path.join(overflowDir, filename);
    
    const data = {
      chunk: chunk,
      savedAt: new Date().toISOString(),
      source: 'extension-overflow'
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    // console.log(`Saved overflow chunk: ${filename}`);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Failed to save overflow chunk:', error);
    return { success: false, error: error.message };
  }
}

// Save all memory to local storage
function saveAllMemory(chunks, metadata) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `all-memory_${timestamp}.json`;
    const filepath = path.join(allMemoryDir, filename);
    
    const data = {
      metadata: metadata,
      chunks: chunks,
      savedAt: new Date().toISOString(),
      source: 'extension-send-all',
      totalChunks: chunks.length,
      totalSize: chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    // console.log(`Saved all memory: ${filename} (${chunks.length} chunks)`);
    
    return { success: true, filename, chunkCount: chunks.length };
  } catch (error) {
    console.error('Failed to save all memory:', error);
    return { success: false, error: error.message };
  }
}

function handleMessage(msg) {
  // Don't use console.log as it interferes with stdout communication
  // Use console.error for debugging (goes to stderr, not stdout)
  console.error('Native Host: Received message:', msg.type);
  
  // Include requestId in response for proper tracking
  const requestId = msg.requestId;
  
  if (msg.type === 'ping') {
    writeMessage({ type: 'pong', time: Date.now(), requestId });
    
  } else if (msg.type === 'pong') {
    setConnectionState(ConnectionState.CONNECTED);
    
  } else if (msg.type === 'overflow' && msg.chunk) {
    // Handle overflow from slot 5 - save to SQLite first, then file as backup
    const sqliteResult = saveSQLiteChunk(msg.chunk);
    const fileResult = saveOverflowChunk(msg.chunk);
    
    writeMessage({ 
      type: 'overflow_saved', 
      success: sqliteResult.success || fileResult.success,
      filename: fileResult.filename,
      chunkId: msg.chunk.id,
      sqliteStored: sqliteResult.success,
      fileStored: fileResult.success,
      timestamp: Date.now(),
      requestId
    });
    
  } else if (msg.type === 'sendAllMemory' && Array.isArray(msg.chunks)) {
    // Handle "Send All to GUI" request - save all chunks to SQLite and file
    let sqliteSuccessCount = 0;
    for (const chunk of msg.chunks) {
      const result = saveSQLiteChunk(chunk);
      if (result.success) sqliteSuccessCount++;
    }
    
    // Also save to file as backup
    const fileResult = saveAllMemory(msg.chunks, {
      timestamp: msg.timestamp,
      totalChunks: msg.totalChunks,
      totalSize: msg.totalSize
    });
    
    // Get updated stats to send back
    const stats = getStorageStats();
    
    writeMessage({ 
      type: 'all_memory_saved', 
      success: true,
      sqliteCount: sqliteSuccessCount,
      fileResult: fileResult.success,
      filename: fileResult.filename,
      chunkCount: msg.chunks.length,
      timestamp: Date.now(),
      stats: stats,
      requestId
    });
    
  } else if (msg.type === 'persist' && Array.isArray(msg.chunks)) {
    // Legacy support - save to SQLite and file
    let sqliteSuccessCount = 0;
    for (const chunk of msg.chunks) {
      const result = saveSQLiteChunk(chunk);
      if (result.success) sqliteSuccessCount++;
    }
    
    // Also save to file
    const fileResult = saveAllMemory(msg.chunks, {
      timestamp: Date.now(),
      totalChunks: msg.chunks.length,
      totalSize: msg.chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    });
    
    writeMessage({ 
      type: 'persisted', 
      success: true,
      sqliteCount: sqliteSuccessCount,
      fileResult: fileResult.success,
      count: msg.chunks.length,
      timestamp: Date.now(),
      requestId
    });
    
  } else if (msg.type === 'inject_memory') {
    // Handle memory injection to active AI page
    handleMemoryInjection(msg);
    writeMessage({
      type: 'injection_acknowledged',
      success: true,
      timestamp: Date.now(),
      requestId
    });
    
  } else if (msg.type === 'get_memory_data') {
    // Query SQLite for memory data
    try {
      let memoryData = [];
      if (sqliteStorage && sqliteStorage.isInitialized) {
        memoryData = sqliteStorage.getAllMemoryChunks ? sqliteStorage.getAllMemoryChunks() : [];
      }
      writeMessage({ 
        type: 'memory_data_response',
        data: memoryData,
        count: memoryData.length,
        timestamp: Date.now(),
        requestId
      });
    } catch (error) {
      writeMessage({
        type: 'memory_data_response',
        data: [],
        error: error.message,
        timestamp: Date.now(),
        requestId
      });
    }
    
  } else if (msg.type === 'search_memory') {
    // Native search in stored memory files
    try {
      const results = [];
      const searchTerm = (msg.query || '').toLowerCase();
      // Search overflow files
      const overflowFiles = fs.readdirSync(overflowDir).filter(file => file.endsWith('.json'));
      for (const file of overflowFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(overflowDir, file), 'utf8'));
        if (JSON.stringify(data).toLowerCase().includes(searchTerm)) {
          results.push({ file, match: true, chunk: data.chunk });
        }
      }
      // Search all-memory files
      const allMemoryFiles = fs.readdirSync(allMemoryDir).filter(file => file.endsWith('.json'));
      for (const file of allMemoryFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(allMemoryDir, file), 'utf8'));
        if (JSON.stringify(data).toLowerCase().includes(searchTerm)) {
          results.push({ file, match: true, chunks: data.chunks });
        }
      }
      writeMessage({
        type: 'search_results',
        query: msg.query,
        results,
        timestamp: Date.now(),
        requestId
      });
    } catch (error) {
      writeMessage({ type: 'error', error: 'Native search failed: ' + error.message, requestId });
    }
    
  } else if (msg.type === 'getMemoryStats') {
    // Get memory stats from storage
    try {
      const stats = getStorageStats();
      
      // Also get SQLite stats if available
      let sqliteStats = { totalChunks: 0, totalSize: 0 };
      if (sqliteStorage && sqliteStorage.isInitialized && sqliteStorage.getStorageStats) {
        sqliteStats = sqliteStorage.getStorageStats();
      }
      
      const memoryStats = {
        domChunks: sqliteStats.domChunks || stats.overflowCount || 0,
        hotBufferChunks: sqliteStats.hotBufferChunks || stats.allMemoryCount || 0,
        archivedChunks: sqliteStats.archivedChunks || 0,
        totalChunks: sqliteStats.totalChunks || (stats.overflowCount || 0) + (stats.allMemoryCount || 0),
        totalSize: sqliteStats.totalSize || 0,
        hotMemorySize: sqliteStats.hotBufferSize || 0,
        domSize: sqliteStats.domSize || 0,
        archiveSize: sqliteStats.archiveSize || 0,
        totalCharacters: sqliteStats.totalCharacters || 0,
        lastUpdated: Date.now(),
        storageDir: storageDir,
        overflowCount: stats.overflowCount || 0,
        allMemoryCount: stats.allMemoryCount || 0
      };
      
      writeMessage({ 
        type: 'getMemoryStats',
        success: true,
        stats: memoryStats,
        timestamp: Date.now(),
        requestId
      });
    } catch (error) {
      writeMessage({ 
        type: 'getMemoryStats',
        success: false,
        error: error.message,
        timestamp: Date.now(),
        requestId
      });
    }
    
  } else if (msg.type === 'status') {
    // Return desktop app status
    const stats = getStorageStats();
    writeMessage({ 
      type: 'status_response', 
      success: true,
      online: true,
      storageDir: storageDir,
      overflowCount: stats.overflowCount,
      allMemoryCount: stats.allMemoryCount,
      timestamp: Date.now(),
      requestId
    });
    
  } else {
    writeMessage({ type: 'error', error: 'Unknown message type: ' + msg.type, requestId });
  }
}

// Get storage statistics
function getStorageStats() {
  try {
    const overflowFiles = fs.readdirSync(overflowDir).filter(file => file.endsWith('.json'));
    const allMemoryFiles = fs.readdirSync(allMemoryDir).filter(file => file.endsWith('.json'));
    
    return {
      overflowCount: overflowFiles.length,
      allMemoryCount: allMemoryFiles.length,
      storageDir: storageDir
    };
  } catch (error) {
    return {
      overflowCount: 0,
      allMemoryCount: 0,
      storageDir: storageDir,
      error: error.message
    };
  }
}

// Handle memory injection
function handleMemoryInjection(msg) {
  // For now, just acknowledge the injection request
  writeMessage({ 
    type: 'injection_acknowledged',
    success: true,
    content: msg.content,
    timestamp: Date.now()
  });
}

// Main loop
process.stdin.on('data', (data) => {
  // Append to buffer
  messageBuffer = Buffer.concat([messageBuffer, data]);
  // Process any complete messages
  processMessages();
});

// Keep process alive
process.stdin.resume();