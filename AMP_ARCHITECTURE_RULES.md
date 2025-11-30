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
│  │  └───────────┘  │     │  │  │     HTTP Client (localhost:3000)    │  │  │ │
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
                                          │ HTTP (localhost:3000)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DESKTOP APP (Electron)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        main.js (Main Process)                         │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              HTTP Server (port 3000)                            │  │   │
│  │  │  Endpoints:                                                     │  │   │
│  │  │    GET  /ping         - Connection test                        │  │   │
│  │  │    GET  /status       - Storage stats                          │  │   │
│  │  │    GET  /conversations - List conversations                    │  │   │
│  │  │    GET  /chunks       - Get conversation chunks                │  │   │
│  │  │    GET  /search       - Search memory                          │  │   │
│  │  │    GET  /recent       - Recent activity                        │  │   │
│  │  │    GET  /all-memory   - All stored data                        │  │   │
│  │  │    POST /             - Store/query data                       │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                               │                                       │   │
│  │                               ▼                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              sqlite-storage.js (SQLite Database)                │  │   │
│  │  │  Tables:                                                        │  │   │
│  │  │    - conversations (id, provider, topic, timestamps)           │  │   │
│  │  │    - memory_chunks (content, metadata, FTS indexed)            │  │   │
│  │  │    - memory_search (FTS virtual table)                         │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                               │                                       │   │
│  │                               ▼                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              renderer.js (UI Process)                           │  │   │
│  │  │    - Connection status display                                  │  │   │
│  │  │    - Memory statistics                                          │  │   │
│  │  │    - Conversation browser                                       │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Memory Hierarchy
```
DOM (9 slots) → Hot Memory (5x1MB slots) → Desktop SQLite (Cold Storage)
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
// 5x1MB cascading slots
this.slots = [
  { id: 1, maxSize: 1MB, chunks: Map() }, // Newest data
  { id: 2, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 3, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 4, maxSize: 1MB, chunks: Map() }, // ↓
  { id: 5, maxSize: 1MB, chunks: Map() }  // Oldest data → overflow to desktop
];

// Unified view for quick access
this.hotPool = new Map(); // chunk_id → chunk
```

## Communication Protocol

### Extension → Desktop (HTTP)
```
Port: 3000
Host: 127.0.0.1

Endpoints:
  GET  /ping          → { type: 'pong', timestamp }
  GET  /status        → { connected, storageAvailable, stats }
  GET  /conversations → { conversations: [...] }
  GET  /chunks?id=X   → { chunks: [...] }
  GET  /search?q=X    → { results: [...] }
  GET  /recent        → { activity: [...] }
  GET  /all-memory    → { data: { conversations, chunks, stats } }
  POST /              → { type: 'store_data', data: {...} }
```

### Message Types (POST)
```javascript
// Store memory chunk
{ type: 'store_data', data: { content, provider, topic, timestamp } }

// Send all memory (bulk)
{ type: 'sendAllMemory', chunks: [...] }

// Query data
{ type: 'get_data', query: { conversation_id, search, recent, stats } }
```

## Key Files

### Extension (`ext/`)
| File | Purpose |
|------|---------|
| `background.js` | Service worker - memory management, HTTP client |
| `content.js` | DOM injection - captures AI conversations |
| `utils.js` | MemoryPool class, encryption, helpers |
| `dropdown.js` | Popup UI - stats display |
| `amp-ui.js` | 3D zipper visualization |

### Desktop (`desktop-ui/`)
| File | Purpose |
|------|---------|
| `main.js` | Electron main process - HTTP server |
| `sqlite-storage.js` | SQLite database management |
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

// When overflowing to desktop, remove from hotPool
async moveOldestToNextSlot(currentSlot, nextSlot) {
  if (overflowing) {
    await this.sendToDesktopOverflow(oldestChunk);
    this.hotPool.delete(oldestChunk.id); // CRITICAL: cleanup
  }
}
```

### 3. Desktop Query (background.js)
```javascript
// Query desktop for cold storage data
case 'getMemoryData':
  // Get hot pool data
  const hotData = Array.from(activeMemoryPool.hotPool.values());
  
  // Also query desktop for cold storage
  const desktopResponse = await fetch('http://127.0.0.1:3000/all-memory');
  const coldData = await desktopResponse.json();
  
  // Merge and return
  sendResponse({ data: [...hotData, ...coldData.chunks] });
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

### 4. PORT RULES
- **Extension connects to**: `http://127.0.0.1:3000`
- **Desktop listens on**: `port 3000`
- **NEVER use**: port 3456 (old incorrect value)

### 5. SQLITE RULES
- **ALWAYS rebuild** better-sqlite3 when version mismatch
- **USE desktop-ui directory** for rebuilds
- **IGNORE SQLite errors** if HTTP server starts successfully

### 6. CONNECTION TESTING RULES
- **OPEN extension dropdown** to trigger connection
- **CHECK terminal** for connection messages
- **VERIFY desktop app** shows "Connected"
- **TEST stats display** in extension

### 7. DEBUG LOGGING
- **Look for 🔧 messages** in terminal
- **Trace the flow**: Extension → HTTP → Desktop → SQLite
- **Verify each step** before moving to next

## Error Priority
1. **Port conflicts** (EADDRINUSE) - kill existing process
2. **SQLite version mismatch** (ERR_DLOPEN_FAILED) - rebuild
3. **Connection issues** (no HTTP messages) - check port
4. **UI display issues** (stats not showing) - check handlers

## Success Criteria
- ✅ Terminal shows: "HTTP server started successfully"
- ✅ Extension connects: "Received ping request"
- ✅ Desktop shows: "Connected" status
- ✅ Stats display: Real numbers in extension dropdown
- ✅ Memory persists: Data survives browser restart

## Testing Workflow
1. Start desktop app: `cd desktop-ui && npm start`
2. Verify: "HTTP server running on http://127.0.0.1:3000"
3. Reload extension in chrome://extensions/
4. Open extension dropdown
5. Check terminal for "Received ping request"
6. Verify stats show real data (not zeros)
7. Open AI chat, send message
8. Check terminal for "store_data" message
9. Verify chunk count increases
