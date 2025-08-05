# 🔍 AMP Data Flow Debug Guide

## Current Status: Data Not Appearing in UI

Based on the codebase review, here's a systematic debugging approach:

## ✅ Components Working
- ✅ Desktop app is running (periodic status checks visible)
- ✅ SQLite storage system is ready
- ✅ Native messaging bridge is functional
- ✅ Extension files are present and valid

## ❌ Problem Areas
- ❌ Chrome extension not capturing conversation data
- ❌ No data flowing from websites to storage
- ❌ Content scripts may not be loading/working

## 🔧 Debugging Steps

### Step 1: Verify Extension Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle top right)
3. Click "Load unpacked"
4. Select folder: `S:\A.M.P\ext`
5. Verify extension appears with no errors

### Step 2: Test Extension on AI Sites
1. Go to https://chat.openai.com (or another AI site)
2. Open DevTools (F12) → Console tab
3. Look for these startup messages:
   ```
   🚀 AMP Content Script: Starting up...
   📍 AMP URL: https://chat.openai.com/...
   🔧 AMP Utils check:
   ✅ AMP Content Script: Initialization complete
   ```

### Step 3: Test Data Capture
1. Start a conversation on the AI site
2. Check console for these messages:
   ```
   📝 AMP: New content detected, processing...
   🔄 AMP: Processing new content...
   📊 AMP: Found X conversation chunks
   💾 AMP: Adding chunk...
   📡 AMP: Sending X chunks to background script
   ```

### Step 4: Test with Local Test Page
1. Open `S:\A.M.P\test-page.html` in Chrome
2. The page will auto-test extension functionality
3. Use buttons to add test messages
4. Check if extension processes them

### Step 5: Check Background Script
1. Go to `chrome://extensions/`
2. Find AMP extension
3. Click "Service worker" or "background page" link
4. Check console for:
   ```
   🚀 AMP Background: Starting memory pool initialization...
   📦 AMP Background: Batch store memory request received
   ```

## 🚨 Common Issues & Fixes

### Issue 1: Content Script Not Loading
**Symptoms:** No startup messages in console
**Fix:** 
- Check manifest.json content_scripts configuration
- Verify utils.js loads before content.js
- Check for JavaScript errors preventing execution

### Issue 2: Provider Not Detected
**Symptoms:** Provider shows as 'unknown'
**Fix:**
- Update `getAIProviderFromUrl()` in background.js
- Add new URL patterns for current AI sites

### Issue 3: DOM Selectors Not Working
**Symptoms:** "Found 0 conversation chunks"
**Fix:**
- Update selectors in `extractConversationTurns()`
- Inspect AI site HTML structure for current selectors

### Issue 4: Memory Pool Not Available
**Symptoms:** "memoryPool not available" error
**Fix:**
- Check utils.js loads properly
- Verify window.memoryPool is exposed
- Check for module loading errors

## 🔬 Advanced Debugging

### Enable Verbose Logging
Add this to any file for more debugging:
```javascript
console.log('🔍 DEBUG:', variableName, data);
```

### Check Native Messaging
1. Open desktop app DevTools (Ctrl+Shift+I)
2. Look for native messaging logs
3. Check for SQLite database creation

### Test SQLite Database
Run this in terminal:
```bash
cd "s:\A.M.P"
node -e "
const path = require('path');
const userDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const dbPath = path.join(userDataPath, 'AMP', 'memory.db');
console.log('DB Path:', dbPath);
console.log('DB Exists:', require('fs').existsSync(dbPath));
"
```

## 🎯 Next Actions

### Immediate (Fix Core Issues)
1. **Load extension in Chrome** and verify console messages
2. **Test on ChatGPT** - go to https://chat.openai.com
3. **Check debug output** in DevTools console
4. **Fix any JavaScript errors** that prevent loading

### Short Term (Improve Data Flow)
1. **Update selectors** for current AI site layouts
2. **Add error handling** for failed message captures
3. **Test cross-tab functionality** with multiple AI tabs

### Long Term (Enhance Features)
1. **Add provider support** for new AI sites
2. **Improve message detection** accuracy
3. **Optimize performance** for large conversations

## 📞 Quick Health Check

Run this in browser console on any AI site:
```javascript
// Quick AMP health check
console.log('AMP Health Check:');
console.log('memoryPool:', typeof window.memoryPool);
console.log('getAIProvider:', typeof window.getAIProvider);
if (typeof window.getAIProvider === 'function') {
  console.log('Current provider:', window.getAIProvider());
}
```

## 🆘 Emergency Reset

If everything breaks:
1. Remove extension from Chrome
2. Restart Chrome browser
3. Re-load extension from `S:\A.M.P\client`
4. Clear browser cache and cookies
5. Test with fresh AI site session
