# AMP Architecture Rules

## Complete System Architecture

### Overview
AMP (Automated Memory Persistence) is an "infinite context window" system for AI conversations. It captures, stores, and retrieves conversation data across multiple AI providers, enabling context persistence beyond the limitations of individual AI sessions.

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Chrome)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌────────────────────────────────────────────────┐ │
│  │   AI Provider   │     │              Chrome Extension                   │ │
│  │    Websites     │     │  ┌──────────────────────────────────────────┐  │ │
│  │  ┌───────────┐  │     │  │         background.js (Service Worker)    │  │ │
│  │  │  ChatGPT  │──┼─────┼─▶│  ┌────────────────────────────────────┐  │  │ │
│  │  │  Claude   │  │     │  │  │     MemoryPool (5x1MB Hot Slots)   │  │  │ │
│  │  │  Gemini   │  │     │  │  │  ┌──────────┐ ┌──────────────────┐ │  │  │ │
│  │  │  Copilot  │  │     │  │  │  │ S1-S9    │ │   Dual Zipper    │ │  │  │ │
│  │  │  Perplexity│ │     │  │  │  │Progression│ │ ┌──────┐┌─────┐ │ │  │  │ │
│  │  │  etc...   │  │     │  │  │  └──────────┘ │ │ Fat  ││Thin │ │ │  │  │ │
│  │  └───────────┘  │     │  │  │               │ │Zipper││Zipper│ │ │  │  │ │
│  │        │        │     │  │  │               │ └──────┘└─────┘ │ │  │  │ │
│  │        │        │     │  │  └────────────────────────────────────┘  │  │ │
│  │        ▼        │     │  │                    │                      │  │ │
│  │  ┌───────────┐  │     │  │                    │ Overflow             │  │ │
│  │  │content.js │  │     │  │                    ▼                      │  │ │
│  │  │MutationObs│──┼─────┼─▶│  ┌─────────────────────────────────────┐  │  │ │
│  │  └───────────┘  │     │  │  │     Native Messaging Client          │  │  │ │
│  │                 │     │  │  │  chrome.runtime.connectNative()      │  │  │ │
│  │                 │     │  │  │  Host: 'com.ampiq.amp.native'        │  │  │ │
│  │                 │     │  │  └─────────────────────────────────────┘  │  │ │
│  └─────────────────┘     │  └────────────────────────────────────────────┘  │ │
│                          │                      │                            │ │
│                          │  ┌───────────────────┼───────────────────────┐   │ │
│                          │  │     UI Components │                       │   │ │
│                          │  │  ┌────────────────▼──────────────────┐   │   │ │
│                          │  │  │         dropdown.js               │   │   │ │
│                          │  │  │    (Stats, Connection Status)     │   │   │ │
│                          │  │  └───────────────────────────────────┘   │   │ │
│                          │  │  ┌───────────────────────────────────┐   │   │ │
│                          │  │  │          amp-ui.js                │   │   │ │
│                          │  │  │    (3D Zipper Visualization)      │   │   │ │
│                          │  │  └───────────────────────────────────┘   │   │ │
│                          │  └───────────────────────────────────────────┘   │ │
│                          └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Native Messaging (stdin/stdout)
                                          │ 4-byte length prefix protocol
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NATIVE MESSAGING HOST (Node.js)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     amp-native-host.js                                │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              Message Handlers:                                  │  │   │
│  │  │    ping           - Connection test → pong                     │  │   │
│  │  │    status         - Storage stats                              │  │   │
│  │  │    overflow       - Store overflow chunk to SQLite             │  │   │
│  │  │    sendAllMemory  - Bulk store chunks → all_memory_saved       │  │   │
│  │  │    cascadeMemory  - Cascade all memory → cascade_complete      │  │   │
│  │  │    getMemoryStats - Get storage statistics                     │  │   │
│  │  │    search_memory  - Search stored data (FTS5)                  │  │   │
│  │  │    get_memory_data - Retrieve stored chunks                    │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                               │                                       │   │
│  │                               ▼                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              sqlite-storage.js (SQLite Database)                │  │   │
│  │  │  Tables:                                                        │  │   │
│  │  │    - conversations (id, provider, topic, timestamps)           │  │   │
│  │  │    - memory_chunks (content, metadata, FTS indexed)            │  │   │
│  │  │    - memory_search (FTS5 virtual table for fast search)        │  │   │
│  │  │  Location: ~/.ampiq/AMP/memory.db                              │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Shared SQLite Database
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DESKTOP APP (Electron) - OPTIONAL GUI                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        main.js (Main Process)                         │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              Reads same SQLite database                         │  │   │
│  │  │              Provides GUI for viewing stored data               │  │   │
│  │  │              Database: ~/.ampiq/AMP/memory.db                   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                               │                                       │   │
│  │                               ▼                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              renderer.js (UI Process)                           │  │   │
│  │  │    - Connection status display                                  │  │   │
│  │  │    - Memory statistics                                          │  │   │
│  │  │    - Conversation browser                                       │  │   │
│  │  │    - Search interface                                           │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Memory Hierarchy
```
DOM (9 slots) → Hot Memory (5x1MB slots) → Native Host SQLite (Cold Storage)
     ↑                    ↑                        ↑
  30 min TTL          24 hour TTL              Permanent
```

