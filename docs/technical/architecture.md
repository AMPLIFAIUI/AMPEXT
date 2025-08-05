# AMP System Architecture

## Executive Summary

The AMP system is a revolutionary browser extension that implements real-time memory persistence and context management through a sophisticated **dual zipper memory architecture** with comprehensive **fork system** for data routing and processing. This production system maintains enterprise-grade security and performance standards while providing robust error handling and recovery mechanisms.

**Key Features:**
- **Independent Operation**: Data collection continues seamlessly even when desktop app is offline
- **No Data Loss**: All data immediately persisted to Chrome storage regardless of desktop status
- **Automatic Recovery**: Overflow data queued and automatically sent when desktop comes online
- **Crash Safety**: Immediate persistence ensures no data loss even if extension crashes
- **Retry Logic**: Robust retry mechanisms handle temporary connectivity issues

## Core Architecture: 5x1MB Hot Memory Pool System

### Pool Structure
```text
┌─────────────────────────────────────────────────────────────┐
│                    5x1MB Hot Memory Pool                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐        │
│  │ Slot 1  │ Slot 2  │ Slot 3  │ Slot 4  │ Slot 5  │        │
│  │ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │        │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘        │
│  ↑                                                          │
│  Immediate Persistence to Chrome Storage                    │
│  ↓                                                          │
│  Overflow to Desktop App Local Storage                      │
└─────────────────────────────────────────────────────────────┘
```

**Why This Design:**
- **Slot 1-5**: Each slot manages 1MB of active memory for optimal performance
- **Cascading Flow**: Data flows from Slot 1 → Slot 2 → Slot 3 → Slot 4 → Slot 5
- **Desktop Overflow**: When all slots are full, data overflows to desktop app local storage
- **Immediate Persistence**: All data saved to chrome.storage.local instantly
- **Temperature-Based Management**: Hot slots prioritize recent, active content

### Enhanced Memory Management

The system maintains a dynamic 5x1MB hot memory pool with cascading overflow, providing:
- **Expanded Capacity**: 5MB total pool with unlimited desktop overflow
- **Instant Persistence**: Data saved to Chrome storage on every write operation
- **Cross-Session Survival**: Data persists across browser restarts
- **Automatic Recovery**: Self-healing mechanisms for storage failures
- **Health Monitoring**: Real-time system health checks
- **Desktop Integration**: Seamless overflow to desktop app local storage

## Dual Zipper Memory Architecture

### Overview

The AMP system implements a revolutionary **dual zipper memory architecture** that separates data storage into two complementary systems:

- **FAT ZIPPER (Hot Side)**: Contains full S1-S9 blocks with complete data, harder to search
- **THIN ZIPPER (Cold Side)**: Contains compressed S9 tags for fast lookup and retrieval

### Architecture Diagram

```text
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
             │
             ▼
   ┌────────────────────────────┐
   │  AMP DOM SCROLLING GRID   │
   │     (9-Square Blocks)     │
   └────────────────────────────┘
             ▲
             │ Capture or Restore
             ▼
     ┌────────────┐
     │  SQUARE 1  │  ← Raw Text Capture
     ├────────────┤
     │  SQUARE 2  │  ← First Change / Edit
     ├────────────┤
     │  SQUARE 3  │
     ├────────────┤
     │     ...    │
     ├────────────┤
     │  SQUARE 8  │
     ├────────────┤
     │  SQUARE 9  │  ← Canonical / Final Summary
     └────────────┘
             │
             ▼
     ┌───────────────────────┐
     │ ENCRYPT + TAG (S9)    │
     └───────────────────────┘
             │
             ▼
     ┌───────────────────────┐
     │ AMP EXTENSION HOT POOL│
     └───────────────────────┘
             │
             ▼
     ┌───────────────────────┐
     │ BUFFERED → COLD STORE │
     └───────────────────────┘
```

### Addressing System

The system uses a hierarchical addressing format: `blk057-chk019-sq9`

- **blk057**: Block number (3-digit zero-padded)
- **chk019**: Chunk number within block (3-digit zero-padded)  
- **sq9**: Square number (1-9, where 9 is canonical)

