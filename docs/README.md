# AMP (Auto Memory Persistence) - Comprehensive Guide

**Version**: 4.0.0  
**Last Updated**: December 2025  
**Status**: Production Ready with Known Issues Documented

## 🎯 Overview

AMP is a revolutionary browser extension + desktop application that provides infinite context memory for AI conversations through a sophisticated **dual zipper memory architecture** with comprehensive **fork system** for data routing and processing.

### Core Features
- **🔗 Dual Zipper Architecture**: Fat zipper (full S1-S9 blocks) + Thin zipper (compressed S9 tags)
- **🔀 Fork System**: Intelligent data routing through specialized processing paths
- **💾 5MB Hot Memory Pool**: Optimized memory capacity with desktop overflow
- **❄️ Cold Storage**: Automatic archiving to SQLite via Native Messaging
- **⚡ Immediate Persistence**: All data saved to Chrome storage instantly for crash safety
- **🛡️ Robust Error Handling**: Comprehensive recovery mechanisms for production reliability
- **🔄 Cross-Session Survival**: Data persists across browser restarts
- **🧠 Intelligent Memory Management**: 5 slots of 1MB each with temperature-based prioritization
- **📊 Health Monitoring**: Real-time system health checks and performance metrics
- **🔐 AES-256 Encryption**: Military-grade encryption with zero plaintext retention
- **🌐 Cross-Tab Communication**: Real-time data sharing across browser tabs
- **🎛️ Provider Optimization**: AI provider-specific handling (ChatGPT, Claude, Gemini)
- **⚡ Priority Processing**: Intelligent priority-based routing and processing
- **🗜️ Adaptive Compression**: Content-aware compression strategies
- **💉 Context Injection**: Smart context injection for AI conversations
- **🎨 Visual Status System**: Rainbow ring animation with colored frame indicators for instant status feedback

## 🏗️ Architecture

### Communication System
- **Primary**: Native Messaging via `chrome.runtime.connectNative()`
- **Host Name**: `com.ampiq.amp.native`
- **Protocol**: Chrome Native Messaging (stdin/stdout with 4-byte length prefix)
- **Extension**: Sends requests to native host via `nativePort.postMessage()`
- **Native Host**: `amp-native-host.js` receives messages and stores to SQLite
- **Desktop App**: Optional Electron GUI that reads the same SQLite database
- **Data Flow**: Extension captures → Native Host stores → Desktop displays

### Memory Hierarchy (Waterfall System)
```
1. DOM Layer (9 slots)     → 0ms instant access
2. 5x1MB Buffer System     → Background script hot memory
3. Native Host SQLite      → Persistent cold storage via Native Messaging
4. Archive/Cold Storage    → Long-term persistence
```

### File Responsibilities
- **`ext/background.js`** - Service worker, memory management, Native Messaging client
- **`ext/content.js`** - DOM monitoring, conversation capture, context injection
- **`ext/utils.js`** - MemoryPool class, dual zipper logic, S1-S9 management, encryption
- **`ext/dropdown.js`** - Extension popup UI with stats display
- **`ext/license.js`** - License management and feature gating
- **`desktop-ui/amp-native-host.js`** - Native Messaging host, SQLite storage bridge
- **`desktop-ui/main.js`** - Electron main process, desktop GUI
- **`desktop-ui/sqlite-storage.js`** - SQLite database management with FTS5 search

## 🚨 Known Issues & Current Status

### ✅ Working Components
- ✅ Native Messaging host (`com.ampiq.amp.native`)
- ✅ Extension sending messages via `chrome.runtime.connectNative()`
- ✅ Native host receiving and responding to messages
- ✅ SQLite storage with full-text search (FTS5)
- ✅ Connection status updating via ping/pong
- ✅ Dual zipper memory system (fat + thin)
- ✅ S1-S9 progression system
- ✅ Rainbow ring animation status indicator

### ❌ Known Issues
- ❌ **Stats Display**: Extension dropdown may not show real numbers
- ❌ **Content Capture**: Chrome extension not consistently capturing conversation data
- ❌ **Data Flow**: No data flowing from websites to storage in some cases
- ❌ **Content Scripts**: May not be loading/working on all AI sites
- ❌ **Provider Detection**: Some AI providers may not be detected properly
- ❌ **DOM Selectors**: May need updates for current AI site structures

