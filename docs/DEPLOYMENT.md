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

#### 2. **Build Extension**

```bash
cd desktop-ui
npm install
npm run build
```

#### 3. **Install Native Host**

```bash
# Windows
copy com.ampiq.amp.native.json "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\"

# macOS
cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# Linux
cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/
```

#### 4. **Load Extension**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `ext/` folder

#### 5. **Start Desktop App**

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
  "name": "AMPiQ - Auto Memory Persistence",
  "version": "4.0.0",
  "description": "Infinite context memory for AI conversations",
  "permissions": [
    "storage",
    "activeTab", 
    "tabs",
    "scripting",
    "unlimitedStorage"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["utils.js", "content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon32.png",
      "32": "icon32.png", 
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "icons": {
    "16": "icon32.png",
    "32": "icon32.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

#### **Native Messaging Configuration**

**com.ampiq.amp.native.json**

```json
{
  "name": "com.ampiq.amp.native",
  "description": "AMPiQ Native Messaging Host",
  "path": "/absolute/path/to/amp-native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID_HERE"
  ]
}
```

**⚠️ Important**: Replace the path and extension ID with your actual values.

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

### **Server Configuration** (Optional)

#### **config.json** (server/config.json)

```json
{
  "server": {
    "port": 3456,
    "host": "0.0.0.0"
  },
  "rateLimit": {
    "maxRequests": 100
  },
  "license": {
    "customerId": "your-customer-id",
    "secret": "your-hmac-secret"
  },
  "vault": {
    "path": "./data/db",
    "hotSlots": 4,
    "maxSlots": 9,
    "chunkMaxSize": 2048
  },
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyLength": 256,
    "salt": "your-salt-here",
    "key": "your-encryption-key-here",
    "password": "your-password-here"
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

# Server Configuration (if using)
AMP_SERVER_PORT=3456
AMP_SERVER_HOST=0.0.0.0
```

#### **2. Security Configuration**

```bash
# Generate secure encryption keys
openssl rand -hex 32  # For encryption key
openssl rand -hex 16  # For salt
```

#### **3. Database Setup**

```bash
# Create storage directories
mkdir -p ~/.ampiq/storage/overflow
mkdir -p ~/.ampiq/storage/all-memory
mkdir -p ~/.ampiq/storage/database
```

### **Build Process**

#### **1. Extension Build**

```bash
cd client
# No build step needed - load unpacked in Chrome
```

#### **2. Desktop App Build**

```bash
cd desktop-ui
npm run build
```

#### **3. Native Host Setup**

```bash
# Make native host executable
chmod +x amp-native-host.js

# Install native messaging host
# Windows
copy com.ampiq.amp.native.json "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\"

# macOS  
cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# Linux
cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/
```

### **Installation Scripts**

#### **Windows Installation (install.bat)**

```batch
@echo off
echo Installing AMP System...

REM Create directories
mkdir "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts" 2>nul

REM Copy native messaging host
copy com.ampiq.amp.native.json "%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts\"

REM Build desktop app
cd desktop-ui
npm install
npm run build

echo Installation complete!
pause
```

#### **macOS/Linux Installation (install.sh)**

```bash
#!/bin/bash
echo "Installing AMP System..."

# Create directories
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts 2>/dev/null
mkdir -p ~/.config/google-chrome/NativeMessagingHosts 2>/dev/null

# Copy native messaging host
cp com.ampiq.amp.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/ 2>/dev/null
cp com.ampiq.amp.native.json ~/.config/google-chrome/NativeMessagingHosts/ 2>/dev/null

# Build desktop app
cd desktop-ui
npm install
npm run build

echo "Installation complete!"
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

# Generate HMAC secret
HMAC_SECRET=$(openssl rand -hex 32)
echo "HMAC Secret: $HMAC_SECRET"
```

#### **2. Update Configuration**

```json
{
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyLength": 256,
    "salt": "GENERATED_SALT_HERE",
    "key": "GENERATED_KEY_HERE",
    "password": "STRONG_PASSWORD_HERE"
  }
}
```

### **Access Control**

#### **1. User Authentication** (Optional)

```javascript
// Add to main.js for desktop app
const { session } = require('electron');

// Require authentication
session.defaultSession.on('will-navigate', (event, navigationUrl) => {
  if (!isAuthenticated()) {
    event.preventDefault();
    showLoginDialog();
  }
});
```

#### **2. Network Security**

```javascript
// Disable remote content
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
// Add to background.js
const LOG_LEVEL = 'INFO'; // DEBUG, INFO, WARN, ERROR

function log(level, message, data = {}) {
  if (LOG_LEVEL === 'DEBUG' || level === 'ERROR') {
    console.log(`[AMP ${level}] ${message}`, data);
  }
}
```

#### **2. Desktop App Logging**

```javascript
// Add to main.js
const log = require('electron-log');

log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1024; // 1MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
```

### **Health Monitoring**

#### **1. System Health Check**

```javascript
// Add health monitoring
setInterval(async () => {
  const health = await checkSystemHealth();
  if (!health.healthy) {
    log.error('System health check failed:', health);
    // Trigger recovery procedures
  }
}, 60000); // Check every minute
```

#### **2. Performance Monitoring**

```javascript
// Monitor memory usage
setInterval(() => {
  const stats = memoryPool.getStats();
  if (stats.hotMemorySize > 10 * 1024 * 1024) { // 10MB
    log.warn('High memory usage detected:', stats);
  }
}, 30000); // Check every 30 seconds
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Native Messaging Not Working**

```bash
# Check native host installation
ls ~/.config/google-chrome/NativeMessagingHosts/
cat ~/.config/google-chrome/NativeMessagingHosts/com.ampiq.amp.native.json

# Verify extension ID
chrome://extensions/ # Get extension ID
# Update com.ampiq.amp.native.json with correct ID
```

#### **2. Extension Not Loading**

```bash
# Check manifest.json syntax
cd client
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
# Check SQLite database
cd desktop-ui
sqlite3 ~/.config/AMP/memory.db ".tables"

# Reset database if corrupted
rm ~/.config/AMP/memory.db
# Restart desktop app
```

### **Debug Mode**

#### **1. Extension Debug**

```javascript
// Add to background.js
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('DEBUG: Received message:', message);
    // ... rest of handler
  });
}
```

#### **2. Desktop App Debug**

```bash
# Run with debug flags
cd desktop-ui
NODE_ENV=development DEBUG=* npm start
```

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Encryption keys generated and secured
- [ ] Native messaging host installed
- [ ] Extension loaded in Chrome
- [ ] Desktop app built and tested
- [ ] Database directories created
- [ ] Logging configured

### **Post-Deployment**
- [ ] Extension connects to native host
- [ ] Desktop app starts without errors
- [ ] Memory capture working
- [ ] Context injection working
- [ ] Search functionality working
- [ ] Error logging working
- [ ] Performance monitoring active

### **Security Verification**
- [ ] Encryption keys not in plaintext
- [ ] Native messaging secure
- [ ] No network transmission
- [ ] Local-only processing
- [ ] User data protected

## 🎯 Production Best Practices

### **1. Security**
- Use environment variables for sensitive data
- Rotate encryption keys regularly
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
- Database maintenance

---

**Deployment Summary**: Follow this guide for a secure, production-ready AMP system deployment with proper monitoring, logging, and maintenance procedures. 