### Examples:
- `blk001-chk001-sq1`: Raw text in block 1, chunk 1
- `blk001-chk001-sq9`: Canonical summary in block 1, chunk 1
- `blk057-chk019-sq9`: Canonical summary in block 57, chunk 19

## Fat Zipper (Hot Side)

The **fat zipper** contains complete S1-S9 blocks with full data:

```javascript
blk001-chk001 -> {
  blockAddress: "blk001-chk001",
  timestamp: 1234567890,
  metadata: { provider: "ChatGPT", topic: "programming" },
  squares: {
    sq1: { // Raw text capture
      content: "Original raw text content...",
      timestamp: 1234567890,
      version: 1,
      type: "raw"
    },
    sq2: { // First change/edit
      content: "Edit 1: Modified content...",
      timestamp: 1234567891,
      version: 1,
      type: "edit"
    },
    sq3: { // Second edit
      content: "Edit 2: Further modifications...",
      timestamp: 1234567892,
      version: 1,
      type: "edit"
    },
    // ... sq4 through sq8 (additional edits)
    sq9: { // Canonical/final summary
      content: "Final canonical summary of the content...",
      timestamp: 1234567898,
      version: 1,
      type: "canonical",
      keywords: ["keyword1", "keyword2", "keyword3"],
      entities: {
        people: ["John Doe"],
        places: ["San Francisco"],
        concepts: ["machine learning"],
        dates: ["2024-01-15"]
      },
      hash: "abc123def456"
    }
  }
}
```

### Characteristics:
- **Full Data**: Contains complete S1-S9 processing chain
- **Harder to Search**: Requires scanning full content
- **Large Size**: Each block contains full text and metadata
- **Hot Storage**: Kept in RAM for fast access
- **Encrypted**: Full blocks are encrypted for security

## Thin Zipper (Cold Side)

The **thin zipper** contains compressed S9 tags for fast lookup:

```javascript
blk001-chk001-sq9 -> {
  blockAddress: "blk001-chk001",
  sq9Address: "blk001-chk001-sq9",
  content: "Final canonical summary of the content...", // Compressed to 150 chars
  keywords: ["keyword1", "keyword2", "keyword3"], // Top 5 keywords
  entities: {
    people: ["John Doe"],
    places: ["San Francisco"],
    concepts: ["machine learning"],
    dates: ["2024-01-15"]
  },
  hash: "abc123def456",
  timestamp: 1234567898,
  metadata: {
    provider: "ChatGPT",
    topic: "programming",
    size: 1250 // Original content size
  }
}
```

### Characteristics:
- **Compressed Data**: Only S9 canonical summaries
- **Fast Search**: Optimized for quick keyword matching
- **Small Size**: Minimal metadata for efficient storage
- **Unencrypted**: Fast access without decryption overhead
- **Indexed**: Pre-processed for search optimization

## Data Flow

### 1. Content Ingestion
```text
Raw Text → S1 (Raw Capture) → S2-S8 (Edits) → S9 (Canonical Summary)
```

### 2. Dual Storage
```text
S9 Content → Thin Zipper (Fast Search)
Full Block → Fat Zipper (Complete Data)
```

### 3. Search Process
```text
Query → Thin Zipper Search → Find S9 Tags → Retrieve Full Blocks from Fat Zipper
```

### 4. Memory Cascade
```text
Hot Pool → Fat Zipper → Cold Store (Encrypted Archive)
```

## Cascading Overflow Architecture

### Slot Management
When content changes occur:
- **Slot 1 Fills First**: New data always starts in Slot 1
- **Cascading Logic**: When Slot 1 is full, oldest data moves to Slot 2
- **Progressive Flow**: Data cascades through slots as new content arrives
- **Desktop Overflow**: When Slot 5 is full, oldest data goes to desktop app
- **Local Storage**: Desktop app stores overflow in `~/.ampiq/storage/` folder

**Why Cascading Overflow:**
- **Predictable Flow**: Clear data movement through memory hierarchy
- **Performance**: Small slots enable fast operations
- **Scalability**: Unlimited storage through desktop integration
- **Reliability**: Multiple storage layers ensure data safety

