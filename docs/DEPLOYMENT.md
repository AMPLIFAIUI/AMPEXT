# AMP System Deployment Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18+ 
- **Chrome Browser**: Version 100+
- **Windows/macOS/Linux**: All supported platforms

### Installation Steps

#### 1. **Clone and Setup**

```bash
git clone <repository-url>
cd A.M.P
npm install
```

#### 2. **Build Desktop App**

```bash
cd desktop-ui
npm install
npm run build
```

#### 3. **Register Native Messaging Host**

The native messaging host must be registered with Chrome to enable communication between the extension and the native host.

##### Windows

**Option A: Registry (Recommended)**
Create a registry key at:
```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native
```
Set the default value to the full path of `com.ampiq.amp.native.json`

**Option B: JSON File**
Copy `com.ampiq.amp.native.json` to:
```
%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\
```

##### macOS
```bash
cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

##### Linux
```bash
cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/
```

#### 4. **Configure Native Host Manifest**

Edit `com.ampiq.amp.native.json` to point to your installation:

```json
{
  "name": "com.ampiq.amp.native",
  "description": "AMP Native Messaging Host",
  "path": "C:\\path\\to\\desktop-ui\\amp-native-host.bat",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID_HERE/"
  ]
}
```

**⚠️ Important**: 
- Replace the `path` with the actual path to `amp-native-host.bat` (Windows) or `amp-native-host.js` (macOS/Linux)
- Replace `YOUR_EXTENSION_ID_HERE` with your extension's ID from `chrome://extensions/`
- On Windows, use the `.bat` wrapper; on macOS/Linux, use the `.js` file directly with `#!/usr/bin/env node`

#### 5. **Load Extension**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `ext/` folder
5. Note the Extension ID for the native host manifest

#### 6. **Start Desktop App (Optional)**

```bash
cd desktop-ui
npm start
```

## 🔧 Configuration

### **Extension Configuration**

#### **manifest.json** (ext/manifest.json)

```json
{
  "manifest_version": 3,
  "name": "AMP - Auto Memory Persistence",
  "version": "4.0.0",
  "description": "Infinite context memory system for AI conversations",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting",
    "unlimitedStorage",
    "windows",
    "nativeMessaging",
    "notifications"
  ],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://perplexity.ai/*",
    "https://poe.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<supported_ai_sites>"],
    "js": ["utils.js", "content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "dropdown.html",
    "default_title": "AMP Memory",
    "default_icon": "icon48.png"
  }
}
```

#### **Native Messaging Host Configuration**

**com.ampiq.amp.native.json** (Windows example)

```json
{
  "name": "com.ampiq.amp.native",
  "description": "AMP Native Messaging Host - Bridge to SQLite storage",
  "path": "C:\\Users\\YourUser\\AMP\\desktop-ui\\amp-native-host.bat",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://your-extension-id-here/"
  ]
}
```

**com.ampiq.amp.native.json** (macOS/Linux example)

```json
{
  "name": "com.ampiq.amp.native",
  "description": "AMP Native Messaging Host - Bridge to SQLite storage",
  "path": "/home/user/AMP/desktop-ui/amp-native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://your-extension-id-here/"
  ]
}
```

**⚠️ Important**: The `path` must be an absolute path to the native host executable.

### **Desktop App Configuration**

#### **package.json** (desktop-ui/package.json)

```json
{
  "name": "ampiq-desktop",
  "version": "4.0.0",
  "description": "AMPiQ Desktop Application",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "dev": "NODE_ENV=development electron ."
  },
  "build": {
    "appId": "com.ampiq.desktop",
    "productName": "AMPiQ Desktop",
    "directories": {
      "output": "build"
    },
    "files": [
      "**/*",
      "!node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon256.png"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon256.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon256.png"
    }
  }
}
```

## 🏗️ Production Deployment

### **Environment Setup**

#### **1. Environment Variables**
Create `.env` file in root directory:

