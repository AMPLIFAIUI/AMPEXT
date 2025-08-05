AMP Middleware: Infinite Context Engine
AMP is a revolutionary browser extension that implements real-time memory persistence and context management through a sophisticated dual zipper memory architecture with comprehensive fork system for data routing and processing. This production system maintains enterprise-grade security and performance standards while providing robust error handling and recovery mechanisms.

🎯 Core Features
🔗 Dual Zipper Architecture: Fat zipper (full S1-S9 blocks) + Thin zipper (compressed S9 tags)
🔀 Fork System: Intelligent data routing through specialized processing paths
💾 5MB Hot Memory Pool: Optimized memory capacity for Chrome extension compliance
❄️ Cold Storage: Automatic archiving to Chrome storage for unlimited conversation history
⚡ Immediate Persistence: All data saved to Chrome storage instantly for crash safety
🛡️ Robust Error Handling: Comprehensive recovery mechanisms for production reliability
🔄 Cross-Session Survival: Data persists across browser restarts
🧠 Intelligent Memory Management: 5 slots of 1MB each with temperature-based prioritization
📊 Health Monitoring: Real-time system health checks and performance metrics
🔐 AES-256 Encryption: Military-grade encryption with zero plaintext retention
🌐 Cross-Tab Communication: Real-time data sharing across browser tabs
🎛️ Provider Optimization: AI provider-specific handling (ChatGPT, Claude, Gemini)
⚡ Priority Processing: Intelligent priority-based routing and processing
🗜️ Adaptive Compression: Content-aware compression strategies
💉 Context Injection: Smart context injection for AI conversations
🏗️ Architecture
Dual Zipper Memory System
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  AMP MEMORY CIRCUIT (AC2II)                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
                     
                             ┌────────────────────────────┐
                             │         PAGE DOM           │
                             │    (Scroll Surface Layer)  │
                             └────────────────────────────┘
                                        ▲
                                        │
                      ╔═══════════════╧═══════════════╗
                      ║                               ║
                      ║      AMP CONTEXT ENGINE       ║
                      ║      (Above or Below DOM)     ║
                      ╚═══════════════╤═══════════════╝
                                      │
    ┌────────────────────┐            ▼            ┌────────────────────┐
    │   FAT ZIPPER PATH  │                         │  THIN ZIPPER PATH  │
    │  (Full S1–S9 Data) │                         │  (Compressed S9s)  │
    └────────────────────┘                         └────────────────────┘
             ▲                                           ▲
             │                                           │
    [Cold Store: blk057.chk019]         [Index: blk057.chk019.sq9.tag]
             │                                           │
             ▼                                           ▼
     ┌───────────────────────┐               ┌────────────────────────┐
     │ FULL BLOCK RETRIEVAL  │◄──────────────│    FAST INDEX MATCH    │
     └───────────────────────┘               └────────────────────────┘
Fork System Data Flow
📥 INCOMING → ⚙️ PROCESSING → 💾 DUAL ZIPPER → 📤 OUTGOING
   Content     Provider        Fat Zipper      Context
   Search      Priority        Thin Zipper     Cross Tab
   Storage     Compression                     Backup
Hot Memory Pool
┌─────────────────────────────────────────────────────────────┐
│                     5MB Hot Memory Pool                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐        │
│  │ Slot 1  │ Slot 2  │ Slot 3  │ Slot 4  │ Slot 5  │        │
│  │ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │        │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘        │
│  ↑                                                          │
│  Automatic Archiving to Cold Storage when full              │
└─────────────────────────────────────────────────────────────┘
🔧 How It Works
1. Content Ingestion
Raw Text → S1 (Raw Capture) → S2-S8 (Edits) → S9 (Canonical Summary)
2. Dual Storage
S9 Content → Thin Zipper (Fast Search)
Full Block → Fat Zipper (Complete Data)
3. Search Process
Query → Thin Zipper Search → Find S9 Tags → Retrieve Full Blocks from Fat Zipper
4. Memory Cascade
Hot Pool → Fat Zipper → Cold Store (Encrypted Archive)
🚀 Getting Started
Installation
Clone the repository
Load the extension in Chrome/Edge
Navigate to any AI conversation page
AMP will automatically start capturing and managing context
User Interface
Popup Interface
Modern UI: Clean, responsive design with real-time status indicators
Live Activity Feed: Resizable feed showing system activity and memory operations
Memory Statistics: Real-time display of memory usage, message rates, and growth
Memory Layers: Visual representation of DOM, Hot Buffer, and Archive layers
Quick Actions: One-click operations for common tasks
Open Window Button: Opens a standalone window for persistent monitoring
Standalone Window
Persistent View: Full-featured window that stays open independently
Same UI: Identical interface to popup with all functionality
Context-Aware: Adapts behavior based on popup vs standalone context
Resizable: Can be resized and positioned anywhere on screen
No Popup Limitations: Full browser window capabilities
Testing
Open ext/dual-zipper-test.html to test the complete system:

Add content to the dual zipper system
Search through compressed S9 tags
View real-time fork statistics
Monitor system performance
📊 System Statistics
Memory Usage
{
  fatZipperBlocks: 50,       // Full S1-S9 blocks
  thinZipperTags: 50,        // Compressed S9 tags
  hotPoolBlocks: 25,         // Active blocks in 5MB RAM
  coldStoreBlocks: 125,      // Archived blocks in Chrome storage
  totalMemoryUsage: "5.00 MB"
}
Fork Performance
{
  crossTabMessages: 45,      // Cross-tab messages sent
  providerRoutes: 89,        // Provider-specific routes
  priorityRoutes: 67,        // Priority-based routes
  backupRoutes: 23,          // Backup operations
  realtimeSyncs: 156,        // Real-time syncs
  errorRecoveries: 2,        // Error recovery attempts
  contextInjections: 34,     // Context injections
  compressions: 78,          // Compression operations
  storageOperations: 234     // Storage operations
}
🔗 Fork System Components
Incoming Forks
Content Fork: Process incoming content data
Search Fork: Handle search requests
Storage Fork: Manage storage operations
Processing Forks
Provider Fork: AI provider-specific handling
Priority Fork: Priority-based routing
Compression Fork: Adaptive compression
Outgoing Forks
Context Fork: Handle context injection
Cross Tab Fork: Multi-tab communication
Backup Fork: Create redundant backups
Emergency Forks
Error Recovery Fork: Handle system errors
Realtime Fork: Real-time synchronization
🎯 Use Cases
Real-time Context Injection
User types query → Thin zipper search → Find relevant S9 tags → 
Retrieve full blocks → Inject context into AI conversation
Cross-Provider Context
Search across all providers → Find relevant S9 tags → 
Retrieve full blocks → Inject context into new provider
Memory Cascade
Old conversations → Move to cold store → Keep S9 tags in thin zipper → 
Fast search still possible → Retrieve from cold store when needed
Crash Recovery
System restart → Load thin zipper (fast) → Load fat zipper (encrypted) → 
Restore hot pool → Resume operations
🔐 Security Features
AES-256 Encryption: Military-grade encryption for all sensitive data
On-Capture Encryption: Data encrypted as soon as it leaves the page
No Plaintext Retention: Zero plaintext data stored anywhere
On-Demand Decryption: Data only decrypted when explicitly needed
Key Rotation: Automatic encryption key rotation
📈 Performance Characteristics
Search Performance
Thin Zipper Search: O(n) but optimized with keywords/entities
Fat Zipper Retrieval: O(1) direct block access
Combined Performance: Fast thin zipper lookup → targeted fat zipper retrieval
Memory Usage
Fat Zipper: ~1KB per block (full S1-S9 data)
Thin Zipper: ~256 bytes per tag (compressed S9)
Hot Pool: 5MB total capacity (5×1MB slots)
Fork System: ~50KB total overhead
🛠️ Development
Architecture Documents
AMP System Overview - Comprehensive technical report
Dual Zipper Architecture - Detailed dual zipper system
Fork System Architecture - Complete fork system documentation
Key Components
ext/utils.js - Dual zipper system with fork implementation
ext/dual-zipper-test.html - Interactive test interface
client/content.js - Content extraction and processing
server/ - Server-side components
🎉 Benefits
For Users
Infinite Context: Never lose conversation context
Cross-Provider Memory: Share context between AI providers
Real-time Sync: Instant context availability
Privacy: All data stays local, no server calls
For Developers
Modular Architecture: Easy to extend and modify
Comprehensive Testing: Full test suite and interfaces
Production Ready: Enterprise-grade reliability
Well Documented: Complete technical documentation
🔮 Future Enhancements
Vector Embeddings: Advanced semantic search capabilities
Machine Learning: Intelligent context selection
Cloud Sync: Optional cloud backup and sync
API Integration: Direct integration with AI provider APIs
Advanced Analytics: Detailed usage analytics and insights