### 2. S1-S9 Progression System
Each conversation chunk progresses through 9 stages:
- **S1**: Raw capture from DOM
- **S2-S8**: Progressive edits and refinements
- **S9**: Canonical summary (final compressed form)

### 3. Dual Zipper System
- **Fat Zipper**: Stores full S1-S9 blocks (`blk057-chk019 → full data`)
- **Thin Zipper**: Stores compressed S9 tags for O(1) lookup (`blk057-chk019-sq9 → tag`)

### 4. Hot Pool Architecture
```javascript
// 5x1MB cascading slots (adaptive based on system RAM)
this.slots = [
  { id: 1, maxSize: 1MB, chunks: Map() }, // Newest data
  { id: 2, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 3, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 4, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 5, maxSize: 1MB, chunks: Map() }  // Oldest data → overflow to native host
];

// Unified view for quick access
this.hotPool = new Map(); // chunk_id → chunk
```

## Communication Protocol

### Native Messaging Setup
```javascript
// Extension side (background.js)
const NATIVE_HOST_NAME = 'com.ampiq.amp.native';
let nativePort = null;

function connectToNativeHost() {
  nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  
  nativePort.onMessage.addListener((message) => {
    handleNativeMessage(message);
  });
  
  nativePort.onDisconnect.addListener(() => {
    // Handle disconnect, attempt reconnect
    setTimeout(() => connectToNativeHost(), 5000);
  });
}
```

### Message Types

#### Extension → Native Host
```javascript
// Ping (connection test)
{ type: 'ping', requestId: 'req_1_timestamp' }

// Store overflow chunk
{ type: 'overflow', chunk: { id, content, provider, ... }, requestId: '...' }

// Send all memory (bulk cascade)
{ type: 'sendAllMemory', chunks: [...], timestamp: Date.now() }

// Cascade memory to desktop
{ type: 'cascadeMemory', chunks: [...], timestamp: Date.now() }

// Get memory stats
{ type: 'getMemoryStats', requestId: '...' }

// Search memory
{ type: 'search_memory', query: 'search term', requestId: '...' }

// Get memory data
{ type: 'get_memory_data', requestId: '...' }

// Get status
{ type: 'status', requestId: '...' }
```

#### Native Host → Extension
```javascript
// Pong (connection confirmed)
{ type: 'pong', time: Date.now(), requestId: '...' }

// Overflow saved
{ type: 'overflow_saved', success: true, chunkId: '...', sqliteStored: true, fileStored: true }

// All memory saved
{ type: 'all_memory_saved', success: true, sqliteCount: 10, chunkCount: 10, stats: {...} }

// Cascade complete
{ type: 'cascade_complete', success: true, sqliteCount: 10, stats: {...} }

// Memory stats
{ type: 'getMemoryStats', success: true, stats: {...} }

// Search results
{ type: 'search_results', query: '...', results: [...] }

// Memory data response
{ type: 'memory_data_response', data: [...], count: 10 }

// Status response
{ type: 'status_response', success: true, online: true, storageDir: '...' }

// Error
{ type: 'error', error: 'Error message', requestId: '...' }
```

### Native Messaging Wire Protocol
```javascript
// Native host receives messages via stdin with 4-byte length prefix
process.stdin.on('data', (data) => {
  messageBuffer = Buffer.concat([messageBuffer, data]);
  
  while (messageBuffer.length >= 4) {
    const msgLen = messageBuffer.readUInt32LE(0);
    if (messageBuffer.length < 4 + msgLen) break;
    
    const msgData = messageBuffer.slice(4, 4 + msgLen);
    messageBuffer = messageBuffer.slice(4 + msgLen);
    
    const message = JSON.parse(msgData.toString());
    handleMessage(message);
  }
});

// Native host sends messages via stdout with 4-byte length prefix
function writeMessage(msg) {
  const json = JSON.stringify(msg);
  const buffer = Buffer.alloc(4 + Buffer.byteLength(json));
  buffer.writeUInt32LE(Buffer.byteLength(json), 0);
  buffer.write(json, 4);
  fs.writeSync(1, buffer); // stdout
}
```

## Key Files

### Extension (`ext/`)
| File | Purpose |
|------|---------|
| `background.js` | Service worker - memory management, Native Messaging client |
| `content.js` | DOM injection - captures AI conversations, context injection |
| `utils.js` | MemoryPool class, encryption, S1-S9 progression, dual zipper |
| `dropdown.js` | Popup UI - stats display, connection status |
| `license.js` | License management and feature gating |
| `amp-ui.js` | 3D zipper visualization |