```bash
# AMP Configuration
AMP_ENVIRONMENT=production
AMP_ENCRYPTION_KEY=your-256-bit-encryption-key
AMP_SALT=your-salt-value
AMP_CUSTOMER_ID=your-customer-id

# Database Configuration
AMP_DB_PATH=/path/to/database
AMP_STORAGE_PATH=/path/to/storage
```

#### **2. Security Configuration**

```bash
# Generate secure encryption keys
openssl rand -hex 32  # For encryption key
openssl rand -hex 16  # For salt
```

#### **3. Database Setup**

The SQLite database is automatically created at:
- **Windows**: `%USERPROFILE%\.ampiq\AMP\memory.db`
- **macOS/Linux**: `~/.ampiq/AMP/memory.db`

### **Build Process**

#### **1. Extension Build**

```bash
cd ext
# No build step needed - load unpacked in Chrome
# For production, create a .crx or submit to Chrome Web Store
```

#### **2. Desktop App Build**

```bash
cd desktop-ui
npm run build
```

#### **3. Native Host Setup**

##### Windows
```batch
@echo off
REM amp-native-host.bat - Windows wrapper for native host
node "%~dp0amp-native-host.js"
```

##### macOS/Linux
```bash
#!/usr/bin/env node
# amp-native-host.js should have this shebang and be executable
chmod +x amp-native-host.js
```

### **Installation Scripts**

#### **Windows Installation (install.bat)**

```batch
@echo off
echo Installing AMP System...

REM Create directories
mkdir "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts" 2>nul

REM Copy native messaging host manifest
copy com.ampiq.amp.native.json "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\"

REM Update manifest with correct path
powershell -Command "(Get-Content '%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.ampiq.amp.native.json') -replace 'PATH_TO_HOST', '%CD%\desktop-ui\amp-native-host.bat' | Set-Content '%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.ampiq.amp.native.json'"

REM Build desktop app
cd desktop-ui
npm install
npm run build

echo Installation complete!
echo.
echo IMPORTANT: Update the extension ID in the native host manifest!
pause
```

#### **macOS/Linux Installation (install.sh)**

```bash
#!/bin/bash
echo "Installing AMP System..."

# Create directories
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts 2>/dev/null
mkdir -p ~/.config/google-chrome/NativeMessagingHosts 2>/dev/null

# Make native host executable
chmod +x desktop-ui/amp-native-host.js

# Copy native messaging host manifest (detect OS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
  # Update path in manifest
  sed -i '' "s|PATH_TO_HOST|$(pwd)/desktop-ui/amp-native-host.js|g" ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.ampiq.amp.native.json
else
  cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/
  # Update path in manifest
  sed -i "s|PATH_TO_HOST|$(pwd)/desktop-ui/amp-native-host.js|g" ~/.config/google-chrome/NativeMessagingHosts/com.ampiq.amp.native.json
fi

# Build desktop app
cd desktop-ui
npm install
npm run build

echo "Installation complete!"
echo ""
echo "IMPORTANT: Update the extension ID in the native host manifest!"
```

## 🔒 Security Deployment

### **Encryption Setup**

#### **1. Generate Secure Keys**

```bash
# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "Encryption Key: $ENCRYPTION_KEY"

# Generate salt
SALT=$(openssl rand -hex 16)
echo "Salt: $SALT"
```

#### **2. Key Storage**

Keys are generated per-session in the extension and rotated every 10 minutes for maximum security. No persistent key storage is required.

### **Access Control**

#### **1. Native Messaging Security**

Native messaging is inherently secure:
- Only the specified extension ID can connect
- Communication is local (stdin/stdout)
- No network exposure

#### **2. Network Security**

```javascript
// Desktop app security settings
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  webSecurity: true,
  allowRunningInsecureContent: false
}
```

## 📊 Monitoring & Logging

### **Logging Configuration**

#### **1. Extension Logging**

```javascript
// Set AMP_DEBUG to true for verbose logging
const AMP_DEBUG = false; // Set to true for debugging

const log = (...args) => AMP_DEBUG && console.log('[AMP]', ...args);
const logError = (...args) => console.error('[AMP]', ...args);
```

