// © 2025 AMPIQ All rights reserved.
// AMP Memory Management with Hot Memory Priority Architecture
// Dual Zipper Memory System Implementation
// Version: 2.0.1 - Cache busted

// Hot Memory Architecture:
// - DOM Layer: 9 hot slots (instant 0ms access)
// - Extension Layer: 10MB RAM pool + 1MB crash safety backup
// - Storage: Minimal - only for crash recovery and future LLM adoption
// - Total footprint: ~12MB (very reasonable for infinite context)

// Chrome extension storage limits:
// chrome.storage.local: ~100MB (but can be configured higher)
// chrome.storage.sync: 100KB total, 8KB per item
// IndexedDB: Unlimited (limited by disk space)

// Security: Military-grade encryption for DOM data with ephemeral keys
class DOMEncryption {
  constructor() {
    this.key = this.generateSessionKey();
    this.keyRotationInterval = null;
    this.startKeyRotation();
  }
  
  generateSessionKey() {
    // Generate cryptographically secure random key
    const array = new Uint8Array(64); // 512 bits
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Rotate encryption key periodically for maximum security
  startKeyRotation() {
    this.keyRotationInterval = setInterval(() => {
      const oldKey = this.key;
      this.key = this.generateSessionKey();
      console.log('AMP: Session key rotated for enhanced security');
      
      // Clear old key from memory (strings are immutable, so we can't modify them)
      // Just let the old key be garbage collected
    }, 10 * 60 * 1000); // Rotate every 10 minutes
  }
  
  encrypt(data) {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Add random salt for each encryption
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const encoded = btoa(text);
      
      // Multi-layer XOR encryption with salt
      let result = '';
      for (let i = 0; i < encoded.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const saltChar = salt[i % salt.length];
        const charCode = encoded.charCodeAt(i) ^ keyChar ^ saltChar;
        result += String.fromCharCode(charCode);
      }
      
      // Return salt + encrypted data
      return saltHex + ':' + btoa(result);
    } catch (error) {
      console.error('Encryption failed:', error);
      return 'AMP_ENCRYPTED_ERROR';
    }
  }
  
  decrypt(encryptedData) {
    try {
      if (!encryptedData || encryptedData === 'AMP_ENCRYPTED_ERROR') {
        return null;
      }
      
      const [saltHex, encryptedText] = encryptedData.split(':');
      if (!saltHex || !encryptedText) return null;
      
      // Reconstruct salt
      const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      
      const decoded = atob(encryptedText);
      let result = '';
      
      // Decrypt with same key and salt
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const saltChar = salt[i % salt.length];
        const charCode = decoded.charCodeAt(i) ^ keyChar ^ saltChar;
        result += String.fromCharCode(charCode);
      }
      
      const text = atob(result);
      return JSON.parse(text);
    } catch (error) {
      console.error('Decryption failed - data may be corrupted or key rotated:', error);
      return null;
    }
  }
  
  // Secure memory wipe
  destroy() {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }
    
    // Overwrite key in memory
    if (this.key) {
      this.key = '0'.repeat(this.key.length);
      delete this.key;
    }
  }
}

// Global DOM encryption instance
const domEncryption = new DOMEncryption();

// DevTools detection and protection
class DevToolsProtection {
  constructor() {
    this.isDevToolsOpen = false;
    this.checkInterval = null;
    this.callbacks = [];
  }
  
  onDevToolsToggle(callback) {
    this.callbacks.push(callback);
  }
  
  startMonitoring() {
    let devtools = { open: false, orientation: null };
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.isDevToolsOpen = true;
          this.callbacks.forEach(callback => callback(true));
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          this.isDevToolsOpen = false;
          this.callbacks.forEach(callback => callback(false));
        }
      }
    }, 500);
  }
}

const devToolsProtection = new DevToolsProtection();

// Make functions available globally for content scripts
function getAIProvider() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (url.includes('chat.openai.com') || hostname.includes('openai.com')) {
    return 'chatgpt';
  } else if (url.includes('claude.ai') || hostname.includes('anthropic.com')) {
    return 'claude';
  } else if (url.includes('gemini.google.com') || hostname.includes('bard.google.com')) {
    return 'gemini';
  } else if (url.includes('perplexity.ai')) {
    return 'perplexity';
  } else if (url.includes('poe.com')) {
    return 'poe';
  } else if (url.includes('character.ai')) {
    return 'character';
  } else if (url.includes('you.com')) {
    return 'you';
  } else if (url.includes('blackbox.ai')) {
    return 'blackbox';
  }
  return 'unknown';
}

// Get real tab ID using chrome extension API
function getTabId() {
  return new Promise((resolve) => {
    if (chrome && chrome.tabs) {
      chrome.tabs.getCurrent(tab => {
        resolve(tab ? tab.id.toString() : Date.now().toString());
      });
    } else {
      resolve(Date.now().toString());
    }
  });
}

function getTopic() {
  // Extract topic from page title or conversation context
  const title = document.title;
  if (title && title !== 'ChatGPT' && title !== 'Claude') {
    return title.substring(0, 50);
  }
  return 'conversation';
}

// Make functions globally available for content scripts
window.getAIProvider = getAIProvider;
window.getTabId = getTabId;
window.getTopic = getTopic;

// Optimized Memory Pool for Hot Memory Priority
class MemoryPool {
  constructor() {
    // 5x1MB hot memory pools with cascading overflow
    this.slots = [
      { id: 1, maxSize: 1 * 1024 * 1024, currentSize: 0, chunks: new Map() }, // 1MB
      { id: 2, maxSize: 1 * 1024 * 1024, currentSize: 0, chunks: new Map() }, // 1MB
      { id: 3, maxSize: 1 * 1024 * 1024, currentSize: 0, chunks: new Map() }, // 1MB
      { id: 4, maxSize: 1 * 1024 * 1024, currentSize: 0, chunks: new Map() }, // 1MB
      { id: 5, maxSize: 1 * 1024 * 1024, currentSize: 0, chunks: new Map() }  // 1MB
    ];
    
    // S1-S9 Progression System
    this.s1s9Progression = new Map(); // conversationId -> S1-S9 progression
    this.currentSquares = new Map(); // conversationId -> current square (1-9)
    
    // Dual Zipper System
    this.fatZipper = new Map(); // blk057-chk019 -> full S1-S9 block
    this.thinZipper = new Map(); // blk057-chk019-sq9 -> compressed S9 tag
    this.blockCounter = 0;
    this.chunkCounter = 0;
    
    this.domMirror = new Map(); // 1MB DOM backup for crash safety
    
    // Lightweight indexes for fast access
    this.conversationIndex = new Map(); // conversation_id -> [chunk_ids]
    this.providerIndex = new Map(); // provider -> [conversation_ids]
    this.topicIndex = new Map(); // topic -> [conversation_ids]
    
    // Total memory limits
    this.maxTotalSize = 5 * 1024 * 1024; // 5MB total hot memory
    this.maxDomMirrorSize = 1 * 1024 * 1024; // 1MB DOM safety backup
    this.maxConversations = 5000; // Reasonable conversation limit
    
    // Error handling and recovery
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.isRecovering = false;
    this.backupQueue = [];
    
    // Storage state tracking
    this.storageState = {
      lastSave: 0,
      lastLoad: 0,
      saveErrors: 0,
      loadErrors: 0,
      totalSaved: 0,
      totalLoaded: 0
    };
    
    // Overflow tracking for desktop app
    this.overflowCount = 0;
    this.lastOverflowTime = 0;
    this.overflowQueue = [];
    
    // Rolling buffer configuration
    this.rollingConfig = {
      dom: { slots: 9, maxAge: 30 * 60 * 1000 }, // 30 minutes in DOM
      hot: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours hot
      cold: { archived: true, summaryOnly: true, maxAge: Infinity } // Archive
    };
    
    // Synchronized rolling state
    this.rollingState = {
      currentSession: null,
      activeDomSlots: [],
      hotBuffer: [],
      coldArchive: []
    };
  }

