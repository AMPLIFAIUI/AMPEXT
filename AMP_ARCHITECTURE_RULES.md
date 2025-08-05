# AMP Architecture Rules

## Core Architecture
- **Memory Hierarchy**: DOM → Buffers → Desktop SQLite
- **Communication**: Extension → Desktop App (HTTP on localhost:3000)
- **Data Flow**: Extension captures → Desktop stores → Both display stats

## STRICT RULES FOR ASSISTANT

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

### 4. SQLITE RULES
- **ALWAYS rebuild** better-sqlite3 when version mismatch
- **USE desktop-ui directory** for rebuilds
- **IGNORE SQLite errors** if HTTP server starts successfully

### 5. PORT CONFLICT RULES
- **ALWAYS check** if port 3000 is in use
- **KILL process** before starting dev version
- **VERIFY port is free** before npm start

### 6. CONNECTION TESTING RULES
- **OPEN extension dropdown** to trigger connection
- **CHECK terminal** for connection messages
- **VERIFY desktop app** shows "Connected"
- **TEST stats display** in extension

### 7. DEBUG LOGGING RULES
- **LOOK for 🔧 messages** in terminal
- **IGNORE spam** - focus on actual errors
- **TRACE the flow** from extension to desktop

### 8. DEVELOPMENT WORKFLOW
- **USE dev version** (npm start) for testing
- **RELOAD extension** after code changes
- **REFRESH desktop app** (Ctrl+R) after renderer changes
- **KILL old processes** before starting new ones

### 9. ERROR PRIORITY
1. **Port conflicts** (EADDRINUSE)
2. **SQLite version mismatch** (ERR_DLOPEN_FAILED)
3. **Connection issues** (no HTTP messages)
4. **UI display issues** (stats not showing)

### 10. SUCCESS CRITERIA
- **Terminal shows**: "HTTP server started successfully"
- **Extension connects**: "Received ping request"
- **Desktop shows**: "Connected" status
- **Stats display**: Numbers in extension dropdown

## Current Status
- ✅ HTTP server running on port 3000
- ✅ Extension sending ping requests
- ✅ Desktop receiving and responding
- ✅ Connection status updating
- 🔄 Need to test stats display

## Next Steps
1. **Test extension dropdown** - check if stats show
2. **Verify desktop app UI** - should show "Connected"
3. **Check if infinite loop is fixed** - no more spam