### Desktop App Integration
- **Native Messaging**: Secure communication between extension and desktop
- **Local Storage**: Overflow data stored in user's home directory
- **File Organization**: Structured storage with timestamps and metadata
- **Send All Feature**: Manual trigger to send all memory to desktop app
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Immediate Persistence Architecture

### Chrome Storage Integration
When content changes occur:
- **Instant Save**: Data immediately saved to chrome.storage.local
- **Cross-Session Persistence**: Data survives browser restarts
- **100MB Storage Limit**: Leverages Chrome's persistent storage APIs
- **Automatic Cleanup**: Intelligent management of storage limits

**Why Immediate Persistence:**
- **Crash Safety**: No data loss on browser crashes or restarts
- **Performance**: No complex storage layers or database overhead
- **Simplicity**: Leverages Chrome's built-in storage capabilities
- **Reliability**: Proven Chrome storage APIs for production use

## Security Implementation

### Encryption Strategy
- **AES-256**: Military-grade encryption for all sensitive data
- **On-Capture Encryption**: Data encrypted as soon as it leaves the page
- **No Plaintext Retention**: Zero plaintext data stored anywhere
- **On-Demand Decryption**: Data only decrypted when explicitly needed

### Memory Management
- **Encrypted Storage**: All raw data encrypted at rest
- **Chrome Storage**: Encrypted chunks stored in Chrome's secure storage
- **Desktop Storage**: Encrypted overflow data in local files
- **Automatic Cleanup**: Old data automatically managed to prevent memory issues
- **Privacy Protection**: All data stays on user's device

**Why This Security Model:**
- **Privacy Protection**: User conversations remain completely private
- **Compliance Ready**: Meets enterprise security requirements
- **Zero Trust**: No plaintext data ever stored
- **Production Ready**: Security model suitable for enterprise deployment

## Performance Characteristics

### Hot Memory Pool
- **Storage**: ~1MB per slot (5MB total hot memory)
- **Search**: O(n) - linear scan required
- **Access**: O(1) - direct slot retrieval
- **Memory**: Low usage, encrypted storage

### Desktop Integration
- **Overflow Storage**: Unlimited local file storage
- **File Organization**: Structured with timestamps and metadata
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Performance**: Fast local file operations

### Combined Performance
- **Search**: Fast slot lookup → targeted retrieval
- **Storage**: Efficient cascading with desktop overflow
- **Scalability**: Handles unlimited conversation data
- **Persistence**: Immediate storage to Chrome APIs

## Use Cases

### 1. Real-time Context Injection
```text
User types query → Thin zipper search → Find relevant S9 tags → 
Retrieve full blocks → Inject context into AI conversation
```

### 2. Cross-Provider Context
```text
Search across all providers → Find relevant S9 tags → 
Retrieve full blocks → Inject context into new provider
```

### 3. Memory Cascade
```text
Old conversations → Move to cold store → Keep S9 tags in thin zipper → 
Fast search still possible → Retrieve from cold store when needed
```

### 4. Crash Recovery
```text
System restart → Load thin zipper (fast) → Load fat zipper (encrypted) → 
Restore hot pool → Resume operations
```

## Production System Features

### Live Data Visualization
- **Real-time Counter**: Shows bytes processed per second
- **Memory Usage**: Displays current slot utilization
- **Activity Feed**: Live updates of memory processing
- **Performance Metrics**: System health and efficiency indicators
- **Slot Statistics**: Individual slot usage and performance

### Advanced Search
- **Instant Lookup**: Find any conversation in milliseconds
- **Keyword Search**: Search by topics, people, dates
- **Entity Recognition**: Find conversations by participants
- **Date Range**: Filter by time periods
- **Cross-Slot Search**: Search across all memory slots

### Robust Storage
- **Chrome Storage**: Uses Chrome's persistent storage APIs
- **Desktop Integration**: Local file storage for overflow data
- **Automatic Management**: Handles storage limits and cleanup
- **Performance Optimized**: Efficient storage and retrieval
- **Production Ready**: Fully functional enterprise-grade system

### Send All to GUI
- **Manual Trigger**: Button in extension popup to send all memory
- **Desktop Storage**: All memory saved to local files
- **Timestamped Files**: Organized storage with metadata
- **Cross-Platform**: Works on all supported operating systems
- **User Control**: Complete control over data transfer 