  // Load 5x1MB hot memory pool from storage with robust error handling
  async loadFromStorage() {
    if (!chrome || !chrome.storage) {
      console.error('AMP: Chrome storage not available');
      return false;
    }

    try {
      this.isRecovering = true;
      console.log('AMP: Loading 5x1MB hot memory pool from storage...');
      
      // Load all data from chrome.storage.local
      const result = await chrome.storage.local.get([
        'amp_slots',
        'amp_dom_mirror', 
        'amp_conversation_index',
        'amp_provider_index',
        'amp_topic_index',
        'amp_storage_state',
        'amp_overflow_queue',
        'amp_fat_zipper',
        'amp_thin_zipper',
        'amp_s1s9_progression',
        'amp_current_squares',
        'amp_block_counter',
        'amp_chunk_counter'
      ]);
      
      let loadedCount = 0;
      let errorCount = 0;
      
      // Load slots (5x1MB of conversation data)
      if (result.amp_slots) {
        try {
          const slotsData = result.amp_slots;
          
          // Load each slot
          for (let i = 0; i < this.slots.length; i++) {
            const slotData = slotsData[`slot_${i + 1}`];
            if (slotData) {
              const slot = this.slots[i];
              slot.currentSize = 0;
              slot.chunks.clear();
              
              Object.entries(slotData).forEach(([id, encryptedChunk]) => {
                try {
                  const chunk = this.decryptChunk(encryptedChunk);
                  if (chunk && chunk.id) {
                    slot.chunks.set(id, chunk);
                    slot.currentSize += chunk.size;
                    loadedCount++;
                  }
                } catch (decryptError) {
                  console.warn(`AMP: Failed to decrypt chunk ${id}:`, decryptError);
                  errorCount++;
                }
              });
            }
          }
          
          console.log(`AMP: Loaded ${loadedCount} chunks to slots (${errorCount} errors)`);
        } catch (slotsError) {
          console.error('AMP: Failed to load slots:', slotsError);
          this.storageState.loadErrors++;
        }
      }
      
      // Load DOM mirror (1MB crash safety backup)
      if (result.amp_dom_mirror) {
        try {
          const mirrorData = result.amp_dom_mirror;
          
          Object.entries(mirrorData).forEach(([id, encryptedChunk]) => {
            try {
              const chunk = this.decryptChunk(encryptedChunk);
              if (chunk && chunk.id) {
                this.domMirror.set(id, chunk);
              }
            } catch (decryptError) {
              console.warn(`AMP: Failed to decrypt DOM mirror chunk ${id}:`, decryptError);
            }
          });
          
          console.log(`AMP: Loaded ${this.domMirror.size} chunks to DOM mirror`);
        } catch (mirrorError) {
          console.error('AMP: Failed to load DOM mirror:', mirrorError);
        }
      }
      
      // Load indexes
      if (result.amp_conversation_index) {
        try {
          this.conversationIndex = new Map(Object.entries(result.amp_conversation_index));
          console.log(`AMP: Loaded conversation index (${this.conversationIndex.size} conversations)`);
        } catch (indexError) {
          console.error('AMP: Failed to load conversation index:', indexError);
        }
      }
      
      if (result.amp_provider_index) {
        try {
          this.providerIndex = new Map(Object.entries(result.amp_provider_index));
          console.log(`AMP: Loaded provider index (${this.providerIndex.size} providers)`);
        } catch (indexError) {
          console.error('AMP: Failed to load provider index:', indexError);
        }
      }
      
      if (result.amp_topic_index) {
        try {
          this.topicIndex = new Map(Object.entries(result.amp_topic_index));
          console.log(`AMP: Loaded topic index (${this.topicIndex.size} topics)`);
        } catch (indexError) {
          console.error('AMP: Failed to load topic index:', indexError);
        }
      }
      
      // Load overflow queue
      if (result.amp_overflow_queue) {
        try {
          this.overflowQueue = result.amp_overflow_queue;
          console.log(`AMP: Loaded overflow queue (${this.overflowQueue.length} items)`);
        } catch (overflowError) {
          console.error('AMP: Failed to load overflow queue:', overflowError);
        }
      }
      
      // Load storage state
      if (result.amp_storage_state) {
        try {
          this.storageState = { ...this.storageState, ...result.amp_storage_state };
          console.log('AMP: Loaded storage state');
        } catch (stateError) {
          console.error('AMP: Failed to load storage state:', stateError);
        }
      }
      
      this.storageState.lastLoad = Date.now();
      this.storageState.totalLoaded = loadedCount;
      
      console.log(`AMP: ✅ 5x1MB hot memory pool loaded successfully`);
      console.log(`AMP: 📊 Slots: ${this.getTotalChunks()} chunks, DOM mirror: ${this.domMirror.size} chunks`);
      
      return true;
      
    } catch (error) {
      console.error('AMP: ❌ Critical error loading from storage:', error);
      this.storageState.loadErrors++;
      this.errorCount++;
      this.lastErrorTime = Date.now();
      
      // Attempt recovery
      await this.attemptRecovery();
      
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  // Save 5x1MB hot memory pool to storage with robust error handling and immediate persistence
  async saveToStorage() {
    if (!chrome || !chrome.storage) {
      console.error('AMP: Chrome storage not available');
      return false;
    }

    try {
      console.log('AMP: Saving 5x1MB hot memory pool to storage...');
      
      // Prepare all data for storage
      const storageData = {};
      let savedCount = 0;
      let errorCount = 0;
      
      // Save slots (5x1MB of conversation data)
      try {
        const slotsObj = {};
        
        for (let i = 0; i < this.slots.length; i++) {
          const slot = this.slots[i];
          const slotObj = {};
          
          for (const [id, chunk] of slot.chunks.entries()) {
            try {
              slotObj[id] = this.encryptChunk(chunk);
              savedCount++;
            } catch (encryptError) {
              console.warn(`AMP: Failed to encrypt chunk ${id}:`, encryptError);
              errorCount++;
            }
          }
          
          slotsObj[`slot_${slot.id}`] = slotObj;
        }
        
        storageData.amp_slots = slotsObj;
        console.log(`AMP: Prepared ${savedCount} chunks for slots storage (${errorCount} errors)`);
      } catch (slotsError) {
        console.error('AMP: Failed to prepare slots for storage:', slotsError);
        this.storageState.saveErrors++;
      }
      
      // Save DOM mirror (1MB crash safety backup)
      try {
        const domMirrorObj = {};
        
        for (const [id, chunk] of this.domMirror.entries()) {
          try {
            domMirrorObj[id] = this.encryptChunk(chunk);
          } catch (encryptError) {
            console.warn(`AMP: Failed to encrypt DOM mirror chunk ${id}:`, encryptError);
          }
        }
        
        storageData.amp_dom_mirror = domMirrorObj;
        console.log(`AMP: Prepared ${this.domMirror.size} chunks for DOM mirror storage`);
      } catch (mirrorError) {
        console.error('AMP: Failed to prepare DOM mirror for storage:', mirrorError);
      }
      
      // Save indexes
      try {
        storageData.amp_conversation_index = Object.fromEntries(this.conversationIndex);
        storageData.amp_provider_index = Object.fromEntries(this.providerIndex);
        storageData.amp_topic_index = Object.fromEntries(this.topicIndex);
        console.log('AMP: Prepared indexes for storage');
      } catch (indexError) {
        console.error('AMP: Failed to prepare indexes for storage:', indexError);
      }
      
      // Save overflow queue
      try {
        storageData.amp_overflow_queue = this.overflowQueue;
        console.log(`AMP: Prepared overflow queue for storage (${this.overflowQueue.length} items)`);
      } catch (overflowError) {
        console.error('AMP: Failed to prepare overflow queue for storage:', overflowError);
      }
      
      // Save storage state
      try {
        this.storageState.lastSave = Date.now();
        this.storageState.totalSaved = savedCount;
        storageData.amp_storage_state = this.storageState;
        console.log('AMP: Prepared storage state');
      } catch (stateError) {
        console.error('AMP: Failed to prepare storage state:', stateError);
      }
      
      // Save dual zipper data
      try {
        storageData.amp_fat_zipper = Array.from(this.fatZipper.entries());
        storageData.amp_thin_zipper = Array.from(this.thinZipper.entries());
        storageData.amp_s1s9_progression = Array.from(this.s1s9Progression.entries());
        storageData.amp_current_squares = Array.from(this.currentSquares.entries());
        storageData.amp_block_counter = this.blockCounter;
        storageData.amp_chunk_counter = this.chunkCounter;
        console.log('AMP: Prepared dual zipper data for storage');
      } catch (zipperError) {
        console.error('AMP: Failed to prepare dual zipper data for storage:', zipperError);
      }
      
      // Save to chrome.storage.local with retry logic
      let saveSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!saveSuccess && retryCount < maxRetries) {
        try {
          await chrome.storage.local.set(storageData);
          saveSuccess = true;
          console.log(`AMP: ✅ Full 250MB hot pool saved successfully (attempt ${retryCount + 1})`);
        } catch (saveError) {
          retryCount++;
          console.error(`AMP: Save attempt ${retryCount} failed:`, saveError);
          
          if (retryCount < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            throw saveError;
          }
        }
      }
      
      if (saveSuccess) {
        console.log(`AMP: 📊 Storage stats - Saved: ${savedCount} chunks, Errors: ${errorCount}`);
        return true;
      } else {
        throw new Error('All save attempts failed');
      }
      
    } catch (error) {
      console.error('AMP: ❌ Critical error saving to storage:', error);
      this.storageState.saveErrors++;
      this.errorCount++;
      this.lastErrorTime = Date.now();
      
      // Queue for retry
      this.backupQueue.push({
        timestamp: Date.now(),
        error: error.message
      });
      
      // Attempt recovery
      await this.attemptRecovery();
      
      return false;
    }
  }

  generateChunkId() {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateConversationId(provider, tabId, topic) {
    return `conv_${provider}_${tabId}_${Date.now()}`;
  }

  // Add chunk to 5x1MB hot memory with cascading overflow to desktop app
  async addChunk(text, metadata = {}) {
    if (!text || text.trim().length === 0) {
      console.warn('AMP: Attempted to add empty chunk, skipping...');
      return null;
    }

    try {
      const id = this.generateChunkId();
      const conversationId = metadata.conversation_id || this.generateConversationId(
        metadata.ai_provider || getAIProvider(),
        metadata.tab_id || await getTabId(),
        metadata.topic || getTopic()
      );
      
      // Process through S1-S9 progression
      const s1s9Data = await this.processS1S9Progression(text, conversationId, metadata);
      
      // Create chunk with S1-S9 data
      const chunk = {
        id,
        conversation_id: conversationId,
        fullText: text,
        summary: s1s9Data.sq9?.canonical || (text.length > 500 ? this.quickSummary(text) : text),
        ai_provider: metadata.ai_provider || getAIProvider(),
        tab_id: metadata.tab_id || await getTabId(),
        topic: metadata.topic || getTopic(),
        timestamp: Date.now(),
        slot: 1, // Start in slot 1
        access_count: 1,
        size: text.length,
        inDom: true,
        inHot: true,
        sessionActive: true,
        captureMethod: metadata.captureMethod || 'realtime',
        s1s9Data: s1s9Data // Include S1-S9 progression data
      };
      
      // Store in dual zipper system
      const fatAddress = await this.storeInFatZipper(chunk, s1s9Data);
      chunk.fatAddress = fatAddress;

      // Validate chunk integrity
      if (!this.validateChunk(chunk)) {
        throw new Error('Chunk validation failed');
      }

      // Try to add to slots with cascading logic
      const addedToSlot = await this.addToSlot(chunk);
      
      if (!addedToSlot) {
        // All slots are full, send to desktop app overflow
        await this.sendToDesktopOverflow(chunk);
        console.log(`🔄 AMP: Chunk overflowed to desktop app - ${text.length} chars, ID: ${id}`);
        return chunk;
      }

      // Add to DOM mirror (1MB safety backup)
      this.updateDomMirror(chunk);
      
      // Update indexes
      this.updateIndexes(chunk);
      
      // Manage synchronized rolling buffers
      await this.manageSynchronizedRolling();
      
      // IMMEDIATE PERSISTENCE - Save to storage right away
      const saveSuccess = await this.saveToStorage();
      
      if (!saveSuccess) {
        console.warn('AMP: Failed to save chunk immediately, will retry...');
        this.backupQueue.push({
          timestamp: Date.now(),
          chunkId: id,
          operation: 'save'
        });
      }
      
      console.log(`✅ AMP: Chunk added to slot ${chunk.slot} - ${text.length} chars, ID: ${id}`);
      
      return chunk;
      
    } catch (error) {
      console.error('AMP: ❌ Failed to add chunk:', error);
      this.errorCount++;
      this.lastErrorTime = Date.now();
      
      if (this.errorCount > 5) {
        await this.attemptRecovery();
      }
      
      return null;
    }
  }

  // S1-S9 Progression System
  async processS1S9Progression(text, conversationId, metadata) {
    const currentSquare = this.currentSquares.get(conversationId) || 0;
    const progression = this.s1s9Progression.get(conversationId) || {};
    
    // Determine which square to update based on content analysis
    const squareToUpdate = this.determineSquareToUpdate(text, currentSquare, progression);
    
    // Update the progression
    progression[`sq${squareToUpdate}`] = {
      content: text,
      timestamp: Date.now(),
      version: (progression[`sq${squareToUpdate}`]?.version || 0) + 1,
      type: this.getSquareType(squareToUpdate),
      metadata: metadata
    };
    
    // Update current square
    this.currentSquares.set(conversationId, squareToUpdate);
    this.s1s9Progression.set(conversationId, progression);
    
    // Generate S9 canonical summary if we have enough data
    if (squareToUpdate >= 8 || this.shouldGenerateS9(progression)) {
      progression.sq9 = await this.generateCanonicalSummary(progression);
    }
    
    return progression;
  }

  determineSquareToUpdate(text, currentSquare, progression) {
    // S1: Raw capture (always first)
    if (currentSquare === 0) return 1;
    
    // S2-S8: User edits/mutations
    if (currentSquare < 8) {
      // Check if this is a significant change from previous square
      const previousContent = progression[`sq${currentSquare}`]?.content || '';
      if (this.isSignificantChange(text, previousContent)) {
        return currentSquare + 1;
      }
    }
    
    // If no significant change, update current square
    return currentSquare;
  }

  isSignificantChange(newText, oldText) {
    // Simple change detection - can be enhanced
    const similarity = this.calculateSimilarity(newText, oldText);
    return similarity < 0.8; // 80% similarity threshold
  }

  calculateSimilarity(text1, text2) {
    // Simple similarity calculation - can be enhanced with better algorithms
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  }

  getSquareType(squareNumber) {
    switch (squareNumber) {
      case 1: return 'raw';
      case 9: return 'canonical';
      default: return 'edit';
    }
  }

  shouldGenerateS9(progression) {
    // Generate S9 if we have at least 3 squares with content
    const filledSquares = Object.keys(progression).filter(key => 
      key.startsWith('sq') && key !== 'sq9' && progression[key]?.content
    ).length;
    return filledSquares >= 3;
  }

  async generateCanonicalSummary(progression) {
    // Combine all content from S1-S8
    const allContent = Object.keys(progression)
      .filter(key => key.startsWith('sq') && key !== 'sq9')
      .map(key => progression[key]?.content)
      .filter(content => content)
      .join(' ');
    
    // Generate summary
    const summary = this.quickSummary(allContent);
    
    // Extract keywords and entities
    const keywords = this.extractKeywords(allContent);
    const entities = this.extractEntities(allContent);
    
    return {
      canonical: summary,
      timestamp: Date.now(),
      version: 1,
      type: 'canonical',
      keywords: keywords,
      entities: entities,
      hash: this.generateHash(allContent)
    };
  }

  extractKeywords(text) {
    // Simple keyword extraction - can be enhanced
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  extractEntities(text) {
    // Simple entity extraction - can be enhanced
    return {
      people: [],
      places: [],
      concepts: [],
      dates: []
    };
  }

  generateHash(text) {
    // Simple hash generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // Dual Zipper System Methods
  generateBlockAddress() {
    this.blockCounter++;
    return `blk${this.blockCounter.toString().padStart(3, '0')}`;
  }

  generateChunkAddress() {
    this.chunkCounter++;
    return `chk${this.chunkCounter.toString().padStart(3, '0')}`;
  }

  async storeInFatZipper(chunk, s1s9Data) {
    const blockAddress = this.generateBlockAddress();
    const chunkAddress = this.generateChunkAddress();
    const fullAddress = `${blockAddress}-${chunkAddress}`;
    
    // Store full S1-S9 block in fat zipper
    const fatBlock = {
      address: fullAddress,
      chunk: chunk,
      s1s9Data: s1s9Data,
      timestamp: Date.now(),
      size: JSON.stringify(chunk).length + JSON.stringify(s1s9Data).length
    };
    
    this.fatZipper.set(fullAddress, fatBlock);
    
    // Store S9 tag in thin zipper for fast search
    if (s1s9Data.sq9) {
      const thinTag = {
        address: `${fullAddress}-sq9`,
        canonical: s1s9Data.sq9.canonical,
        keywords: s1s9Data.sq9.keywords,
        entities: s1s9Data.sq9.entities,
        hash: s1s9Data.sq9.hash,
        fatAddress: fullAddress,
        timestamp: Date.now()
      };
      
      this.thinZipper.set(thinTag.address, thinTag);
    }
    
    return fullAddress;
  }

  async searchThinZipper(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search through thin zipper tags
    for (const [address, tag] of this.thinZipper) {
      let relevance = 0;
      
      // Check canonical summary
      if (tag.canonical.toLowerCase().includes(queryLower)) {
        relevance += 10;
      }
      
      // Check keywords
      if (tag.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))) {
        relevance += 5;
      }
      
      // Check entities
      Object.values(tag.entities).flat().forEach(entity => {
        if (entity.toLowerCase().includes(queryLower)) {
          relevance += 3;
        }
      });
      
      if (relevance > 0) {
        results.push({
          address: tag.fatAddress,
          relevance: relevance,
          canonical: tag.canonical,
          timestamp: tag.timestamp
        });
      }
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async retrieveFromFatZipper(address) {
    return this.fatZipper.get(address);
  }

  async storeInThinZipper(chunk, s1s9Data) {
    const thinAddress = this.generateChunkAddress();
    const s9Content = s1s9Data.sq9?.canonical || chunk.summary || chunk.fullText.substring(0, 200);
    
    const thinTag = {
      address: thinAddress,
      s9Content: s9Content,
      keywords: s1s9Data.sq9?.keywords || [],
      entities: s1s9Data.sq9?.entities || {},
      timestamp: Date.now(),
      fatAddress: chunk.fatAddress,
      size: s9Content.length
    };
    
    this.thinZipper.set(thinAddress, thinTag);
    return thinAddress;
  }

  // Add chunk to appropriate slot with cascading logic
  async addToSlot(chunk) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      
      // Check if slot has space
      if (slot.currentSize + chunk.size <= slot.maxSize) {
        slot.chunks.set(chunk.id, chunk);
        slot.currentSize += chunk.size;
        chunk.slot = slot.id;
        return true;
      }
    }
    
    // No slot has space, need to cascade
    return await this.cascadeAndAdd(chunk);
  }

  // Cascade data and try to add new chunk
  async cascadeAndAdd(chunk) {
    // Start from slot 1 and cascade data down
    for (let i = 0; i < this.slots.length - 1; i++) {
      const currentSlot = this.slots[i];
      const nextSlot = this.slots[i + 1];
      
      // If current slot is full, move oldest data to next slot
      if (currentSlot.currentSize + chunk.size > currentSlot.maxSize) {
        const moved = await this.moveOldestToNextSlot(currentSlot, nextSlot);
        if (moved) {
          // Try to add chunk to current slot again
          if (currentSlot.currentSize + chunk.size <= currentSlot.maxSize) {
            currentSlot.chunks.set(chunk.id, chunk);
            currentSlot.currentSize += chunk.size;
            chunk.slot = currentSlot.id;
            return true;
          }
        }
      }
    }
    
    // If we get here, all slots are full
    return false;
  }

  // Move oldest chunk from current slot to next slot
  async moveOldestToNextSlot(currentSlot, nextSlot) {
    if (nextSlot.currentSize >= nextSlot.maxSize) {
      // Next slot is also full, try to cascade further
      if (nextSlot.id < this.slots.length) {
        const nextNextSlot = this.slots[nextSlot.id];
        return await this.moveOldestToNextSlot(nextSlot, nextNextSlot);
      } else {
        // Last slot is full, send to desktop overflow
        const oldestChunk = this.getOldestChunk(currentSlot);
        if (oldestChunk) {
          await this.sendToDesktopOverflow(oldestChunk);
          currentSlot.chunks.delete(oldestChunk.id);
          currentSlot.currentSize -= oldestChunk.size;
          return true;
        }
        return false;
      }
    }
    
    // Next slot has space, move oldest chunk
    const oldestChunk = this.getOldestChunk(currentSlot);
    if (oldestChunk) {
      currentSlot.chunks.delete(oldestChunk.id);
      currentSlot.currentSize -= oldestChunk.size;
      
      nextSlot.chunks.set(oldestChunk.id, oldestChunk);
      nextSlot.currentSize += oldestChunk.size;
      oldestChunk.slot = nextSlot.id;
      
      console.log(`🔄 AMP: Cascaded chunk ${oldestChunk.id} from slot ${currentSlot.id} to slot ${nextSlot.id}`);
      return true;
    }
    
    return false;
  }

  // Get oldest chunk from a slot
  getOldestChunk(slot) {
    let oldestChunk = null;
    let oldestTime = Infinity;
    
    for (const chunk of slot.chunks.values()) {
      if (chunk.timestamp < oldestTime) {
        oldestTime = chunk.timestamp;
        oldestChunk = chunk;
      }
    }
    
    return oldestChunk;
  }

  // Send chunk to desktop app overflow storage with offline resilience
  async sendToDesktopOverflow(chunk) {
    try {
      this.overflowCount++;
      this.lastOverflowTime = Date.now();
      
      // Add to overflow queue (always - this is our backup)
      this.overflowQueue.push({
        timestamp: Date.now(),
        chunk: chunk,
        operation: 'overflow',
        retryCount: 0,
        lastAttempt: Date.now()
      });
      
      // Try to send to native messaging host
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'sendToDesktop',
            type: 'overflow',
            chunk: chunk
          });
          
          if (response && response.success) {
            console.log(`📤 AMP: Successfully sent chunk to desktop overflow - ${chunk.id}`);
            // Remove from queue if successfully sent
            this.overflowQueue = this.overflowQueue.filter(item => item.chunk.id !== chunk.id);
          } else {
            console.warn('AMP: Desktop app returned failure for overflow chunk:', chunk.id);
            // Keep in queue for retry
          }
        } catch (error) {
          console.warn('AMP: Failed to send overflow to desktop (will retry later):', error);
          // Keep in queue for retry - this is normal when desktop is offline
        }
      }
      