### 🔧 Development Issues
- **Native Host Registration**: Host must be registered in Windows Registry or Chrome config
- **SQLite Version Mismatch**: better-sqlite3 may need rebuild when version mismatch
- **Extension Reload**: Extension needs manual reload after code changes
- **Desktop Refresh**: Desktop app needs Ctrl+R after renderer changes
- **Process Management**: Old processes may need killing before starting new ones

## 📦 Dependencies

### Root Dependencies
```json
{
  "better-sqlite3": "^12.2.0",
  "electron": "^28.0.0",
  "electron-builder": "^24.13.3"
}
```

### Desktop App Dependencies
```json
{
  "better-sqlite3": "^12.2.0",
  "bindings": "^1.5.0"
}
```

### Development Dependencies
```json
{
  "7zip-bin": "^5.2.0",
  "electron": "28.3.3",
  "electron-builder": "^24.13.3",
  "@electron/rebuild": "^4.0.1"
}
```

### System Requirements
- **Node.js**: >=18.0.0
- **npm**: >=8.0.0
- **Chrome**: Latest version with extension support
- **Windows**: 10/11 (primary platform)
- **macOS**: 10.15+ (secondary platform)
- **Linux**: Ubuntu 20.04+ (tertiary platform)

## 🚀 Quick Start

### 1. Installation
```bash
# Clone repository
git clone https://github.com/AMPLIFAIUI/A.M.P.git
cd A.M.P

# Install dependencies
npm install
npm run install-deps
```

### 2. Register Native Messaging Host

#### Windows
Create registry key or JSON manifest:
```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native
```
Or copy `com.ampiq.amp.native.json` to:
```
%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\
```

#### macOS
```bash
cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

#### Linux
```bash
cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/
```

### 3. Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle top right)
3. Click "Load unpacked"
4. Select folder: `ext/`
5. Verify extension appears with no errors

### 4. Start Desktop App (Optional)
```bash
cd desktop-ui
npm start
```

### 5. Test Connection
1. Open extension dropdown
2. Check for "Connected" status
3. Look for green ring animation on extension icon
4. Open an AI chat site (ChatGPT, Claude, etc.)
5. Send a message and verify capture

## 🔧 Troubleshooting

### Native Messaging Issues
```bash
# Check if native host is registered (Windows)
reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"

# Check native host JSON file
cat %APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.ampiq.amp.native.json

# Verify path in JSON points to correct amp-native-host.js location
```

### SQLite Issues
```bash
# Rebuild better-sqlite3
cd desktop-ui
npm rebuild better-sqlite3
```

### Extension Issues
1. **Reload Extension**: Go to `chrome://extensions/` and click reload
2. **Clear Cache**: Ctrl+Shift+Delete → Clear cached files
3. **Check Console**: F12 → Console tab for error messages
4. **Check Background**: chrome://extensions/ → Service Worker "Inspect"
5. **Test on AI Site**: Go to https://chat.openai.com and check console

### Desktop App Issues
1. **Refresh Renderer**: Ctrl+R in desktop app
2. **Restart App**: Kill process and restart with `npm start`
3. **Check SQLite**: Verify database file exists in `~/.ampiq/AMP/memory.db`

## 📡 Native Messaging Protocol

### Connection Setup
```javascript
// Extension connects to native host
const NATIVE_HOST_NAME = 'com.ampiq.amp.native';
nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

// Listen for messages
nativePort.onMessage.addListener((message) => {
  handleNativeMessage(message);
});

// Handle disconnection
nativePort.onDisconnect.addListener(() => {
  // Reconnect logic
});
```

### Message Types

#### Extension → Native Host
```javascript
// Ping (connection test)
{ type: 'ping', requestId: 'req_1_1234567890' }

// Status request
{ type: 'status', requestId: 'req_2_1234567890' }

// Store overflow chunk
{ type: 'overflow', chunk: {...}, requestId: 'req_3_1234567890' }

// Send all memory (cascade)
{ type: 'sendAllMemory', chunks: [...], timestamp: 1234567890 }

// Cascade memory to desktop
{ type: 'cascadeMemory', chunks: [...], timestamp: 1234567890 }

// Get memory stats
{ type: 'getMemoryStats', requestId: 'req_4_1234567890' }

// Search memory
{ type: 'search_memory', query: 'search term' }

// Get memory data
{ type: 'get_memory_data' }
```