#### **2. Native Host Logging**

```javascript
// Native host logs to stderr (doesn't interfere with native messaging)
const log = (...args) => AMP_DEBUG && console.error('[AMP Host]', ...args);
```

#### **3. Desktop App Logging**

```javascript
// Electron main process logging
const log = (...args) => AMP_DEBUG && console.log('[AMP Main]', ...args);
```

### **Health Monitoring**

#### **1. System Health Check**

The extension performs periodic health checks:
- Native messaging connection status
- Memory pool integrity
- Storage state validation

```javascript
// Health check interval (60 seconds)
setInterval(async () => {
  if (activeMemoryPool && activeMemoryPool.getSystemHealth) {
    const health = activeMemoryPool.getSystemHealth();
    if (health.errorCount > 10) {
      await activeMemoryPool.attemptRecovery();
    }
  }
}, 60000);
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Native Messaging Not Working**

```bash
# Check native host registration (Windows)
reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"

# Check manifest file exists
ls ~/.config/google-chrome/NativeMessagingHosts/com.ampiq.amp.native.json

# Verify manifest contents
cat ~/.config/google-chrome/NativeMessagingHosts/com.ampiq.amp.native.json

# Check extension ID matches
# Go to chrome://extensions/ and verify the ID
```

#### **2. Extension Not Loading**

```bash
# Check manifest.json syntax
cd ext
node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json')))"

# Check for missing files
ls -la ext/
```

#### **3. Desktop App Not Starting**

```bash
# Check dependencies
cd desktop-ui
npm install

# Check Electron version
npm list electron

# Run with debug logging
DEBUG=* npm start
```

#### **4. Database Issues**

```bash
# Check SQLite database location
ls ~/.ampiq/AMP/memory.db

# Query database
sqlite3 ~/.ampiq/AMP/memory.db ".tables"
sqlite3 ~/.ampiq/AMP/memory.db "SELECT COUNT(*) FROM memory_chunks"

# Reset database if corrupted
rm ~/.ampiq/AMP/memory.db
# Restart native host/desktop app to recreate
```

### **Debug Mode**

#### **1. Extension Debug**

```javascript
// In background.js, set:
const AMP_DEBUG = true;

// Then check Service Worker console:
// chrome://extensions/ → AMP → "Service Worker" → Inspect
```

#### **2. Native Host Debug**

```bash
# Run native host manually to see output
cd desktop-ui
node amp-native-host.js

# Send test message (requires proper native messaging format)
```

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Native messaging host registered
- [ ] Extension ID updated in native host manifest
- [ ] Extension loaded in Chrome
- [ ] Desktop app built (if using)
- [ ] Database directory writable
- [ ] Logging configured appropriately

### **Post-Deployment**
- [ ] Extension shows rainbow ring animation
- [ ] Native messaging connection successful (green ring)
- [ ] Memory capture working on AI sites
- [ ] Context injection working
- [ ] Search functionality working
- [ ] Stats display shows real data
- [ ] Data persists across browser restarts

### **Security Verification**
- [ ] Native messaging manifest has correct extension ID
- [ ] No sensitive data in logs
- [ ] Database file permissions correct
- [ ] No network transmission of data

## 🎯 Production Best Practices

### **1. Security**
- Keep extension ID private
- Rotate encryption keys (automatic)
- Monitor for security events
- Keep dependencies updated

### **2. Performance**
- Monitor memory usage
- Optimize database queries
- Use appropriate logging levels
- Implement health checks

### **3. Reliability**
- Implement automatic recovery
- Use proper error handling
- Monitor system health
- Maintain backup procedures

### **4. Maintenance**
- Regular security updates
- Performance monitoring
- Log rotation and cleanup
- Database maintenance (VACUUM)

---

**Deployment Summary**: Follow this guide for a secure, production-ready AMP system deployment with Native Messaging communication, SQLite storage, and proper monitoring.