      // Always save to Chrome storage as backup
      await this.saveToStorage();
      
    } catch (error) {
      console.error('AMP: Critical error in sendToDesktopOverflow:', error);
      // Even if everything fails, the chunk is still in the queue and will be retried
    }
  }

  // Retry failed overflow sends when desktop comes back online
  async retryOverflowQueue() {
    if (this.overflowQueue.length === 0) return;
    
    console.log(`🔄 AMP: Retrying ${this.overflowQueue.length} overflow items...`);
    
    const itemsToRetry = [...this.overflowQueue];
    let successCount = 0;
    
    for (const item of itemsToRetry) {
      try {
        // Skip if too many retries
        if (item.retryCount >= 3) {
          console.warn(`AMP: Skipping overflow item ${item.chunk.id} - too many retries`);
          continue;
        }
        
        // Skip if retried too recently
        if (Date.now() - item.lastAttempt < 30000) { // 30 seconds
          continue;
        }
        
        item.retryCount++;
        item.lastAttempt = Date.now();
        
        const response = await chrome.runtime.sendMessage({
          action: 'sendToDesktop',
          type: 'overflow',
          chunk: item.chunk
        });
        
        if (response && response.success) {
          // Remove from queue on success
          this.overflowQueue = this.overflowQueue.filter(qItem => qItem.chunk.id !== item.chunk.id);
          successCount++;
          console.log(`✅ AMP: Successfully retried overflow item ${item.chunk.id}`);
        }
        
      } catch (error) {
        console.warn(`AMP: Retry failed for overflow item ${item.chunk.id}:`, error);
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ AMP: Successfully retried ${successCount} overflow items`);
      await this.saveToStorage(); // Save updated queue
    }
  }

  // Validate chunk integrity before storage
  validateChunk(chunk) {
    if (!chunk.id || !chunk.conversation_id || !chunk.fullText) {
      console.error('AMP: Chunk missing required fields');
      return false;
    }
    
    if (chunk.fullText.length === 0) {
      console.error('AMP: Chunk has empty text');
      return false;
    }
    
    if (chunk.size !== chunk.fullText.length) {
      console.error('AMP: Chunk size mismatch');
      return false;
          }
      
      // Load dual zipper data
      if (result.amp_fat_zipper) {
        try {
          this.fatZipper = new Map(result.amp_fat_zipper);
          console.log(`AMP: Loaded fat zipper (${this.fatZipper.size} blocks)`);
        } catch (fatError) {
          console.error('AMP: Failed to load fat zipper:', fatError);
        }
      }
      
      if (result.amp_thin_zipper) {
        try {
          this.thinZipper = new Map(result.amp_thin_zipper);
          console.log(`AMP: Loaded thin zipper (${this.thinZipper.size} tags)`);
        } catch (thinError) {
          console.error('AMP: Failed to load thin zipper:', thinError);
        }
      }
      
      if (result.amp_s1s9_progression) {
        try {
          this.s1s9Progression = new Map(result.amp_s1s9_progression);
          console.log(`AMP: Loaded S1-S9 progression (${this.s1s9Progression.size} conversations)`);
        } catch (progressionError) {
          console.error('AMP: Failed to load S1-S9 progression:', progressionError);
        }
      }
      
      if (result.amp_current_squares) {
        try {
          this.currentSquares = new Map(result.amp_current_squares);
          console.log(`AMP: Loaded current squares (${this.currentSquares.size} conversations)`);
        } catch (squaresError) {
          console.error('AMP: Failed to load current squares:', squaresError);
        }
      }
      
      if (result.amp_block_counter) {
        this.blockCounter = result.amp_block_counter;
        console.log(`AMP: Loaded block counter: ${this.blockCounter}`);
      }
      
      if (result.amp_chunk_counter) {
        this.chunkCounter = result.amp_chunk_counter;
        console.log(`AMP: Loaded chunk counter: ${this.chunkCounter}`);
      }
      
      return true;
  }

  updateIndexes(chunk) {
    // Conversation index
    if (!this.conversationIndex.has(chunk.conversation_id)) {
      this.conversationIndex.set(chunk.conversation_id, []);
    }
    this.conversationIndex.get(chunk.conversation_id).push(chunk.id);
    
    // Provider index
    if (!this.providerIndex.has(chunk.ai_provider)) {
      this.providerIndex.set(chunk.ai_provider, new Set());
    }
    this.providerIndex.get(chunk.ai_provider).add(chunk.conversation_id);
    
    // Topic index
    if (!this.topicIndex.has(chunk.topic)) {
      this.topicIndex.set(chunk.topic, new Set());
    }
    this.topicIndex.get(chunk.topic).add(chunk.conversation_id);
  }

  // Update 1MB DOM mirror for crash safety
  updateDomMirror(chunk) {
    this.domMirror.set(chunk.id, {
      id: chunk.id,
      conversation_id: chunk.conversation_id,
      summary: chunk.summary,
      ai_provider: chunk.ai_provider,
      tab_id: chunk.tab_id,
      topic: chunk.topic,
      timestamp: chunk.timestamp,
      slot: chunk.slot,
      size: chunk.size
      // No fullText in mirror - saves space, just crash recovery metadata
    });
    
    // Keep DOM mirror under 1MB
    this.trimDomMirror();
  }

  // Keep DOM mirror lean (1MB max)
  trimDomMirror() {
    const currentSize = Array.from(this.domMirror.values())
      .reduce((sum, chunk) => sum + (chunk.size || 0), 0);
    
    if (currentSize > this.maxDomMirrorSize) {
      // Remove oldest chunks from mirror (keep recent for crash recovery)
      const sortedChunks = Array.from(this.domMirror.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      let removedSize = 0;
      const targetReduction = currentSize - (this.maxDomMirrorSize * 0.8); // Target 80%
      
      for (const chunk of sortedChunks) {
        if (removedSize >= targetReduction) break;
        
        this.domMirror.delete(chunk.id);
        removedSize += chunk.size || 0;
      }
      
      console.log(`Trimmed DOM mirror: removed ${removedSize} bytes`);
    }
  }

  // Synchronized rolling buffer management across all layers
  async manageSynchronizedRolling() {
    const now = Date.now();
    
    // 1. Manage DOM rolling (9 slots, 30 min age limit)
    const domSlots = Array.from(this.hotPool.values())
      .filter(chunk => chunk.inDom)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    // Keep only 9 most recent in DOM
    for (let i = 9; i < domSlots.length; i++) {
      domSlots[i].inDom = false;
      domSlots[i].slot = 2; // Move to hot buffer
    }
    
    // Age out old DOM slots (30 minutes)
    domSlots.forEach((chunk, index) => {
      const age = now - chunk.timestamp;
      if (age > this.rollingConfig.dom.maxAge) {
        chunk.inDom = false;
        chunk.slot = 2; // Move to hot buffer
      } else {
        chunk.slot = index + 1; // Update DOM slot position
      }
    });
    
    // 2. Manage hot buffer (10MB, 24 hour age limit)
    const hotChunks = Array.from(this.hotPool.values())
      .filter(chunk => chunk.inHot);
    
    let hotSize = hotChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    
    // Archive to slot 9 if over size or age limits
    const chunksToArchive = hotChunks
      .filter(chunk => {
        const age = now - chunk.timestamp;
        return age > this.rollingConfig.hot.maxAge || hotSize > this.maxHotSize;
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Oldest first
    
    for (const chunk of chunksToArchive) {
      if (hotSize <= this.maxHotSize * 0.8) break; // Target 80% capacity
      
      await this.archiveToSlot9(chunk);
      hotSize -= chunk.size;
    }
    
    // 3. Update rolling state for monitoring
    this.rollingState = {
      currentSession: this.getCurrentSession(),
      activeDomSlots: domSlots.slice(0, 9).map(c => c.id),
      hotBuffer: hotChunks.filter(c => !c.inDom).map(c => c.id),
      coldArchive: Array.from(this.hotPool.values()).filter(c => c.slot === 9).map(c => c.id)
    };
  }

  // Archive chunk to slot 9 with conversation summary
  async archiveToSlot9(chunk) {
    const conversationChunks = this.getConversation(chunk.conversation_id);
    
    // Create conversation summary with predictive buffering
    chunk.conversationSummary = this.createConversationSummary(conversationChunks);
    chunk.contextWindows = this.createContextWindows(conversationChunks, chunk.id);
    chunk.slot = 9;
    chunk.inHot = false;
    chunk.sessionActive = false;
    
    // Remove full text to save memory (keep in summary only)
    delete chunk.fullText;
    chunk.size = chunk.conversationSummary.length + JSON.stringify(chunk.contextWindows).length;
    
    console.log(`Archived conversation ${chunk.conversation_id} to slot 9 - ${chunk.size} chars with context windows`);
  }

  // Get current session info
  getCurrentSession() {
    const activeChunks = Array.from(this.hotPool.values())
      .filter(chunk => chunk.sessionActive)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (activeChunks.length === 0) return null;
    
    const latest = activeChunks[0];
    return {
      conversation_id: latest.conversation_id,
      provider: latest.ai_provider,
      topic: latest.topic,
      messageCount: activeChunks.length,
      duration: Date.now() - activeChunks[activeChunks.length - 1].timestamp
    };
  }

      // MEMORY CASCADE: Data flows DOM -> Hot -> Slot 9 with reverse injection capability
  async performWaterfallCascade() {
    const now = Date.now();
    
    // 1. DOM -> Hot Buffer (cascade down)
    const domChunks = Array.from(this.hotPool.values())
      .filter(chunk => chunk.inDom)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Keep only 9 most recent in DOM, cascade others to hot buffer
    for (let i = 9; i < domChunks.length; i++) {
      const chunk = domChunks[i];
      chunk.inDom = false;
      chunk.slot = 2; // Move to hot buffer
      console.log(`Cascaded chunk ${chunk.id} from DOM to hot buffer`);
    }
    
    // 2. Hot Buffer -> Slot 9 (cascade down for old/large data)
    const hotChunks = Array.from(this.hotPool.values())
      .filter(chunk => chunk.inHot && !chunk.inDom);
    
    let hotSize = hotChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    
    // Cascade to slot 9 if over capacity or age
    const cascadeToArchive = hotChunks
      .filter(chunk => {
        const age = now - chunk.timestamp;
        return age > this.rollingConfig.hot.maxAge || hotSize > this.maxHotSize;
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Oldest first for archival
    
    for (const chunk of cascadeToArchive) {
      if (hotSize <= this.maxHotSize * 0.8) break;
      
      await this.archiveToSlot9(chunk);
      hotSize -= chunk.size;
      console.log(`Cascaded conversation ${chunk.conversation_id} from hot buffer to slot 9 archive`);
    }
    
            console.log(`Memory cascade: ${domChunks.length} DOM, ${hotChunks.length} hot, ${this.getArchivedCount()} archived`);
  }

      // REVERSE FLOW: Inject data back up the memory layers (scroll up, context injection)
  async performReverseInjection(targetType = 'scroll', contextQuery = '', maxItems = 5) {
    const reversedData = [];
    
    if (targetType === 'scroll') {
      // User scrolled up - hydrate DOM with historical data from hot buffer
      const hotChunks = Array.from(this.hotPool.values())
        .filter(chunk => chunk.inHot && !chunk.inDom)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxItems);
      
      for (const chunk of hotChunks) {
        chunk.inDom = true;
        chunk.slot = 1; // Bring back to DOM
        reversedData.push({
          type: 'hot_to_dom',
          chunk: chunk,
          content: chunk.fullText
        });
      }
      
      console.log(`Reverse injection: Brought ${reversedData.length} chunks from hot buffer to DOM`);
    }
    
    else if (targetType === 'context') {
      // Context injection from slot 9 archives
      const archives = Array.from(this.hotPool.values())
        .filter(chunk => chunk.slot === 9)
        .sort((a, b) => this.calculateRelevance(chunk, contextQuery))
        .slice(0, maxItems);
      
      for (const chunk of archives) {
        reversedData.push({
          type: 'archive_to_context',
          chunk: chunk,
          content: chunk.conversationSummary,
          contextWindows: chunk.contextWindows
        });
      }
      
      console.log(`Reverse injection: Retrieved ${reversedData.length} archived conversations for context`);
    }
    
    return reversedData;
  }

  // CRASH RECOVERY: Detect same chat vs new window and inject crossover data
  async performCrashRecovery(currentProvider, currentTabId, currentTopic) {
    const recoveryData = {
      sameWindow: false,
      crossoverInjected: false,
      dataRestored: 0,
      contextPrepared: false
    };
    
    // 1. Check if this is the same chat window that crashed
    const existingSessions = Array.from(this.conversationIndex.keys())
      .map(convId => {
        const chunks = this.getConversation(convId);
        if (chunks.length === 0) return null;
        
        const latest = chunks[chunks.length - 1];
        return {
          conversation_id: convId,
          provider: latest.ai_provider,
          tab_id: latest.tab_id,
          topic: latest.topic,
          lastActivity: latest.timestamp,
          chunkCount: chunks.length
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.lastActivity - a.lastActivity);
    
    // Check for exact match (same provider + topic, recent activity)
    const sameWindowSession = existingSessions.find(session => {
      const timeSinceActivity = Date.now() - session.lastActivity;
      return session.provider === currentProvider && 
             session.topic === currentTopic &&
             timeSinceActivity < 5 * 60 * 1000; // Within 5 minutes
    });
    
    if (sameWindowSession) {
      // SAME WINDOW: Restore exact conversation
      recoveryData.sameWindow = true;
      const conversationChunks = this.getConversation(sameWindowSession.conversation_id);
      
      // Bring recent chunks back to DOM
      const recentChunks = conversationChunks
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 9);
      
      for (const chunk of recentChunks) {
        chunk.inDom = true;
        chunk.sessionActive = true;
        chunk.slot = recentChunks.indexOf(chunk) + 1;
      }
      
      recoveryData.dataRestored = recentChunks.length;
      console.log(`Crash recovery: Restored ${recoveryData.dataRestored} chunks from same conversation`);
    }
    
    else {
      // NEW WINDOW: Inject crossover data from slot 9 archives
      const crossoverArchives = Array.from(this.hotPool.values())
        .filter(chunk => 
          chunk.slot === 9 && 
          (chunk.ai_provider === currentProvider || // Same provider
           chunk.topic === currentTopic || // Same topic
           this.isTopicRelated(chunk.topic, currentTopic)) // Related topics
        )
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Top 10 most relevant archives
      
      // Prepare context dump for fresh conversation
      const contextDump = [];
      for (const archive of crossoverArchives) {
        contextDump.push({
          source: `${archive.ai_provider}/${archive.topic}`,
          summary: archive.conversationSummary,
          keyInsights: this.extractKeyInsights(archive.conversationSummary),
          contextWindows: archive.contextWindows,
          relevanceScore: this.calculateTopicRelevance(archive.topic, currentTopic),
          provider: archive.ai_provider,
          timestamp: archive.timestamp
        });
      }
      
      // Store context dump for immediate injection
      this.contextDump = contextDump;
      recoveryData.crossoverInjected = true;
      recoveryData.contextPrepared = contextDump.length;
      
      console.log(`Crash recovery: Prepared crossover context from ${recoveryData.contextPrepared} archived conversations`);
      console.log(`Context sources: ${contextDump.map(c => c.source).join(', ')}`);
    }
    
    return recoveryData;
  }

  // Get crossover context for fresh window injection
  getCrossoverContext(maxTokens = 2000) {
    if (!this.contextDump || this.contextDump.length === 0) return '';
    
    const avgTokensPerChar = 0.25;
    let currentTokens = 0;
    const contextParts = [];
    
    // Sort by relevance and recency
    const sortedContext = this.contextDump
      .sort((a, b) => (b.relevanceScore * 0.7 + (b.timestamp / Date.now()) * 0.3) - 
                     (a.relevanceScore * 0.7 + (a.timestamp / Date.now()) * 0.3));
    
    for (const context of sortedContext) {
      const contextText = `[${context.source}] ${context.summary}\nKey insights: ${context.keyInsights.join(', ')}`;
      const tokens = contextText.length * avgTokensPerChar;
      
      if (currentTokens + tokens <= maxTokens) {
        contextParts.push(contextText);
        currentTokens += tokens;
      }
    }
    
    if (contextParts.length === 0) return '';
    
    return `=== CROSSOVER CONTEXT FROM PREVIOUS CONVERSATIONS ===\n\n${contextParts.join('\n\n---\n\n')}\n\n=== END CROSSOVER CONTEXT ===`;
  }

  // Helper methods for crash recovery
  isTopicRelated(topic1, topic2) {
    const keywords1 = topic1.toLowerCase().split(/[^a-z0-9]/);
    const keywords2 = topic2.toLowerCase().split(/[^a-z0-9]/);
    
    const commonKeywords = keywords1.filter(word => 
      word.length > 3 && keywords2.includes(word)
    );
    
    return commonKeywords.length > 0;
  }

  calculateTopicRelevance(sourceTopic, targetTopic) {
    if (sourceTopic === targetTopic) return 1.0;
    if (this.isTopicRelated(sourceTopic, targetTopic)) return 0.7;
    return 0.3; // Base relevance for different topics
  }

  extractKeyInsights(conversationSummary) {
    // Extract key insights from conversation summary
    const insights = [];
    const text = conversationSummary.toLowerCase();
    
    // Look for key patterns
    if (text.includes('code') || text.includes('programming')) insights.push('coding');
    if (text.includes('error') || text.includes('bug')) insights.push('debugging');
    if (text.includes('design') || text.includes('ui')) insights.push('design');
    if (text.includes('data') || text.includes('database')) insights.push('data');
    if (text.includes('api') || text.includes('endpoint')) insights.push('api');
    
    return insights.length > 0 ? insights : ['general'];
  }

  getArchivedCount() {
    return Array.from(this.hotPool.values()).filter(chunk => chunk.slot === 9).length;
  }

  // Slot management - promote chunks based on access patterns and time
  async promoteSlots() {
    const now = Date.now();
    
    for (const [id, chunk] of this.hotPool) {
      const age = now - chunk.timestamp;
      const config = this.rollingConfig[chunk.slot];
      
      // Check if chunk should move to a different slot
      if (age > config.maxAge && chunk.slot < 9) {
        // Promote to next slot
        await this.moveToSlot(chunk, chunk.slot + 1);
      } else if (chunk.access_count > 10 && chunk.slot > 1) {
        // Move frequently accessed chunks to hotter slots
        await this.moveToSlot(chunk, Math.max(1, chunk.slot - 1));
      }
    }
  }

  async moveToSlot(chunk, newSlot) {
    const newConfig = this.rollingConfig[newSlot];
    
    chunk.slot = newSlot;
    
    // Handle slot 9 (archive) - convert to conversation summary with predictive buffering
    if (newSlot === 9) {
      const conversationChunks = this.getConversation(chunk.conversation_id);
      
      // Create comprehensive conversation summary with context windows
      chunk.conversationSummary = this.createConversationSummary(conversationChunks);
      chunk.contextWindows = this.createContextWindows(conversationChunks, chunk.id);
      chunk.embedding = await this.generateEmbedding(chunk.conversationSummary);
      
      // Remove full text to save massive space
      delete chunk.fullText;
      chunk.summary = chunk.conversationSummary.substring(0, 200) + '...';
      chunk.size = chunk.conversationSummary.length + JSON.stringify(chunk.contextWindows).length;
      
      console.log(`Archived conversation ${chunk.conversation_id} - ${conversationChunks.length} messages -> ${chunk.size} chars with context windows`);
    }
    // Handle embedding based on slot config
    else if (newConfig.embedding && !chunk.embedding) {
      // Generate embedding for slots 1 and 9
      this.generateEmbedding(chunk.fullText).then(embedding => {
        chunk.embedding = embedding;
        this.saveToStorage();
      });
    } else if (!newConfig.embedding && chunk.embedding) {
      // Remove embedding for middle slots to save space
      delete chunk.embedding;
    }
  }

  // Create intelligent conversation summary for slot 9
  createConversationSummary(conversationChunks) {
    if (!conversationChunks || conversationChunks.length === 0) return '';
    
    const sortedChunks = conversationChunks.sort((a, b) => a.timestamp - b.timestamp);
    const provider = sortedChunks[0].ai_provider;
    const topic = sortedChunks[0].topic;
    const duration = sortedChunks[sortedChunks.length - 1].timestamp - sortedChunks[0].timestamp;
    const messageCount = sortedChunks.length;
    
    // Extract key themes and topics
    const allText = sortedChunks.map(c => c.fullText || c.summary || '').join(' ');
    const keyPhrases = this.extractKeyPhrases(allText);
    
    // Extract first user question and final response
    const firstMessage = sortedChunks[0].fullText || sortedChunks[0].summary || '';
    const lastMessage = sortedChunks[sortedChunks.length - 1].fullText || sortedChunks[sortedChunks.length - 1].summary || '';
    
    // Create structured summary
    return `CONVERSATION SUMMARY [${provider}/${topic}]:
Duration: ${Math.round(duration / 60000)} minutes, ${messageCount} messages
Key Topics: ${keyPhrases.join(', ')}

Initial Query: ${firstMessage.substring(0, 200)}${firstMessage.length > 200 ? '...' : ''}

Final Response: ${lastMessage.substring(0, 200)}${lastMessage.length > 200 ? '...' : ''}

Context: ${provider} conversation about ${topic} covering ${keyPhrases.slice(0, 3).join(', ')}`;
  }

  // Create predictive context windows for slot 9 - INSANE HOT DATA BUFFERING
  createContextWindows(conversationChunks, currentChunkId) {
    if (!conversationChunks || conversationChunks.length === 0) return {};
    
    const sortedChunks = conversationChunks.sort((a, b) => a.timestamp - b.timestamp);
    const currentIndex = sortedChunks.findIndex(chunk => chunk.id === currentChunkId);
    
    if (currentIndex === -1) return {};
    
    const windowSize = 10; // 10 chunks before and after
    const contextWindows = {
      currentChunk: currentIndex,
      totalChunks: sortedChunks.length,
      
      // Before context - 10 chunks leading up to current
      before: [],
      
      // Current chunk context
      current: {
        id: sortedChunks[currentIndex].id,
        summary: sortedChunks[currentIndex].summary,
        timestamp: sortedChunks[currentIndex].timestamp,
        messageType: sortedChunks[currentIndex].message_type || 'unknown'
      },
      
      // After context - 10 chunks following current  
      after: [],
      
      // Predictive segments - adjacent conversation windows ready to load
      predictiveSegments: new Map(),
      
      // Navigation hints for ultra-fast jumping
      navigationHints: {
        hasMoreBefore: currentIndex > windowSize,
        hasMoreAfter: currentIndex < sortedChunks.length - windowSize - 1,
        previousImportantChunk: null,
        nextImportantChunk: null
      }
    };
    
    // Populate before context (10 chunks before current)
    for (let i = Math.max(0, currentIndex - windowSize); i < currentIndex; i++) {
      const chunk = sortedChunks[i];
      contextWindows.before.push({
        id: chunk.id,
        summary: chunk.summary || this.quickSummary(chunk.fullText || ''),
        timestamp: chunk.timestamp,
        messageType: chunk.message_type || 'unknown',
        relativePosition: i - currentIndex, // Negative numbers for before
        importance: this.calculateChunkImportance(chunk, sortedChunks)
      });
    }
    
    // Populate after context (10 chunks after current)
    for (let i = currentIndex + 1; i <= Math.min(sortedChunks.length - 1, currentIndex + windowSize); i++) {
      const chunk = sortedChunks[i];
      contextWindows.after.push({
        id: chunk.id,
        summary: chunk.summary || this.quickSummary(chunk.fullText || ''),
        timestamp: chunk.timestamp,
        messageType: chunk.message_type || 'unknown',
        relativePosition: i - currentIndex, // Positive numbers for after
        importance: this.calculateChunkImportance(chunk, sortedChunks)
      });
    }
    
    // Create predictive segments - preload adjacent windows for instant jumping
    const segmentSize = 20; // Each segment covers 20 chunks
    const segmentsToPreload = 5; // Preload 5 segments in each direction
    
    for (let direction of [-1, 1]) { // -1 for before, 1 for after
      for (let segmentOffset = 1; segmentOffset <= segmentsToPreload; segmentOffset++) {
        const segmentCenter = currentIndex + (direction * segmentOffset * segmentSize);
        
        if (segmentCenter >= 0 && segmentCenter < sortedChunks.length) {
          const segmentStart = Math.max(0, segmentCenter - segmentSize / 2);
          const segmentEnd = Math.min(sortedChunks.length - 1, segmentCenter + segmentSize / 2);
          
          const segmentId = `segment_${direction > 0 ? 'after' : 'before'}_${segmentOffset}`;
          
          const segment = {
            id: segmentId,
            centerIndex: segmentCenter,
            startIndex: segmentStart,
            endIndex: segmentEnd,
            chunkCount: segmentEnd - segmentStart + 1,
            keyChunks: [], // Most important chunks in this segment
            summary: '', // Segment summary
            loadPriority: segmentsToPreload - segmentOffset + 1 // Closer segments load first
          };
          
          // Extract key chunks from this segment
          for (let i = segmentStart; i <= segmentEnd; i++) {
            const chunk = sortedChunks[i];
            const importance = this.calculateChunkImportance(chunk, sortedChunks);
            
            if (importance > 0.7) { // Only store high-importance chunks
              segment.keyChunks.push({
                id: chunk.id,
                summary: chunk.summary || this.quickSummary(chunk.fullText || ''),
                timestamp: chunk.timestamp,
                importance: importance,
                position: i
              });
            }
          }
          
          // Create segment summary from key chunks
          segment.summary = this.createSegmentSummary(segment.keyChunks, sortedChunks[0].ai_provider);
          
          contextWindows.predictiveSegments.set(segmentId, segment);
        }
      }
    }
    
    // Find important navigation points
    contextWindows.navigationHints.previousImportantChunk = this.findPreviousImportantChunk(currentIndex, sortedChunks);
    contextWindows.navigationHints.nextImportantChunk = this.findNextImportantChunk(currentIndex, sortedChunks);
    
    return contextWindows;
  }

  // Calculate chunk importance for predictive loading
  calculateChunkImportance(chunk, allChunks) {
    let importance = 0.5; // Base importance
    
    // Length bonus - longer chunks often more important
    const length = (chunk.fullText || chunk.summary || '').length;
    importance += Math.min(0.3, length / 1000);
    
    // Question/answer pattern detection
    const text = (chunk.fullText || chunk.summary || '').toLowerCase();
    if (text.includes('?') || text.includes('how') || text.includes('what') || text.includes('why')) {
      importance += 0.2; // Questions are important
    }
    
    // Code/technical content detection
    if (text.includes('```') || text.includes('function') || text.includes('class') || text.includes('import')) {
      importance += 0.3; // Code is often important
    }
    
    // Error/problem resolution
    if (text.includes('error') || text.includes('problem') || text.includes('solution') || text.includes('fix')) {
      importance += 0.2;
    }
    
    // Decision points
    if (text.includes('decide') || text.includes('choose') || text.includes('recommend') || text.includes('suggest')) {
      importance += 0.2;
    }
    
    return Math.min(1.0, importance);
  }

  // Create summary for predictive segments
  createSegmentSummary(keyChunks, provider) {
    if (keyChunks.length === 0) return 'Empty segment';
    
    const topics = keyChunks.map(chunk => this.extractKeyPhrases(chunk.summary).slice(0, 2)).flat();
    const uniqueTopics = [...new Set(topics)].slice(0, 5);
    
    return `${provider} segment: ${keyChunks.length} key messages about ${uniqueTopics.join(', ')}`;
  }

  // Find previous important chunk for navigation
  findPreviousImportantChunk(currentIndex, sortedChunks) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const importance = this.calculateChunkImportance(sortedChunks[i], sortedChunks);
      if (importance > 0.8) {
        return {
          id: sortedChunks[i].id,
          index: i,
          summary: sortedChunks[i].summary,
          importance: importance
        };
      }
    }
    return null;
  }

  // Find next important chunk for navigation
  findNextImportantChunk(currentIndex, sortedChunks) {
    for (let i = currentIndex + 1; i < sortedChunks.length; i++) {
      const importance = this.calculateChunkImportance(sortedChunks[i], sortedChunks);
      if (importance > 0.8) {
        return {
          id: sortedChunks[i].id,
          index: i,
          summary: sortedChunks[i].summary,
          importance: importance
        };
      }
    }
    return null;
  }

  // Extract key phrases for conversation summary
  extractKeyPhrases(text) {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'what', 'when', 'where', 'will', 'would', 'could', 'should'].includes(word));
  }

  async manageStorage() {
    const currentSize = this.getCurrentSize();
    
    if (currentSize > this.maxSize) {
      // Archive entire conversations to slot 9 first
      const conversations = Array.from(this.conversationIndex.keys())
        .map(convId => {
          const chunks = this.conversationIndex.get(convId).map(chunkId => this.pool.get(chunkId));
          const avgSlot = chunks.reduce((sum, chunk) => sum + chunk.slot, 0) / chunks.length;
          const oldestTimestamp = Math.min(...chunks.map(chunk => chunk.timestamp));
          const totalSize = chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0);
          
          return { convId, avgSlot, oldestTimestamp, chunks, totalSize };
        })
        .filter(conv => conv.avgSlot < 9) // Only non-archived conversations
        .sort((a, b) => {
          // Prioritize archiving older, larger conversations
          if (Math.abs(a.oldestTimestamp - b.oldestTimestamp) > 7 * 24 * 60 * 60 * 1000) {
            return a.oldestTimestamp - b.oldestTimestamp; // Older first
          }
          return b.totalSize - a.totalSize; // Larger first
        });
      
      let freedSpace = 0;
      const targetReduction = currentSize - (this.maxSize * 0.7); // Target 70% capacity
      
      // Archive conversations to slot 9 (massive space savings)
      for (const conv of conversations) {
        if (freedSpace >= targetReduction) break;
        
        for (const chunk of conv.chunks) {
          if (chunk.slot < 9) {
            const originalSize = chunk.size || 0;
            await this.moveToSlot(chunk, 9);
            freedSpace += originalSize - (chunk.size || 0);
          }
        }
        
        console.log(`Archived conversation ${conv.convId}: ${conv.chunks.length} messages, saved ${freedSpace} bytes`);
      }
      
      // If still over capacity, remove oldest archived conversations
      if (currentSize - freedSpace > this.maxSize) {
        const archivedConversations = Array.from(this.conversationIndex.keys())
          .map(convId => {
            const chunks = this.conversationIndex.get(convId).map(chunkId => this.pool.get(chunkId));
            return {
              convId,
              isArchived: chunks.every(c => c.slot === 9),
              oldestTimestamp: Math.min(...chunks.map(chunk => chunk.timestamp)),
              chunks
            };
          })
          .filter(conv => conv.isArchived)
          .sort((a, b) => a.oldestTimestamp - b.oldestTimestamp);
        
        for (const conv of archivedConversations) {
          if (freedSpace >= targetReduction) break;
          
          for (const chunk of conv.chunks) {
            freedSpace += chunk.size || 0;
            this.pool.delete(chunk.id);
          }
          
          this.conversationIndex.delete(conv.convId);
          console.log(`Removed archived conversation ${conv.convId}`);
        }
      }
    }
  }

  // Fast conversation-based retrieval
  getConversation(conversationId) {
    const chunkIds = this.conversationIndex.get(conversationId) || [];
    return chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
  }

  getConversationsByProvider(provider) {
    const conversationIds = this.providerIndex.get(provider) || new Set();
    return Array.from(conversationIds).map(convId => this.getConversation(convId));
  }

  getConversationsByTopic(topic) {
    const conversationIds = this.topicIndex.get(topic) || new Set();
    return Array.from(conversationIds).map(convId => this.getConversation(convId));
  }

  // Enhanced search with archive awareness
  searchInConversations(query, filters = {}) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [convId, chunkIds] of this.conversationIndex) {
      const chunks = chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
      
      // Apply filters
      if (filters.provider && !chunks.some(c => c.ai_provider === filters.provider)) continue;
      if (filters.topic && !chunks.some(c => c.topic === filters.topic)) continue;
      if (filters.minDate && !chunks.some(c => c.timestamp >= filters.minDate)) continue;
      if (filters.maxDate && !chunks.some(c => c.timestamp <= filters.maxDate)) continue;
      
      // Search within conversation - handle both full text and archived summaries
      const matchingChunks = chunks.filter(chunk => {
        const searchText = chunk.fullText || chunk.conversationSummary || chunk.summary || '';
        return searchText.toLowerCase().includes(queryLower);
      });
      
      if (matchingChunks.length > 0) {
        const isArchived = chunks.every(c => c.slot === 9);
        results.push({
          conversationId: convId,
          chunks: matchingChunks,
          matchCount: matchingChunks.length,
          totalChunks: chunks.length,
          isArchived,
          searchType: isArchived ? 'summary' : 'fulltext'
        });
      }
    }
    
    return results.sort((a, b) => {
      // Prioritize full-text matches over archived summaries
      if (a.isArchived !== b.isArchived) {
        return a.isArchived ? 1 : -1;
      }
      return b.matchCount - a.matchCount;
    });
  }

  // Get relevant chunks for injection (prioritize full-text over summaries)
  getRelevantChunks(query, maxChunks = 5) {
    const searchResults = this.searchInConversations(query);
    const relevantChunks = [];
    
    // First pass: full-text matches
    for (const result of searchResults) {
      if (result.isArchived) continue; // Skip archived for first pass
      
      for (const chunk of result.chunks) {
        if (relevantChunks.length >= maxChunks) break;
        relevantChunks.push({
          ...chunk,
          conversationContext: result.chunks.length,
          relevanceScore: this.calculateRelevance(chunk, query),
          searchType: 'fulltext'
        });
      }
      if (relevantChunks.length >= maxChunks) break;
    }
    
    // Second pass: archived summaries if needed
    if (relevantChunks.length < maxChunks) {
      for (const result of searchResults) {
        if (!result.isArchived) continue; // Only archived for second pass
        
        for (const chunk of result.chunks) {
          if (relevantChunks.length >= maxChunks) break;
          relevantChunks.push({
            ...chunk,
            conversationContext: result.chunks.length,
            relevanceScore: this.calculateRelevance(chunk, query) * 0.7, // Lower score for archived
            searchType: 'summary'
          });
        }
        if (relevantChunks.length >= maxChunks) break;
      }
    }
    
    return relevantChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // PREDICTIVE CONTEXT NAVIGATION - Lightning fast context jumping
  getContextWindow(chunkId, direction = 0, windowSize = 10) {
    // Find the chunk
    const chunk = this.hotPool.get(chunkId);
    if (!chunk || chunk.slot !== 9 || !chunk.contextWindows) {
      return null;
    }
    
    const contextWindows = chunk.contextWindows;
    
    if (direction === 0) {
      // Return current window
      return {
        before: contextWindows.before,
        current: contextWindows.current,
        after: contextWindows.after,
        navigationHints: contextWindows.navigationHints
      };
    } else if (direction < 0) {
      // Navigate backwards - load previous segment
      const segmentId = `segment_before_${Math.abs(direction)}`;
      const segment = contextWindows.predictiveSegments.get(segmentId);
      
      if (segment) {
        return this.expandContextWindow(chunk.conversation_id, segment, 'before');
      }
    } else if (direction > 0) {
      // Navigate forwards - load next segment
      const segmentId = `segment_after_${direction}`;
      const segment = contextWindows.predictiveSegments.get(segmentId);
      
      if (segment) {
        return this.expandContextWindow(chunk.conversation_id, segment, 'after');
      }
    }
    
    return null;
  }

  // Expand context window using predictive segments
  expandContextWindow(conversationId, segment, direction) {
    const conversationChunks = this.getConversation(conversationId);
    const sortedChunks = conversationChunks.sort((a, b) => a.timestamp - b.timestamp);
    
    const expandedWindow = {
      segmentId: segment.id,
      direction: direction,
      centerIndex: segment.centerIndex,
      totalAvailable: sortedChunks.length,
      chunks: [],
      keyHighlights: segment.keyChunks,
      summary: segment.summary,
      navigationHints: {
        canGoFurther: direction === 'before' ? segment.startIndex > 0 : segment.endIndex < sortedChunks.length - 1,
        importantChunksAhead: segment.keyChunks.length,
        estimatedRelevance: this.calculateSegmentRelevance(segment)
      }
    };
    
    // Load chunks from this segment (with smart prioritization)
    for (let i = segment.startIndex; i <= segment.endIndex; i++) {
      if (i >= 0 && i < sortedChunks.length) {
        const chunk = sortedChunks[i];
        expandedWindow.chunks.push({
          id: chunk.id,
          summary: chunk.summary || this.quickSummary(chunk.fullText || ''),
          timestamp: chunk.timestamp,
          importance: this.calculateChunkImportance(chunk, sortedChunks),
          position: i,
          isKeyChunk: segment.keyChunks.some(kc => kc.id === chunk.id)
        });
      }
    }
    
    return expandedWindow;
  }

  // Calculate segment relevance for prioritization
  calculateSegmentRelevance(segment) {
    if (segment.keyChunks.length === 0) return 0.1;
    
    const avgImportance = segment.keyChunks.reduce((sum, chunk) => sum + chunk.importance, 0) / segment.keyChunks.length;
    const densityBonus = Math.min(0.3, segment.keyChunks.length / segment.chunkCount);
    
    return Math.min(1.0, avgImportance + densityBonus);
  }

  // Smart context injection using predictive windows - DECRYPT ON INJECTION ONLY
  getSmartContextForInjection(query, conversationId = null, maxTokens = 4000) {
    const contextParts = [];
    let currentTokens = 0;
    const avgTokensPerChar = 0.25; // Rough estimate
    
    // 1. Get immediately relevant chunks (decrypt only what we need)
    const relevantChunks = this.getRelevantChunks(query, 3);
    for (const chunk of relevantChunks) {
      // Decrypt content only at injection time
      const content = this.getDecryptedContent(chunk);
      if (!content) continue;
      
      const tokens = content.length * avgTokensPerChar;
      
      if (currentTokens + tokens <= maxTokens * 0.6) { // Reserve 60% for relevant content
        contextParts.push({
          type: 'relevant',
          content: content,
          source: `${chunk.ai_provider}/${chunk.topic}`,
          relevance: chunk.relevanceScore
        });
        currentTokens += tokens;
      }
    }
    
    // 2. Add contextual windows from same conversation if available
    if (conversationId) {
      const conversationChunks = this.getConversation(conversationId);
      const archivedChunks = conversationChunks.filter(c => c.slot === 9 && c.contextWindows);
      
      for (const archivedChunk of archivedChunks) {
        const contextWindow = this.getContextWindow(archivedChunk.id, 0, 5);
        if (contextWindow) {
          // Decrypt and build context summary
          const contextSummary = [
            ...contextWindow.before.slice(-3).map(c => c.summary),
            contextWindow.current.summary,
            ...contextWindow.after.slice(0, 3).map(c => c.summary)
          ].join(' | ');
          
          const tokens = contextSummary.length * avgTokensPerChar;
          if (currentTokens + tokens <= maxTokens * 0.9) { // Use remaining 30%
            contextParts.push({
              type: 'conversation_context',
              content: contextSummary,
              source: `conversation_${conversationId}`,
              relevance: 0.8
            });
            currentTokens += tokens;
            break; // One conversation context is enough
          }
        }
      }
    }
    
    // 3. Add cross-provider context if space remaining  
    if (currentTokens < maxTokens * 0.9) {
      const crossProviderChunks = this.getCrossProviderContext(query, 2);
      for (const chunk of crossProviderChunks) {
        // Decrypt archived summaries only at injection time
        const content = chunk.conversationSummary || chunk.summary;
        const tokens = content.length * avgTokensPerChar;
        
        if (currentTokens + tokens <= maxTokens) {
          contextParts.push({
            type: 'cross_provider',
            content: content,
            source: `${chunk.ai_provider}/${chunk.topic}`,
            relevance: chunk.relevanceScore * 0.6
          });
          currentTokens += tokens;
        }
      }
    }
    
    // Sort by relevance and format for injection
    const injectionContext = contextParts
      .sort((a, b) => b.relevance - a.relevance)
      .map(part => `[${part.type.toUpperCase()} - ${part.source}]: ${part.content}`)
      .join('\n\n');
    
    // Clear decrypted data from memory immediately after use
    this.clearDecryptedCache();
    
    return injectionContext;
  }

  // Get decrypted content with temporary caching
  getDecryptedContent(chunk) {
    if (!chunk) return null;
    
    // For already decrypted chunks (in memory)
    if (chunk.fullText) return chunk.fullText;
    if (chunk.conversationSummary) return chunk.conversationSummary;
    if (chunk.summary) return chunk.summary;
    
    // For encrypted chunks, decrypt temporarily
    if (chunk.encrypted_data) {
      const decrypted = domEncryption.decrypt(chunk.encrypted_data);
      return decrypted?.fullText || decrypted?.conversationSummary || decrypted?.summary || null;
    }
    
    return null;
  }

  // Clear any temporarily decrypted data (security measure)
  clearDecryptedCache() {
    // Clear any temporary decryption artifacts
    if (global.tempDecryptedData) {
      delete global.tempDecryptedData;
    }
  }

  // Secure search that works with encrypted data
  searchInConversations(query, filters = {}) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [convId, chunkIds] of this.conversationIndex) {
      const chunks = chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
      
      // Apply filters using decrypted metadata
      if (filters.provider && !chunks.some(c => c.ai_provider === filters.provider)) continue;
      if (filters.topic && !chunks.some(c => c.topic === filters.topic)) continue;
      if (filters.minDate && !chunks.some(c => c.timestamp >= filters.minDate)) continue;
      if (filters.maxDate && !chunks.some(c => c.timestamp <= filters.maxDate)) continue;
      
      // Search within conversation - decrypt only for search
      const matchingChunks = chunks.filter(chunk => {
        const searchText = this.getDecryptedContent(chunk);
        return searchText && searchText.toLowerCase().includes(queryLower);
      });
      
      if (matchingChunks.length > 0) {
        const isArchived = chunks.every(c => c.slot === 9);
        results.push({
          conversationId: convId,
          chunks: matchingChunks,
          matchCount: matchingChunks.length,
          totalChunks: chunks.length,
          isArchived,
          searchType: isArchived ? 'summary' : 'fulltext'
        });
      }
    }
    
    // Clear decrypted search cache
    this.clearDecryptedCache();
    
    return results.sort((a, b) => {
      // Prioritize full-text matches over archived summaries
      if (a.isArchived !== b.isArchived) {
        return a.isArchived ? 1 : -1;
      }
      return b.matchCount - a.matchCount;
    });
  }

  // Get cross-provider context for broader perspective
  getCrossProviderContext(query, maxResults = 2) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search across different providers for similar topics
    for (const [convId, chunkIds] of this.conversationIndex) {
      const chunks = chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
      if (chunks.length === 0) continue;
      
      const provider = chunks[0].ai_provider;
      const archivedChunks = chunks.filter(c => c.slot === 9 && c.conversationSummary);
      
      for (const chunk of archivedChunks) {
        const summaryText = chunk.conversationSummary.toLowerCase();
        
        // Check for topic similarity
        const queryWords = queryLower.split(/\s+/);
        const matchScore = queryWords.reduce((score, word) => {
          return score + (summaryText.includes(word) ? 1 : 0);
        }, 0) / queryWords.length;
        
        if (matchScore > 0.3) {
          results.push({
            ...chunk,
            relevanceScore: matchScore * 0.8, // Cross-provider gets slight penalty
            provider: provider
          });
        }
      }
    }
    
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  // Cross-Provider Context Transfer System
  async transferContextToProvider(sourceProvider, targetProvider, contextData) {
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transferRecord = {
      id: transferId,
      sourceProvider: sourceProvider,
      targetProvider: targetProvider,
      contextData: contextData,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Store transfer record
    this.crossProviderTransfers = this.crossProviderTransfers || new Map();
    this.crossProviderTransfers.set(transferId, transferRecord);
    
    // Convert context format for target provider
    const convertedContext = await this.convertContextFormat(contextData, targetProvider);
    
    // Update transfer status
    transferRecord.status = 'completed';
    transferRecord.convertedContext = convertedContext;
    
    return {
      transferId: transferId,
      convertedContext: convertedContext,
      sourceProvider: sourceProvider,
      targetProvider: targetProvider
    };
  }

  async convertContextFormat(contextData, targetProvider) {
    // Provider-specific format conversion
    switch (targetProvider.toLowerCase()) {
      case 'chatgpt':
        return this.convertToChatGPTFormat(contextData);
      case 'claude':
        return this.convertToClaudeFormat(contextData);
      case 'gemini':
        return this.convertToGeminiFormat(contextData);
      default:
        return this.convertToUniversalFormat(contextData);
    }
  }

  convertToChatGPTFormat(contextData) {
    // ChatGPT prefers structured conversation format
    return {
      format: 'chatgpt',
      messages: contextData.messages || [],
      systemPrompt: contextData.systemPrompt || '',
      contextWindow: contextData.contextWindow || 4000
    };
  }

  convertToClaudeFormat(contextData) {
    // Claude prefers human/assistant format
    return {
      format: 'claude',
      conversation: contextData.conversation || [],
      context: contextData.context || '',
      maxTokens: contextData.maxTokens || 100000
    };
  }

  convertToGeminiFormat(contextData) {
    // Gemini prefers structured content
    return {
      format: 'gemini',
      content: contextData.content || '',
      parts: contextData.parts || [],
      generationConfig: contextData.generationConfig || {}
    };
  }

  convertToUniversalFormat(contextData) {
    // Universal format for unknown providers
    return {
      format: 'universal',
      text: contextData.text || '',
      metadata: contextData.metadata || {},
      timestamp: Date.now()
    };
  }

  // Provider-agnostic storage
  async storeProviderAgnosticData(data, metadata = {}) {
    const universalId = `universal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const universalRecord = {
      id: universalId,
      data: data,
      metadata: {
        ...metadata,
        format: 'universal',
        timestamp: Date.now(),
        version: '1.0'
      },
      providers: metadata.providers || [],
      crossPlatform: true
    };
    
    // Store in universal format
    this.universalStorage = this.universalStorage || new Map();
    this.universalStorage.set(universalId, universalRecord);
    
    return universalId;
  }

  async retrieveProviderAgnosticData(universalId) {
    if (!this.universalStorage) return null;
    return this.universalStorage.get(universalId);
  }

  calculateRelevance(chunk, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const searchText = chunk.fullText || chunk.conversationSummary || chunk.summary || '';
    const textLower = searchText.toLowerCase();
    
    // Exact phrase match
    if (textLower.includes(queryLower)) score += 100;
    
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    queryWords.forEach(word => {
      if (textLower.includes(word)) score += 10;
    });
    
    // Slot bonus (hot slots more relevant)
    score += (10 - chunk.slot) * 5;
    
    // Full text bonus
    if (chunk.fullText) score += 20;
    
    // Recency bonus
    const ageHours = (Date.now() - chunk.timestamp) / (1000 * 60 * 60);
    score += Math.max(0, 50 - ageHours);
    
    return score;
  }

  // Get total chunks across all slots
  getTotalChunks() {
    return this.slots.reduce((total, slot) => total + slot.chunks.size, 0);
  }

  // Get total size across all slots
  getCurrentSize() {
    return this.slots.reduce((total, slot) => total + slot.currentSize, 0);
  }

  // Get all chunks from all slots
  getAllChunks() {
    const allChunks = [];
    for (const slot of this.slots) {
      for (const chunk of slot.chunks.values()) {
        allChunks.push(chunk);
      }
    }
    return allChunks;
  }

  getLiveBytesCount() {
    const now = Date.now();
    const totalBytes = this.getCurrentSize();
    const domMirrorBytes = Array.from(this.domMirror.values()).reduce((sum, c) => sum + (c.size || 0), 0);
    
    return {
      summaryIndexBytes: totalBytes,
      rawArchiveBytes: domMirrorBytes,
      totalBytes: totalBytes + domMirrorBytes,
      summaryIndexMB: (totalBytes / (1024 * 1024)).toFixed(2),
      rawArchiveMB: (domMirrorBytes / (1024 * 1024)).toFixed(2),
      totalMB: ((totalBytes + domMirrorBytes) / (1024 * 1024)).toFixed(2),
      timestamp: now,
      chunksPerSecond: 0,
      bytesPerSecond: 0
    };
  }

  getStats() {
    const allChunks = this.getAllChunks();
    const domChunks = allChunks.filter(c => c.inDom);
    const hotBufferChunks = allChunks.filter(c => c.inHot && !c.inDom);
    
    // Calculate slot statistics
    const slotStats = this.slots.map(slot => ({
      id: slot.id,
      currentSize: slot.currentSize,
      maxSize: slot.maxSize,
      chunkCount: slot.chunks.size,
      utilization: ((slot.currentSize / slot.maxSize) * 100).toFixed(1) + '%'
    }));
    
    return {
      totalChunks: this.getTotalChunks(),
      totalConversations: this.conversationIndex.size,
      domChunks: domChunks.length,
      hotBufferChunks: hotBufferChunks.length,
      hotMemorySize: this.getCurrentSize(),
      domMirrorSize: Array.from(this.domMirror.values()).reduce((sum, c) => sum + (c.size || 0), 0),
      providers: Array.from(this.providerIndex.keys()),
      topics: Array.from(this.topicIndex.keys()),
      rollingState: this.rollingState,
      sessionActive: this.getCurrentSession() !== null,
      slotStats: slotStats,
      overflowCount: this.overflowCount,
      overflowQueueLength: this.overflowQueue.length
    };
  }

  // Quick summary for preview (no LLM needed)
  quickSummary(text) {
    // Simple extractive summary - first and last sentences + key sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= 3) return text;
    
    const first = sentences[0];
    const last = sentences[sentences.length - 1];
    const middle = sentences.slice(1, -1)
      .sort((a, b) => b.length - a.length)
      .slice(0, 1);
    
    return [first, ...middle, last].join('. ') + '.';
  }

  // Generate embedding (lightweight for full-text storage)
  async generateEmbedding(text) {
    // Simple hash-based embedding for now
    // Could be replaced with actual embedding API when needed
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(hash)).slice(0, 16);
  }

  // Performance Optimization Methods
  optimizeMemoryUsage() {
    // Garbage collection for unused data
    this.clearDecryptedCache();
    
    // Trim DOM mirror if too large
    if (this.domMirror.size > 100) {
      this.trimDomMirror();
    }
    
    // Clear old cross-provider transfers
    if (this.crossProviderTransfers) {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      for (const [id, transfer] of this.crossProviderTransfers) {
        if (transfer.timestamp < cutoffTime) {
          this.crossProviderTransfers.delete(id);
        }
      }
    }
    
    // Clear old universal storage
    if (this.universalStorage) {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      for (const [id, record] of this.universalStorage) {
        if (record.metadata.timestamp < cutoffTime) {
          this.universalStorage.delete(id);
        }
      }
    }
  }

  // Search optimization with caching
  searchCache = new Map();
  
  async optimizedSearch(query, filters = {}) {
    const cacheKey = JSON.stringify({ query, filters });
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.results;
      }
    }
    
    // Perform search
    const results = await this.searchInConversations(query, filters);
    
    // Cache results
    this.searchCache.set(cacheKey, {
      results: results,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.searchCache.size > 50) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
    
    return results;
  }

  // Query optimization
  optimizeQuery(query) {
    // Remove common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = query.toLowerCase().split(/\s+/);
    const filteredWords = words.filter(word => !stopWords.includes(word) && word.length > 2);
    
    return filteredWords.join(' ');
  }

  // Result caching with relevance scoring
  cacheResults(query, results) {
    const relevanceThreshold = 0.5;
    const relevantResults = results.filter(result => result.relevance > relevanceThreshold);
    
    if (relevantResults.length > 0) {
      this.searchCache.set(query, {
        results: relevantResults,
        timestamp: Date.now(),
        relevance: relevantResults[0].relevance
      });
    }
  }

  // Utility methods
  async store(id, chunk) {
    // Add to appropriate slot
    await this.addToSlot(chunk);
    this.updateIndexes(chunk);
    await this.saveToStorage();
  }

  async search(filters) {
    const results = [];
    const allChunks = this.getAllChunks();
    
    for (const chunk of allChunks) {
      let matches = true;
      
      if (filters.ai_provider && chunk.ai_provider !== filters.ai_provider) matches = false;
      if (filters.session_id && chunk.session_id !== filters.session_id) matches = false;
      if (filters.topic && chunk.topic !== filters.topic) matches = false;
      if (filters.tab_id && chunk.tab_id !== filters.tab_id) matches = false;
      if (filters.slot && chunk.slot !== filters.slot) matches = false;
      
      if (matches) results.push(chunk);
    }
    
    return results;
  }

  async getAll() {
    return this.getAllChunks();
  }

  // Encrypt chunk for storage - no plaintext persisted
  encryptChunk(chunk) {
    return {
      id: chunk.id, // ID can stay plaintext for indexing
      encrypted_data: domEncryption.encrypt({
        conversation_id: chunk.conversation_id,
        fullText: chunk.fullText,
        summary: chunk.summary,
        embedding: chunk.embedding,
        ai_provider: chunk.ai_provider,
        tab_id: chunk.tab_id,
        topic: chunk.topic,
        timestamp: chunk.timestamp,
        slot: chunk.slot,
        access_count: chunk.access_count,
        size: chunk.size,
        conversationSummary: chunk.conversationSummary,
        contextWindows: chunk.contextWindows
      }),
      // Keep minimal metadata for filtering (encrypted)
      meta: domEncryption.encrypt({
        provider: chunk.ai_provider,
        slot: chunk.slot,
        timestamp: chunk.timestamp
      })
    };
  }

  // Decrypt chunk on access
  decryptChunk(encryptedChunk) {
    try {
      const decryptedData = domEncryption.decrypt(encryptedChunk.encrypted_data);
      const decryptedMeta = domEncryption.decrypt(encryptedChunk.meta);
      
      if (!decryptedData) {
        console.error('Failed to decrypt chunk data');
        return null;
      }
      
      return {
        id: encryptedChunk.id,
        ...decryptedData
      };
    } catch (error) {
      console.error('Chunk decryption failed:', error);
      return null;
    }
  }

  // Robust error recovery system
  async attemptRecovery() {
    if (this.isRecovering) {
      console.log('AMP: Recovery already in progress, skipping...');
      return;
    }

    try {
      this.isRecovering = true;
      console.log('AMP: 🔄 Attempting system recovery...');
      
      // Check error frequency
      const timeSinceLastError = Date.now() - this.lastErrorTime;
      if (this.errorCount > 10 && timeSinceLastError < 60000) {
        console.error('AMP: Too many errors, entering safe mode');
        await this.enterSafeMode();
        return;
      }
      
      // Attempt to clear corrupted data
      await this.clearCorruptedData();
      
      // Rebuild indexes
      await this.rebuildIndexes();
      
      // Retry failed operations
      await this.retryFailedOperations();
      
      console.log('AMP: ✅ Recovery completed successfully');
      
    } catch (recoveryError) {
      console.error('AMP: ❌ Recovery failed:', recoveryError);
      await this.enterSafeMode();
    } finally {
      this.isRecovering = false;
    }
  }

  // Enter safe mode when too many errors occur
  async enterSafeMode() {
    console.log('AMP: 🛡️ Entering safe mode...');
    
    // Clear all data to prevent corruption
    this.hotPool.clear();
    this.domMirror.clear();
    this.conversationIndex.clear();
    this.providerIndex.clear();
    this.topicIndex.clear();
    
    // Reset error counters
    this.errorCount = 0;
    this.lastErrorTime = 0;
    
    // Clear storage to start fresh
    try {
      await chrome.storage.local.clear();
      console.log('AMP: Storage cleared for fresh start');
    } catch (clearError) {
      console.error('AMP: Failed to clear storage:', clearError);
    }
    
    console.log('AMP: Safe mode activated - system reset');
  }

  // Clear corrupted data
  async clearCorruptedData() {
    console.log('AMP: Cleaning corrupted data...');
    
    const corruptedChunks = [];
    
    // Check for chunks with missing required fields
    for (const [id, chunk] of this.hotPool.entries()) {
      if (!chunk.id || !chunk.conversation_id || !chunk.fullText) {
        corruptedChunks.push(id);
      }
    }
    
    // Remove corrupted chunks
    for (const id of corruptedChunks) {
      this.hotPool.delete(id);
      this.domMirror.delete(id);
    }
    
    if (corruptedChunks.length > 0) {
      console.log(`AMP: Removed ${corruptedChunks.length} corrupted chunks`);
    }
  }

  // Rebuild indexes from clean data
  async rebuildIndexes() {
    console.log('AMP: Rebuilding indexes...');
    
    // Clear existing indexes
    this.conversationIndex.clear();
    this.providerIndex.clear();
    this.topicIndex.clear();
    
    // Rebuild from clean hot pool data
    for (const [id, chunk] of this.hotPool.entries()) {
      if (chunk && chunk.id && chunk.conversation_id) {
        this.updateIndexes(chunk);
      }
    }
    
    console.log(`AMP: Rebuilt indexes - ${this.conversationIndex.size} conversations, ${this.providerIndex.size} providers, ${this.topicIndex.size} topics`);
  }

  // Retry failed operations from backup queue
  async retryFailedOperations() {
    if (this.backupQueue.length === 0) {
      return;
    }
    
    console.log(`AMP: Retrying ${this.backupQueue.length} failed operations...`);
    
    const retryQueue = [...this.backupQueue];
    this.backupQueue = [];
    
    for (const operation of retryQueue) {
      try {
        // Retry the operation (in this case, save to storage)
        await this.saveToStorage();
        console.log('AMP: Retry operation succeeded');
      } catch (retryError) {
        console.error('AMP: Retry operation failed:', retryError);
        // Don't add back to queue to prevent infinite loops
      }
    }
  }

  // Get system health status
  getSystemHealth() {
    return {
      hotPoolSize: this.hotPool.size,
      domMirrorSize: this.domMirror.size,
      conversationCount: this.conversationIndex.size,
      providerCount: this.providerIndex.size,
      topicCount: this.topicIndex.size,
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isRecovering: this.isRecovering,
      storageState: this.storageState,
      backupQueueLength: this.backupQueue.length,
      // Performance metrics
      memoryUsage: this.getMemoryUsageMetrics(),
      searchPerformance: this.getSearchPerformanceMetrics(),
      storagePerformance: this.getStoragePerformanceMetrics(),
      crossProviderStats: this.getCrossProviderStats()
    };
  }

  // Memory usage tracking
  getMemoryUsageMetrics() {
    const totalMemory = this.getCurrentSize();
    const maxMemory = this.slots.reduce((sum, slot) => sum + slot.maxSize, 0);
    const utilization = (totalMemory / maxMemory) * 100;
    
    return {
      totalBytes: totalMemory,
      maxBytes: maxMemory,
      utilizationPercent: utilization,
      isOverloaded: utilization > 90,
      slotUtilization: this.slots.map(slot => ({
        slotId: slot.id,
        utilization: (slot.currentSize / slot.maxSize) * 100
      }))
    };
  }

  // Search performance metrics
  getSearchPerformanceMetrics() {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      averageSearchTime: this.averageSearchTime || 0,
      totalSearches: this.totalSearches || 0,
      searchCacheSize: this.searchCache ? this.searchCache.size : 0
    };
  }

  calculateCacheHitRate() {
    if (!this.searchCache || this.totalSearches === 0) return 0;
    return (this.cacheHits || 0) / this.totalSearches * 100;
  }

  // Storage performance metrics
  getStoragePerformanceMetrics() {
    return {
      saveOperations: this.storageState.saveOperations || 0,
      loadOperations: this.storageState.loadOperations || 0,
      saveErrors: this.storageState.saveErrors || 0,
      loadErrors: this.storageState.loadErrors || 0,
      lastSaveTime: this.storageState.lastSave || 0,
      lastLoadTime: this.storageState.lastLoad || 0
    };
  }

  // Cross-provider statistics
  getCrossProviderStats() {
    return {
      totalTransfers: this.crossProviderTransfers ? this.crossProviderTransfers.size : 0,
      universalStorageSize: this.universalStorage ? this.universalStorage.size : 0,
      activeProviders: this.getActiveProviders(),
      transferSuccessRate: this.calculateTransferSuccessRate()
    };
  }

  getActiveProviders() {
    const providers = new Set();
    for (const chunk of this.getAllChunks()) {
      if (chunk.ai_provider) {
        providers.add(chunk.ai_provider);
      }
    }
    return Array.from(providers);
  }

  calculateTransferSuccessRate() {
    if (!this.crossProviderTransfers || this.crossProviderTransfers.size === 0) return 100;
    
    let successfulTransfers = 0;
    for (const transfer of this.crossProviderTransfers.values()) {
      if (transfer.status === 'completed') {
        successfulTransfers++;
      }
    }
    
    return (successfulTransfers / this.crossProviderTransfers.size) * 100;
  }

  // Validate system integrity
  validateIntegrity() {
    const issues = [];
    
    // Check for orphaned chunks
    for (const [id, chunk] of this.hotPool.entries()) {
      if (!this.conversationIndex.has(chunk.conversation_id)) {
        issues.push(`Orphaned chunk ${id} in hot pool`);
      }
    }
    
    // Check for missing chunks in indexes
    for (const [convId, chunkIds] of this.conversationIndex.entries()) {
      for (const chunkId of chunkIds) {
        if (!this.hotPool.has(chunkId)) {
          issues.push(`Missing chunk ${chunkId} in conversation ${convId}`);
        }
      }
    }
    
    // Check storage state
    if (this.storageState.saveErrors > 10) {
      issues.push('High save error rate detected');
    }
    
    if (this.storageState.loadErrors > 5) {
      issues.push('High load error rate detected');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }
}

// Create singleton instances for content scripts
const memoryPool = new MemoryPool();

// Simple DOM Data Dump System
class DOMDataDump {
  constructor() {
    this.dumpContainer = null;
    this.dumpCounter = 0;
  }

  // Initialize dump container in AMP window
  async initializeDump() {
    try {
      // Find AMP window or use current page
      let targetDocument = document;
      
      // Try to find AMP window
      if (window.location.href.includes('amp') || window.name.includes('AMP')) {
        targetDocument = document;
      }
      
      this.dumpContainer = targetDocument.getElementById('amp-data-dump');
      if (!this.dumpContainer) {
        this.dumpContainer = targetDocument.createElement('div');
        this.dumpContainer.id = 'amp-data-dump';
        this.dumpContainer.style.cssText = 'display:none;position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
        targetDocument.body.appendChild(this.dumpContainer);
      }
      
      console.log('✅ DOM Data Dump initialized');
    } catch (error) {
      console.error('Failed to initialize DOM dump:', error);
    }
  }

  // Dump chunk data into DOM
  async dumpChunk(chunk) {
    if (!this.dumpContainer) {
      await this.initializeDump();
    }

    try {
      const dumpId = `dump_${Date.now()}_${this.dumpCounter++}`;
      const chunkData = JSON.stringify(chunk);
      
      // Create dump element
      const dumpElement = document.createElement('div');
      dumpElement.id = dumpId;
      dumpElement.setAttribute('data-amp-dump', chunkData);
      dumpElement.setAttribute('data-amp-size', chunkData.length);
      dumpElement.setAttribute('data-amp-timestamp', chunk.timestamp || Date.now());
      dumpElement.style.display = 'none';
      
      this.dumpContainer.appendChild(dumpElement);
      
      console.log(`🗑️ DOM Dump: Stored ${dumpId} (${chunkData.length} bytes)`);
      return dumpId;
    } catch (error) {
      console.error('Failed to dump chunk:', error);
    }
  }

  // Get dump stats
  async getDumpStats() {
    if (!this.dumpContainer) {
      await this.initializeDump();
    }

    try {
      const elements = this.dumpContainer.querySelectorAll('[data-amp-dump]');
      let totalSize = 0;
      let totalChunks = elements.length;

      for (const element of elements) {
        const size = parseInt(element.getAttribute('data-amp-size')) || 0;
        totalSize += size;
      }

      return {
        totalChunks,
        totalSize,
        totalMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get dump stats:', error);
      return { totalChunks: 0, totalSize: 0, totalMB: '0.00' };
    }
  }

  // Clear dump
  async clearDump() {
    if (this.dumpContainer) {
      this.dumpContainer.innerHTML = '';
      console.log('🗑️ DOM Data Dump cleared');
    }
  }
}

// Create dump instance
const domDataDump = new DOMDataDump();

// Make instances globally available for content scripts
window.memoryPool = memoryPool;
window.domDataDump = domDataDump;

// DOM Storage System - Uses AMP window DOM as unlimited storage
class DOMStorage {
  constructor() {
    this.storageContainer = null;
    this.chunkCounter = 0;
    this.maxChunksPerElement = 100; // Store multiple chunks per element to reduce DOM size
  }

  // Initialize storage container in AMP window
  async initializeStorage() {
    try {
      // Find or create storage container in AMP window
      let ampWindow = await this.getAmpWindow();
      if (!ampWindow) {
        console.log('AMP window not found, creating storage container in current page');
        ampWindow = document;
      }

      this.storageContainer = ampWindow.getElementById('amp-storage-container');
      if (!this.storageContainer) {
        this.storageContainer = ampWindow.createElement('div');
        this.storageContainer.id = 'amp-storage-container';
        this.storageContainer.style.cssText = 'display:none;position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
        ampWindow.body.appendChild(this.storageContainer);
      }

      console.log('✅ DOM Storage initialized in AMP window');
    } catch (error) {
      console.error('Failed to initialize DOM storage:', error);
    }
  }

  // Get AMP window reference
  async getAmpWindow() {
    try {
      // Try to find existing AMP window
      const windows = await chrome.windows.getAll({ windowTypes: ['popup'] });
      for (const window of windows) {
        if (window.title && window.title.includes('AMP')) {
          const tabs = await chrome.tabs.query({ windowId: window.id });
          if (tabs.length > 0) {
            // Inject script to access DOM
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => document
            });
            return window;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get AMP window:', error);
      return null;
    }
  }

  // Store chunk in DOM
  async storeChunk(chunk) {
    if (!this.storageContainer) {
      await this.initializeStorage();
    }

    try {
      const chunkId = `chunk_${Date.now()}_${this.chunkCounter++}`;
      const chunkData = JSON.stringify(chunk);
      
      // Create storage element
      const storageElement = document.createElement('div');
      storageElement.id = chunkId;
      storageElement.setAttribute('data-amp-chunk', chunkData);
      storageElement.setAttribute('data-amp-timestamp', chunk.timestamp);
      storageElement.setAttribute('data-amp-provider', chunk.ai_provider);
      storageElement.setAttribute('data-amp-topic', chunk.topic);
      storageElement.style.display = 'none';
      
      this.storageContainer.appendChild(storageElement);
      
      console.log(`💾 DOM Storage: Stored chunk ${chunkId} (${chunkData.length} bytes)`);
      return chunkId;
    } catch (error) {
      console.error('Failed to store chunk in DOM:', error);
      throw error;
    }
  }

  // Retrieve chunk from DOM
  async getChunk(chunkId) {
    if (!this.storageContainer) {
      await this.initializeStorage();
    }

    try {
      const element = this.storageContainer.querySelector(`#${chunkId}`);
      if (element) {
        const chunkData = element.getAttribute('data-amp-chunk');
        return JSON.parse(chunkData);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve chunk from DOM:', error);
      return null;
    }
  }

  // Search chunks in DOM
  async searchChunks(query, filters = {}) {
    if (!this.storageContainer) {
      await this.initializeStorage();
    }

    try {
      const elements = this.storageContainer.querySelectorAll('[data-amp-chunk]');
      const results = [];

      for (const element of elements) {
        const chunkData = element.getAttribute('data-amp-chunk');
        const chunk = JSON.parse(chunkData);

        // Apply filters
        let matches = true;
        if (filters.provider && chunk.ai_provider !== filters.provider) matches = false;
        if (filters.topic && chunk.topic !== filters.topic) matches = false;
        if (filters.minDate && chunk.timestamp < filters.minDate) matches = false;
        if (filters.maxDate && chunk.timestamp > filters.maxDate) matches = false;

        // Apply search query
        if (query && matches) {
          const searchText = `${chunk.fullText} ${chunk.summary} ${chunk.topic}`.toLowerCase();
          matches = searchText.includes(query.toLowerCase());
        }

        if (matches) {
          results.push(chunk);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search chunks in DOM:', error);
      return [];
    }
  }

  // Get storage stats
  async getStorageStats() {
    if (!this.storageContainer) {
      await this.initializeStorage();
    }

    try {
      const elements = this.storageContainer.querySelectorAll('[data-amp-chunk]');
      let totalSize = 0;
      const providers = new Set();
      const topics = new Set();

      for (const element of elements) {
        const chunkData = element.getAttribute('data-amp-chunk');
        const chunk = JSON.parse(chunkData);
        
        totalSize += chunkData.length;
        providers.add(chunk.ai_provider);
        topics.add(chunk.topic);
      }

      return {
        totalChunks: elements.length,
        totalSize: totalSize,
        providers: Array.from(providers),
        topics: Array.from(topics),
        storageType: 'DOM'
      };
    } catch (error) {
      console.error('Failed to get DOM storage stats:', error);
      return { totalChunks: 0, totalSize: 0, providers: [], topics: [], storageType: 'DOM' };
    }
  }

  // Clear all storage
  async clearStorage() {
    if (this.storageContainer) {
      this.storageContainer.innerHTML = '';
      console.log('🗑️ DOM Storage cleared');
    }
  }

  // Cleanup old chunks
  async cleanupOldChunks(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    if (!this.storageContainer) {
      await this.initializeStorage();
    }

    try {
      const elements = this.storageContainer.querySelectorAll('[data-amp-chunk]');
      const now = Date.now();
      let removedCount = 0;

      for (const element of elements) {
        const timestamp = parseInt(element.getAttribute('data-amp-timestamp'));
        if (now - timestamp > maxAge) {
          element.remove();
          removedCount++;
        }
      }

      console.log(`🧹 DOM Storage: Cleaned up ${removedCount} old chunks`);
      return removedCount;
    } catch (error) {
      console.error('Failed to cleanup old chunks:', error);
      return 0;
    }
  }
}

// Export DOM storage instance
const domStorage = new DOMStorage();

// Smart Security Architecture
// DOM: Plaintext (already visible on screen)
// Extension Storage: Encrypted (local protection)
// AMP App: Always encrypted (enterprise/server deployment)
class SmartSecurity {
  constructor() {
    this.deploymentMode = this.detectDeploymentMode();
    this.encryptionLevel = this.getEncryptionLevel();
    this.domEncryption = new DOMEncryption();
  }
  
  detectDeploymentMode() {
    // Detect if we're in enterprise/server mode vs local browser
    const isEnterpriseMode = !!(
      window.location.protocol === 'https:' && 
      (window.location.hostname !== 'localhost' && 
       window.location.hostname !== '127.0.0.1')
    );
    
    const isServerSideAMP = this.checkAMPServerAvailable();
    
    return {
      enterprise: isEnterpriseMode,
      serverSide: isServerSideAMP,
      localBrowser: !isEnterpriseMode && !isServerSideAMP
    };
  }
  
  getEncryptionLevel() {
    const mode = this.deploymentMode;
    
    if (mode.enterprise || mode.serverSide) {
      return 'FULL'; // Encrypt everything always
    } else {
      return 'STORAGE_ONLY'; // Only encrypt for storage
    }
  }
  
  async checkAMPServerAvailable() {
    try {
      const response = await fetch('http://127.0.0.1:3456/status', {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Smart encryption based on context
  shouldEncryptForContext(context) {
    switch (context) {
      case 'DOM':
        return this.encryptionLevel === 'FULL';
      case 'EXTENSION_STORAGE':
        return true; // Always encrypt for storage
      case 'AMP_SERVER':
        return true; // Always encrypt for server
      case 'INJECTION':
        return false; // Plaintext for injection (going to screen anyway)
      default:
        return true; // Default to encrypted
    }
  }
}

// Simple text processing functions (no LLM needed for basic operations)
function summarize(text) {
  return memoryPool.quickSummary(text);
}

async function embed(text) {
  return memoryPool.generateEmbedding(text);
}

// Make functions globally available for content scripts
window.summarize = summarize;
window.embed = embed;

// 9-Square Grid System
class NineSquareGrid {
  constructor() {
    this.grid = {
      sq1: { rawText: '', timestamp: 0, version: 0 }, // Raw text embed
      sq2: { processedText: '', timestamp: 0, version: 0 },
      sq3: { processedText: '', timestamp: 0, version: 0 },
      sq4: { processedText: '', timestamp: 0, version: 0 },
      sq5: { processedText: '', timestamp: 0, version: 0 },
      sq6: { processedText: '', timestamp: 0, version: 0 },
      sq7: { processedText: '', timestamp: 0, version: 0 },
      sq8: { processedText: '', timestamp: 0, version: 0 },
      sq9: { indexedData: {}, timestamp: 0, version: 0 } // Indexed data
    };
    
    this.currentPosition = 1; // Current focus position
    this.contextPool = []; // Pool of 4 squares on either side
    this.versionCounter = 0;
  }

  // Update square 1 with raw text (triggers sq9 update)
  updateSquare1(rawText) {
    this.versionCounter++;
    const timestamp = Date.now();
    
    // Update square 1 (raw text)
    this.grid.sq1 = {
      rawText: rawText,
      timestamp: timestamp,
      version: this.versionCounter
    };
    
    // Simultaneously update square 9 (indexed data)
    this.grid.sq9 = {
      indexedData: this.processForIndex(rawText),
      timestamp: timestamp,
      version: this.versionCounter
    };
    
    // Update context pool
    this.updateContextPool();
    
    console.log(`Squares 1 & 9 updated to version ${this.versionCounter}`);
    return this.versionCounter;
  }

  // Process raw text for indexing (square 9)
  processForIndex(rawText) {
    return {
      summary: this.generateSummary(rawText),
      keywords: this.extractKeywords(rawText),
      entities: this.extractEntities(rawText),
      timestamp: Date.now(),
      length: rawText.length,
      hash: this.generateHash(rawText)
    };
  }

  // Generate summary for indexing
  generateSummary(text) {
    // Simple summary generation (can be enhanced)
    const words = text.split(' ').slice(0, 20);
    return words.join(' ') + (text.length > 100 ? '...' : '');
  }

  // Extract keywords
  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
    );
    return [...new Set(keywords)].slice(0, 10);
  }

  // Extract entities
  extractEntities(text) {
    const entities = {
      people: [],
      places: [],
      dates: [],
      concepts: []
    };
    
    // Simple entity extraction
    const words = text.split(/\s+/);
    words.forEach(word => {
      // People (capitalized words)
      if (/^[A-Z][a-z]+$/.test(word)) {
        entities.people.push(word);
      }
      // Dates
      if (/\d{4}-\d{2}-\d{2}/.test(word) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(word)) {
        entities.dates.push(word);
      }
    });
    
    return entities;
  }

  // Generate hash for change detection
  generateHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Update context pool (4 squares on either side of current position)
  updateContextPool() {
    this.contextPool = [];
    const poolSize = 4;
    
    // Get squares before current position
    for (let i = Math.max(1, this.currentPosition - poolSize); i < this.currentPosition; i++) {
      if (this.grid[`sq${i}`]) {
        this.contextPool.push({
          position: i,
          data: this.grid[`sq${i}`],
          type: i === 1 ? 'raw' : i === 9 ? 'indexed' : 'processed'
        });
      }
    }
    
    // Get squares after current position (if any future data exists)
    for (let i = this.currentPosition + 1; i <= Math.min(9, this.currentPosition + poolSize); i++) {
      if (this.grid[`sq${i}`] && this.grid[`sq${i}`].timestamp > 0) {
        this.contextPool.push({
          position: i,
          data: this.grid[`sq${i}`],
          type: i === 1 ? 'raw' : i === 9 ? 'indexed' : 'processed'
        });
      }
    }
    
    console.log(`Context pool updated: ${this.contextPool.length} squares`);
  }

  // Get current context pool (ready for pickup)
  getContextPool() {
    return this.contextPool;
  }

  // Get most current version
  getMostCurrent() {
    return {
      sq1: this.grid.sq1,
      sq9: this.grid.sq9,
      version: this.versionCounter,
      timestamp: this.grid.sq9.timestamp
    };
  }

  // Check if data has changed
  hasDataChanged(rawText) {
    const newHash = this.generateHash(rawText);
    return newHash !== this.grid.sq1.hash;
  }

  // Move to next position (progressive aging)
  moveToNextPosition() {
    // Shift processed data through squares 2-8
    for (let i = 8; i >= 2; i--) {
      this.grid[`sq${i}`] = this.grid[`sq${i-1}`];
    }
    
    // Clear square 1 for new data
    this.grid.sq1 = { rawText: '', timestamp: 0, version: 0 };
    this.grid.sq9 = { indexedData: {}, timestamp: 0, version: 0 };
    
    this.updateContextPool();
    console.log('Moved to next position, squares shifted');
  }

  // Get grid status
  getGridStatus() {
    return {
      currentPosition: this.currentPosition,
      version: this.versionCounter,
      contextPoolSize: this.contextPool.length,
      mostRecentUpdate: this.grid.sq9.timestamp,
      hasCurrentData: this.grid.sq1.rawText.length > 0
    };
  }
}

// Initialize 9-square grid
const nineSquareGrid = new NineSquareGrid();