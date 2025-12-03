# Reload Extension and Fix Native Messaging

## Quick Fix Steps:

### 1. Clear Browser Cache
1. Open Chrome
2. Press `Ctrl+Shift+Delete`
3. Select "All time" for time range
4. Check "Cached images and files"
5. Click "Clear data"

### 2. Reload Extension
1. Go to `chrome://extensions/`
2. Find "AMP - Auto Memory Persistence"
3. Click the refresh/reload button (🔄)
4. Or toggle the extension off and on

### 3. Test Native Messaging
1. Open browser console (F12)
2. Look for any native messaging errors
3. The extension should now work without errors

### 4. If Native Messaging Still Fails
Run these commands in the terminal:
```bash
node install-native-messaging.js
node test-native-messaging.js
```

### 5. Restart Chrome
If issues persist, restart Chrome completely.

## What Was Fixed:
- ✅ Added timeout to native messaging calls
- ✅ Better error handling for native messaging failures
- ✅ Delayed native messaging connection test
- ✅ Cache-busting version updates
- ✅ Null reference error handling

## Expected Behavior:
- Extension loads without syntax errors
- Native messaging connects automatically
- Stats update properly
- No console errors 