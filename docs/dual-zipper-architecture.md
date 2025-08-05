# AMP Dual Zipper Memory Architecture

## Overview

The AMP system implements a revolutionary **dual zipper memory architecture** that separates data storage into two complementary systems:

- **FAT ZIPPER (Hot Side)**: Contains full S1-S9 blocks with complete data, harder to search
- **THIN ZIPPER (Cold Side)**: Contains compressed S9 tags for fast lookup and retrieval

## Architecture Diagram

```
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

## Addressing System

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
```
Raw Text → S1 (Raw Capture) → S2-S8 (Edits) → S9 (Canonical Summary)
```

### 2. Dual Storage
```
S9 Content → Thin Zipper (Fast Search)
Full Block → Fat Zipper (Complete Data)
```

### 3. Search Process
```
Query → Thin Zipper Search → Find S9 Tags → Retrieve Full Blocks from Fat Zipper
```

### 4. Memory Cascade
```
Hot Pool → Fat Zipper → Cold Store (Encrypted Archive)
```

## Implementation Details

### Class Structure

```javascript
class DualZipperMemorySystem {
  constructor() {
    this.fatZipper = new Map();     // Full S1-S9 blocks
    this.thinZipper = new Map();    // Compressed S9 tags
    this.hotPool = new Map();       // Active blocks in RAM
    this.coldStore = new Map();     // Archived blocks (encrypted)
  }
}
```

### Key Methods

#### Adding Content
```javascript
async addContent(rawText, metadata) {
  // 1. Create full S1-S9 block (Fat Zipper)
  const fullBlock = this.createFullBlock(rawText, metadata);
  
  // 2. Create compressed S9 tag (Thin Zipper)
  const thinTag = this.createThinTag(fullBlock);
  
  // 3. Store in both zippers
  this.fatZipper.set(blockAddress, fullBlock);
  this.thinZipper.set(sq9Address, thinTag);
}
```

#### Fast Search
```javascript
async fastSearch(query, filters) {
  // Search thin zipper for compressed S9 tags
  for (const [sq9Address, thinTag] of this.thinZipper) {
    // Apply filters and scoring
    if (matches) {
      results.push({ sq9Address, blockAddress, thinTag, relevanceScore });
    }
  }
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
```

#### Full Block Retrieval
```javascript
async getFullBlock(blockAddress) {
  // 1. Try hot pool (fastest)
  if (this.hotPool.has(blockAddress)) return this.hotPool.get(blockAddress);
  
  // 2. Try fat zipper
  if (this.fatZipper.has(blockAddress)) return this.fatZipper.get(blockAddress);
  
  // 3. Try cold store (decrypt)
  if (this.coldStore.has(blockAddress)) {
    const encryptedBlock = this.coldStore.get(blockAddress);
    return await this.decryptBlock(encryptedBlock);
  }
}
```

## Performance Characteristics

### Fat Zipper
- **Storage**: ~1KB per block (full S1-S9 data)
- **Search**: O(n) - linear scan required
- **Access**: O(1) - direct block retrieval
- **Memory**: High usage, encrypted storage

### Thin Zipper
- **Storage**: ~256 bytes per tag (compressed S9)
- **Search**: O(n) but optimized with keywords/entities
- **Access**: O(1) - direct tag retrieval
- **Memory**: Low usage, unencrypted for speed

### Combined Performance
- **Search**: Fast thin zipper lookup → targeted fat zipper retrieval
- **Storage**: Efficient compression with full data preservation
- **Scalability**: Handles 5MB+ hot memory with unlimited cold storage for conversation data
- **Persistence**: Immediate storage to Chrome APIs

## Use Cases

### 1. Real-time Context Injection
```
User types query → Thin zipper search → Find relevant S9 tags → 
Retrieve full blocks → Inject context into AI conversation
```

### 2. Cross-Provider Context
```
Search across all providers → Find relevant S9 tags → 
Retrieve full blocks → Inject context into new provider
```

### 3. Memory Cascade
```
Old conversations → Move to cold store → Keep S9 tags in thin zipper → 
Fast search still possible → Retrieve from cold store when needed
```

### 4. Crash Recovery
```
System restart → Load thin zipper (fast) → Load fat zipper (encrypted) → 
Restore hot pool → Resume operations
```

## Security Features

### Encryption
- **Fat Zipper**: Full blocks encrypted with AES-256
- **Thin Zipper**: Unencrypted for fast search (minimal sensitive data)
- **Cold Store**: Encrypted archival storage

### Access Control
- **Hot Pool**: In-memory with session-based access
- **Fat Zipper**: Encrypted storage with key rotation
- **Thin Zipper**: Read-only search index

## Monitoring and Stats

```javascript
{
  fatZipperBlocks: 150,      // Number of full blocks
  thinZipperTags: 150,       // Number of S9 tags
  hotPoolBlocks: 25,         // Active blocks in RAM
  coldStoreBlocks: 125,      // Archived blocks
  totalMemoryUsage: 157286400, // ~150MB
  hotPoolMB: "150.00",       // Formatted memory usage
  fatZipperMB: "0.15",       // Fat zipper size estimate
  thinZipperMB: "0.04",      // Thin zipper size estimate
  coldStoreMB: "0.06"        // Cold store size estimate
}
```

## Testing

Use the test interface at `ext/dual-zipper-test.html` to:

1. **Add Content**: Test the dual zipper ingestion process
2. **Fast Search**: Test thin zipper search capabilities
3. **View Stats**: Monitor system performance
4. **Verify Architecture**: Confirm fat/thin zipper separation

## Conclusion

The dual zipper architecture provides the best of both worlds:

- **Fast Search**: Thin zipper enables quick keyword-based lookup
- **Complete Data**: Fat zipper preserves full S1-S9 processing chain
- **Efficient Storage**: Compression without data loss
- **Scalable**: Handles massive conversation datasets
- **Secure**: Encryption with performance optimization

This architecture perfectly matches the metaphorical "fat zipper" (full data, harder to search) and "thin zipper" (compressed tags, fast lookup) concept, creating a robust memory system for the AMP context engine. 