### Desktop (`desktop-ui/`)
| File | Purpose |
|------|---------|
| `amp-native-host.js` | Native Messaging host - bridge to SQLite |
| `main.js` | Electron main process - desktop GUI |
| `sqlite-storage.js` | SQLite database management with FTS5 |
| `renderer.js` | Desktop UI |
| `preload.js` | IPC bridge |

## Critical Implementation Details

### 1. MemoryPool Integration (background.js)
```javascript
// Import utils.js using importScripts (MV3 compatible)
try {
  importScripts('utils.js');
  console.log('✅ utils.js imported successfully');
} catch (error) {
  console.error('❌ Failed to import utils.js:', error);
}

// Initialize real MemoryPool
async function initializeMemoryPool() {
  if (typeof MemoryPool !== 'undefined') {
    activeMemoryPool = new MemoryPool();
    await activeMemoryPool.loadFromStorage();
  } else {
    activeMemoryPool = createFallbackMemoryPool();
  }
}
```

### 2. hotPool Synchronization (utils.js)
```javascript
// When adding to slot, also add to hotPool
async addToSlot(chunk) {
  slot.chunks.set(chunk.id, chunk);
  this.hotPool.set(chunk.id, chunk); // CRITICAL: unified view
}

// When overflowing to native host, remove from hotPool
async sendToDesktopOverflow(chunk) {
  await chrome.runtime.sendMessage({
    action: 'sendToDesktop',
    type: 'overflow',
    chunk: chunk
  });
  this.hotPool.delete(chunk.id); // CRITICAL: cleanup
}
```

### 3. Native Messaging Connection (background.js)
```javascript
// Connect to native messaging host
function connectToNativeHost() {
  nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  
  // Send ping to verify connection
  sendNativeMessage({ type: 'ping' }).then(() => {
    updateConnectionStatus(true);
  }).catch((error) => {
    updateConnectionStatus(false);
  });
}

// Send message with response tracking
function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    const requestId = `req_${++messageIdCounter}_${Date.now()}`;
    const messageWithId = { ...message, requestId };
    
    const timeout = setTimeout(() => {
      pendingResponses.delete(requestId);
      reject(new Error(`Native message timeout: ${message.type}`));
    }, 10000);
    
    pendingResponses.set(requestId, { resolve, reject, timeout });
    nativePort.postMessage(messageWithId);
  });
}
```

## STRICT DEVELOPMENT RULES

### 1. NEVER ASSUME SUCCESS
- **ALWAYS verify** terminal output shows actual success
- **ALWAYS test** the connection after any changes
- **NEVER say "should work"** without proof

### 2. FIX ONE THING AT A TIME
- **ONE issue per fix** - don't chase multiple problems
- **TEST immediately** after each fix
- **VERIFY the fix worked** before moving on

### 3. ALWAYS CHECK TERMINAL FIRST
- **READ terminal output** completely before responding
- **IDENTIFY the actual error** from terminal logs
- **IGNORE unrelated errors** (like cache errors)

### 4. NATIVE MESSAGING RULES
- **Host Name**: `com.ampiq.amp.native`
- **Protocol**: stdin/stdout with 4-byte length prefix
- **Extension connects via**: `chrome.runtime.connectNative()`
- **NEVER use HTTP/ports** for extension-desktop communication

### 5. SQLITE RULES
- **ALWAYS rebuild** better-sqlite3 when version mismatch
- **USE desktop-ui directory** for rebuilds
- **Database location**: `~/.ampiq/AMP/memory.db`

### 6. CONNECTION TESTING RULES
- **OPEN extension dropdown** to trigger connection
- **CHECK background console** for connection messages
- **VERIFY ring animation** shows green (connected)
- **TEST stats display** in extension

### 7. DEBUG LOGGING
- **Look for 🔧 messages** in console
- **Trace the flow**: Extension → Native Messaging → Native Host → SQLite
- **Verify each step** before moving to next

## Error Priority
1. **Native host not found** - check registration and path
2. **SQLite version mismatch** (ERR_DLOPEN_FAILED) - rebuild
3. **Connection issues** (no pong response) - check native host
4. **UI display issues** (stats not showing) - check handlers

## Success Criteria
- ✅ Extension icon shows: Rainbow ring animation
- ✅ Extension connects: Green ring state
- ✅ Background logs: "Native messaging connection established"
- ✅ Stats display: Real numbers in extension dropdown
- ✅ Memory persists: Data survives browser restart

## Testing Workflow
1. Load extension in chrome://extensions/
2. Open extension dropdown
3. Check background console (Service Worker "Inspect")
4. Look for "✅ Native messaging connection established"
5. Verify stats show real data (not zeros)
6. Open AI chat, send message
7. Check native host logs for "overflow" or "sendAllMemory" messages
8. Verify chunk count increases
9. Check SQLite database has data
