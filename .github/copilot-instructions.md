# AMP (Auto Memory Persistence) - AI Coding Agent Instructions

## Additional Context:codebase
The A.M.P folder in the root directory contains the codebase for the AMP Chrome extension and Electron desktop app, which provides infinite context memory for AI conversations. The extension captures conversation data from AI sites, stores it in a memory pool, and allows users to inject this data back into conversations. Always reference the latest version of the codebase in the root before development, coding, or testing.
## Project Overview
AMP is a Chrome extension with Electron desktop app that provides infinite context memory for AI conversations through a sophisticated memory management system.

## Architecture Essentials

### Core Memory System
- **Native Messaging Only**: Communication between Chrome extension and Electron desktop app uses native messaging protocol (`com.ampiq.amp.native`)
- **Memory Storage**: SQLite database in user data directory (`~/.config/AMP/memory.db` or `%APPDATA%/AMP/memory.db`)
- **Hot Memory Pool**: In-memory storage in Chrome extension for active conversations
- **Desktop Integration**: Electron app provides persistent storage and live text viewer GUI

### Key Components
```
ext/             # Chrome extension (Manifest V3)
├── background.js    # Service worker with memory management
├── content.js       # Content script for AI site injection
├── popup.js         # Extension popup interface
└── utils.js         # Memory pool and encryption utilities

desktop-ui/       # Electron desktop application
├── main.js          # Main Electron process with native messaging
├── renderer.js      # GUI with live text viewer and injection
└── index.html       # Main application window

amp-native-host.js   # Native messaging bridge
server/             # Optional HTTP server (NOT USED in production)
```

## Development Patterns

### Memory Management
- Use `memoryPool.addChunk()` for storing conversation data
- Implement cascade overflow: DOM → Hot Buffer → Desktop Storage
- Always encrypt sensitive data using `DOMEncryption` class
- Index by provider, topic, and conversation ID for fast retrieval

### Native Messaging Protocol
```javascript
// Extension to Desktop
chrome.runtime.connectNative('com.ampiq.amp.native')

// Message Types
{ type: 'overflow', chunk: {...} }        // Overflow data to desktop
{ type: 'sendAllMemory', chunks: [...] }  // Send all memory to GUI
{ type: 'inject_memory', content: '...' } // Inject text to active AI page
```

### Live Text Viewer Features
- **Text Highlighting**: Select text in memory viewer for targeted injection
- **Inject Selected**: Send only highlighted text to active AI conversation
- **Send All Visible**: Send entire viewer content to AI page
- **Provider Filtering**: Filter by ChatGPT, Claude, Gemini, etc.

## Critical Implementation Rules

### 1. Extension Architecture
- **Manifest V3**: Use service worker, not background pages
- **Content Scripts**: Must handle all AI provider sites (`<all_urls>`)
- **Permissions**: Requires `storage`, `activeTab`, `unlimitedStorage`

### 2. Desktop App Architecture
- **Electron Main Process**: Handles native messaging and file operations
- **SQLite Storage**: Use `better-sqlite3` for indexed conversation storage
- **User Data Directory**: Store database in OS-appropriate app data folder

### 3. Security Requirements
- **No Plaintext Storage**: Encrypt all conversation data
- **Session Keys**: Rotate encryption keys every 10 minutes
- **Privacy Controls**: Implement "frost viewer" for privacy

### 4. Error Handling
- **Graceful Degradation**: Continue operation if desktop app disconnected
- **Retry Logic**: Implement exponential backoff for failed operations
- **Storage Fallback**: Use Chrome storage if desktop unavailable

## Common Integration Points

### Adding New AI Provider Support
1. Update provider detection in `getAIProviderFromUrl()`
2. Add content script selectors for message extraction
3. Update provider filtering in desktop GUI
4. Test injection compatibility

### Memory Search and Retrieval
```javascript
// Fast search across indexed conversations
const results = await memoryPool.searchInConversations(query, {
  provider: 'chatgpt',
  topic: 'programming',
  limit: 10
});
```

### Text Injection System
```javascript
// Inject content to active AI conversation
if (nativePort) {
  nativePort.postMessage({
    type: 'inject_memory',
    content: selectedText,
    target: 'active_tab'
  });
}
```

## Build and Deployment

### Extension Packaging
- Build directory: `ext/` (load unpacked for development)
- Production manifest: Ensure extension ID matches native messaging config

### Desktop App Distribution
- Build: `npm run build` in `desktop-ui/`
- Installer: Creates `.exe` with SQLite database in user data folder
- Native host registration: Automatic during installation

## Testing Approach
- Run `test_robust_workflow.js` for memory system validation
- Test native messaging connection with `test-connections.js`
- Verify cross-platform compatibility (Windows/Mac/Linux)

## Key Files to Reference
- `ext/utils.js` - Memory pool implementation
- `desktop-ui/renderer.js` - Live text viewer and injection
- `amp-native-host.js` - Native messaging bridge
- `docs/AMP_System_Overview.md` - Comprehensive architecture guide

When implementing features, prioritize native messaging communication, maintain the existing memory management patterns, and ensure all sensitive data remains encrypted and local to the user's machine.
