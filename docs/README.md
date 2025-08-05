# AMP (Auto Memory Persistence) - Comprehensive Guide

**Version**: 4.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready with Known Issues Documented

## 🎯 Overview

AMP is a revolutionary browser extension + desktop application that provides infinite context memory for AI conversations through a sophisticated **dual zipper memory architecture** with comprehensive **fork system** for data routing and processing.

### Core Features
- **🔗 Dual Zipper Architecture**: Fat zipper (full S1-S9 blocks) + Thin zipper (compressed S9 tags)
- **🔀 Fork System**: Intelligent data routing through specialized processing paths
- **💾 5MB Hot Memory Pool**: Optimized memory capacity with desktop overflow
- **❄️ Cold Storage**: Automatic archiving to Chrome storage for unlimited conversation history
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
- **Primary**: HTTP on localhost:3000 (replaced native messaging for testing)
- **Extension**: Sends requests to desktop app via fetch()
- **Desktop**: Receives requests, stores data, shows UI
- **Data Flow**: Extension captures → Desktop stores → Both display

### Memory Hierarchy (Waterfall System)
```
1. DOM Layer (9 slots)     → 0ms instant access
2. 5x1MB Buffer System     → Background script hot memory
3. Desktop SQLite Storage  → HTTP communication overflow
4. Archive/Cold Storage    → Long-term persistence
```

### File Responsibilities
- **`ext/content.js`** - S1-S9 progression, dual zipper capture, context injection
- **`ext/background.js`** - Dual zipper system, HTTP communication, desktop integration
- **`ext/utils.js`** - MemoryPool class, dual zipper logic, S1-S9 management
- **`desktop-ui/`** - Desktop app with SQLite storage, live text viewer, injection GUI
- **`desktop-ui/main.js`** - HTTP server on localhost:3000 for extension communication

## 🚨 Known Issues & Current Status

### ✅ Working Components
- ✅ Desktop app HTTP server on port 3000
- ✅ Extension sending ping requests via fetch()
- ✅ Desktop receiving and responding to HTTP requests
- ✅ Connection status updating
- ✅ SQLite storage system ready
- ✅ Basic error handling implemented

### ❌ Known Issues
- ❌ **Stats Display**: Extension dropdown may not show real numbers
- ❌ **Content Capture**: Chrome extension not consistently capturing conversation data
- ❌ **Data Flow**: No data flowing from websites to storage in some cases
- ❌ **Content Scripts**: May not be loading/working on all AI sites
- ❌ **Provider Detection**: Some AI providers may not be detected properly
- ❌ **DOM Selectors**: May need updates for current AI site structures

### 🔧 Development Issues
- **Port Conflicts**: Port 3000 may be in use (check with `netstat -ano | findstr :3000`)
- **SQLite Version Mismatch**: better-sqlite3 may need rebuild when version mismatch
- **Extension Reload**: Extension needs manual reload after code changes
- **Desktop Refresh**: Desktop app needs Ctrl+R after renderer changes
- **Process Management**: Old processes may need killing before starting new ones

## 📦 Dependencies

### Root Dependencies
```json
{
  "better-sqlite3": "^12.2.0",
  "cors": "^2.8.5", 
  "express": "^5.1.0",
  "express-rate-limit": "^8.0.1",
  "helmet": "^8.1.0",
  "morgan": "^1.10.1",
  "mysql2": "^3.14.3",
  "pkg": "^5.8.1",
  "ws": "^8.18.3"
}
```

### Desktop App Dependencies
```json
{
  "better-sqlite3": "^12.2.0",
  "bindings": "^1.5.0",
  "express": "^5.1.0",
  "ws": "^8.18.3"
}
```

### Development Dependencies
```json
{
  "7zip-bin": "^5.2.0",
  "electron": "28.3.3",
  "electron-builder": "^24.13.3",
  "eslint": "^9.32.0",
  "rimraf": "^5.0.5"
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

### 2. Start Development
```bash
# Start desktop app (HTTP server on port 3000)
npm start

# In another terminal, check if port 3000 is free
netstat -ano | findstr :3000
```

### 3. Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle top right)
3. Click "Load unpacked"
4. Select folder: `S:\A.M.P\ext`
5. Verify extension appears with no errors

### 4. Test Connection
1. Open extension dropdown
2. Check terminal for: "HTTP server started successfully"
3. Look for: "Received ping request" in terminal
4. Desktop app should show "Connected" status

## 🔧 Troubleshooting

### Port 3000 Issues
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID_NUMBER> /F
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
4. **Test on AI Site**: Go to https://chat.openai.com and check console

### Desktop App Issues
1. **Refresh Renderer**: Ctrl+R in desktop app
2. **Restart App**: Kill process and restart with `npm start`
3. **Check Terminal**: Look for HTTP server messages
4. **Verify SQLite**: Check if database files are created

## 📡 HTTP Communication System

### Current Implementation
- **Protocol**: HTTP on localhost:3000
- **Method**: fetch() requests from extension to desktop
- **Endpoints**:
  - `POST /` - Store memory chunks
  - `GET /ping` - Health check
  - `GET /status` - Connection status
  - `POST /overflow` - Memory overflow handling

### Message Flow
```
Extension → fetch('http://127.0.0.1:3000/ping') → Desktop HTTP Server
Extension → fetch('http://127.0.0.1:3000/status') → Desktop Status
Extension → fetch('http://127.0.0.1:3000', {method: 'POST'}) → Store Data
```

### Code Examples
```javascript
// Extension sending ping
const response = await fetch('http://127.0.0.1:3000/ping');

// Extension sending data
const response = await fetch('http://127.0.0.1:3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(memoryChunk)
});
```

## 🛡️ Security & Privacy

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Rotation**: Every 10 minutes
- **Zero Plaintext**: No unencrypted data retention
- **Local Only**: All data stays on user's device

### Data Handling
- **No Server Calls**: All processing local
- **No Analytics**: No tracking or data collection
- **User Control**: Complete control over data
- **GDPR Compliant**: Right to deletion, data portability

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