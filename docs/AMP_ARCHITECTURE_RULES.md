# AMP Architecture Rules & Development Guidelines

## 🏗️ **Core Architecture (ALWAYS FOLLOW)**

### **Core Philosophy: Index Until Needed**
```
🌊 Continuous Indexing:  Capture & index all text flow automatically
📊 Smart Storage:        Store everything in accessible layers (DOM → Buffers → Desktop)
🎯 Retrieve on Demand:   Pull relevant context when user needs it
⚡ Instant Access:       9-slot DOM for 0ms retrieval of recent content
🔄 Waterfall System:     Old content cascades down storage layers naturally
```

### **Memory Hierarchy (Waterfall System)**
```
1. DOM Layer (9 slots)     → 0ms instant access
2. 5x1MB Buffer System     → Background script hot memory  
3. Desktop SQLite Storage  → Native messaging overflow
4. Archive/Cold Storage    → Long-term persistence
```

### **File Responsibilities**
- **`ext/content.js`** - S1-S9 progression, dual zipper capture, context injection
- **`ext/background.js`** - Dual zipper system, native messaging, desktop integration
- **`ext/utils.js`** - MemoryPool class, dual zipper logic, S1-S9 management
- **`desktop-ui/`** - Desktop app with SQLite storage, live text viewer, injection GUI
- **`amp-native-host.js`** - Bridge between Chrome extension and desktop app

## ⚡ **Buffer System Rules**

### **5x1MB Buffer Configuration**
```javascript
const BUFFER_SIZE_MB = 1;           // 1MB per buffer
const NUM_BUFFERS = 5;              // 5 buffers total
const BUFFER_SIZE_BYTES = 1048576;  // 1MB in bytes
const OVERFLOW_THRESHOLD = 0.8;     // 80% triggers GUI overflow
const LARGE_TEXT_THRESHOLD = 1000;  // Characters that trigger buffer system
```

### **Buffer Overflow Logic**
1. **Text >1000 chars** → Activate buffer system
2. **Buffer 80% full** → Auto-overflow to GUI via native messaging
3. **All buffers full** → Emergency overflow to desktop SQLite
4. **Background script** handles all buffer management
5. **Content script** only triggers, never manages buffers directly

## 🌊 **Waterfall Cascade Rules**

### **Slot Management**
- **Slots 1-9**: DOM instant access layer
- **Slot 5 overflow**: Triggers desktop app storage
- **Slot 9**: Archive slot for permanent storage
- **Hot Buffer**: Temporary holding before desktop overflow
- **DOM Mirror**: 1MB crash safety backup

### **Flow Direction**
```
User Input/AI Output → Content Scanner → DOM Slots 1-9 → Hot Buffer → 5x1MB Buffers → Desktop SQLite
```

## 📡 **Native Messaging Protocol**

### **Message Types**
- `overflow` - Single chunk overflow from slot 5
- `sendAllMemory` - Bulk transfer to desktop GUI
- `get_memory_data` - Request stored conversations
- `inject_memory` - Inject content back to AI page
- `status` - Health check and storage stats

### **Data Flow**
1. **Content Script** captures text → sends to Background
2. **Background Script** manages buffers → overflows to Native Host
3. **Native Host** bridges to Desktop App
4. **Desktop App** stores in SQLite → displays in GUI

## 🔄 **Vertical Flow Capture System**

### **Input Capture**
- Monitor all text inputs (textareas, contenteditable)
- Detect paste events for large text
- Handle composition events (IME, autocomplete)
- Adaptive timing based on text size

### **Output Capture**
- Watch for new AI response elements
- Use MutationObserver for real-time detection
- Capture streaming responses without timeouts
- Handle large AI outputs with keep-alive mode

### **Scanner Backup**
- Continuous vertical page scanning
- Only scan when page height increases
- Adaptive intervals based on activity
- Emergency capture for missed content

## 🎯 **Performance Rules**

### **Memory Limits**
- **DOM Layer**: 9 slots max (instant access)
- **Hot Memory**: 5MB max (5x1MB buffers)
- **DOM Mirror**: 1MB max (crash safety)
- **Desktop Storage**: Unlimited (SQLite)

### **Timing Thresholds**
- **Normal Scan**: 2000ms intervals
- **Active Mode**: 500ms intervals
- **Large Text**: Keep-alive mode with extended windows
- **Idle Mode**: 3000ms intervals (power saving)

## 🔒 **Security & Privacy Rules**

### **Encryption Requirements**
- **DOM Data**: Encrypted with rotating session keys
- **Storage Data**: Military-grade encryption for sensitive content
- **Native Messaging**: Secure bridge with validation
- **User Control**: Frost viewer for privacy protection

### **Data Handling**
- **Plaintext in DOM**: Only for visible content (already on screen)
- **Encrypted Storage**: All persistent data must be encrypted
- **Session Keys**: Rotate every 10 minutes
- **Local Only**: No external servers, all data stays local

## 🚨 **Critical Development Rules**

### **NEVER Break These:**
1. **Always use existing MemoryPool** from `ext/utils.js`
2. **Never duplicate buffer systems** - use the established 5x1MB system
3. **Content script triggers only** - background script manages buffers
4. **Follow waterfall cascade** - DOM → Buffers → Desktop → Archive
5. **Maintain 9-slot DOM limit** - excess goes to hot buffer
6. **Use semantic search** to verify architecture compliance

### **Always Check:**
- Does this follow the 5x1MB buffer system?
- Am I using the existing MemoryPool class correctly?
- Is the waterfall cascade logic preserved?
- Are we maintaining the DOM 9-slot limit?
- Is native messaging used for desktop communication?

## 🛠️ **Integration Points**

### **Extension to Desktop**
- Background script → Native Host → Desktop SQLite
- Automatic overflow when buffers fill
- Bidirectional data flow for injection

### **Cross-Tab Memory Sharing**
- Background script broadcasts to all AI tabs
- Provider-specific memory sharing
- Real-time synchronization across sessions

### **GUI Integration**
- Live text viewer with real-time updates
- Select and inject functionality
- Provider filtering and search capabilities

## 📑 **Index-Until-Needed Strategy**

### **Automatic Indexing**
- **Capture Everything**: Index all user input and AI output as it flows
- **No Manual Saves**: System automatically captures and stores all conversation data
- **Real-time Indexing**: Text is indexed the moment it appears on screen
- **Background Processing**: Indexing happens without user intervention

### **Smart Retrieval**
- **On-Demand Access**: Content retrieved only when user needs it (search, inject, review)
- **Context-Aware**: System knows what content is relevant for current conversation
- **Instant Recent**: Last 9 interactions available in 0ms from DOM slots
- **Historical Search**: Full conversation history searchable from desktop storage

### **Layered Storage for Retrieval Speed**
```
Immediate Need (0ms):     DOM Slots 1-9 (last 9 interactions)
Recent Need (1ms):        5x1MB Hot Buffers (recent session data)  
Historical Need (10ms):   Desktop SQLite (full conversation history)
Archive Need (100ms):    Cold storage (summarized old conversations)
```

### **Index Categories**
- **Provider Index**: Conversations grouped by AI provider (ChatGPT, Claude, etc.)
- **Topic Index**: Content categorized by conversation topic/subject
- **Time Index**: Chronological access to conversation timeline
- **Content Index**: Full-text search across all captured conversations
- **Context Index**: Related conversations for cross-reference injection

---

**📝 NOTE**: Always reference this file before making architectural changes. Use semantic search to verify compliance with existing codebase patterns.