#### Native Host → Extension
```javascript
// Pong (connection confirmed)
{ type: 'pong', time: 1234567890, requestId: 'req_1_1234567890' }

// Status response
{ type: 'status_response', success: true, online: true, stats: {...} }

// Overflow saved confirmation
{ type: 'overflow_saved', success: true, chunkId: '...', sqliteStored: true }

// All memory saved confirmation
{ type: 'all_memory_saved', success: true, sqliteCount: 10, chunkCount: 10 }

// Cascade complete
{ type: 'cascade_complete', success: true, sqliteCount: 10 }

// Memory stats
{ type: 'getMemoryStats', success: true, stats: {...} }

// Search results
{ type: 'search_results', query: '...', results: [...] }

// Memory data response
{ type: 'memory_data_response', data: [...], count: 10 }
```

### Native Messaging Wire Protocol
Messages are sent with a 4-byte length prefix (little-endian):
```javascript
// Sending
const json = JSON.stringify(message);
const buffer = Buffer.alloc(4 + Buffer.byteLength(json));
buffer.writeUInt32LE(Buffer.byteLength(json), 0);
buffer.write(json, 4);
process.stdout.write(buffer);

// Receiving
const msgLen = buffer.readUInt32LE(0);
const msgData = buffer.slice(4, 4 + msgLen);
const message = JSON.parse(msgData.toString());
```

## 🛡️ Security & Privacy

### Encryption
- **Algorithm**: AES-256 with XOR layers
- **Key Rotation**: Every 10 minutes
- **Salt**: Random 16-byte salt per encryption
- **Zero Plaintext**: No unencrypted data retention in storage

### Data Handling
- **No Server Calls**: All processing local
- **No Analytics**: No tracking or data collection
- **User Control**: Complete control over data
- **GDPR Compliant**: Right to deletion, data portability
- **Native Messaging**: Secure Chrome-mediated communication

## 📚 Documentation Structure

### Core Documentation
- **[Architecture Rules](docs/AMP_ARCHITECTURE_RULES.md)** - Complete technical architecture
- **[Implementation Checklist](docs/AMP_IMPLEMENTATION_CHECKLIST.md)** - Development checklist
- **[System Audit](docs/support/SYSTEM_AUDIT.md)** - Comprehensive system analysis
- **[Error Handling](docs/support/error-handling.md)** - Troubleshooting guide

### Development Guides
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Performance Guide](docs/development/performance.md)** - Optimization
- **[Extension Optimization](docs/guides/Extension_Optimization_Guide.md)** - UI optimization

### Legal & Compliance
- **[License](docs/legal/LICENSE.md)** - MIT License (commercial restrictions)
- **[Legal Details](docs/legal/legal.md)** - Privacy and security
- **[Code of Conduct](docs/legal/CODE_OF_CONDUCT.md)** - Development standards

## 🔮 Future Enhancements

### Planned Features
- **Vector Embeddings**: Advanced semantic search capabilities
- **Machine Learning**: Intelligent context selection
- **Cloud Sync**: Optional cloud backup and sync
- **API Integration**: Direct integration with AI provider APIs
- **Advanced Analytics**: Detailed usage analytics and insights

### Known Improvements Needed
- **Content Capture Reliability**: More robust DOM monitoring
- **Provider Support**: Additional AI provider compatibility
- **Performance Optimization**: Memory usage optimization
- **Error Recovery**: Enhanced error handling and recovery
- **Testing Suite**: Comprehensive automated testing

## 📄 License

This project is licensed under the MIT License with commercial restrictions. See [LICENSE](docs/legal/LICENSE.md) for details.

**Commercial Use**: Requires enterprise license from AMPiQ. Contact support@ampiq.ai for licensing.

## 🤝 Contributing

Contributions are welcome! Please read our [Code of Conduct](docs/legal/CODE_OF_CONDUCT.md) and follow the development guidelines in [.cursorrules](.cursorrules).

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AMPLIFAIUI/A.M.P/issues)
- **Documentation**: [docs/](docs/) directory
- **Legal**: [docs/legal/](docs/legal/) directory
- **Enterprise**: support@ampiq.ai

---

**AMP: The Infinite Context Engine** - Revolutionizing AI conversation memory management through intelligent dual zipper architecture and comprehensive fork system routing.

**© 2025 AMPiQ. All rights reserved.**
