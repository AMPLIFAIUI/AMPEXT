// © 2025 AMPIQ All rights reserved.

const fs = require('fs').promises;
const path = require('path');
const processor = require('./processor');
const { loadConfig } = require('./utils');

class ChunkManager {
  constructor() {
    this.config = loadConfig();
    this.memoryPool = new Map(); // id -> chunk data
    this.slotStats = new Array(this.config.vault?.maxSlots || 9).fill(0);
    this.initialized = false;
    
    this.init();
  }

  async init() {
    try {
      await this.loadFromDisk();
      this.initialized = true;
      console.log('ChunkManager initialized with', this.memoryPool.size, 'chunks');
    } catch (error) {
      console.error('ChunkManager initialization failed:', error);
    }
  }

  async store(id, chunk) {
    try {
      // Validate chunk data
      const validatedChunk = this.validateChunk(chunk);
      
      // If chunk already exists, update it and potentially promote
      if (this.memoryPool.has(id)) {
        const existingChunk = this.memoryPool.get(id);
        const updatedChunk = {
          ...existingChunk,
          ...validatedChunk,
          timestamp: Date.now(), // Update timestamp
          access_count: (existingChunk.access_count || 0) + 1
        };
        
        // Promote to hotter slot if frequently accessed
        if (updatedChunk.access_count > 3 && updatedChunk.slot > 1) {
          updatedChunk.slot = Math.max(1, updatedChunk.slot - 1);
        }
        
        this.memoryPool.set(id, updatedChunk);
    } else {
        // New chunk starts in slot 1 (hottest)
        const newChunk = {
          ...validatedChunk,
          id,
          access_count: 1,
          created_at: Date.now(),
          updated_at: Date.now()
        };
        
        this.memoryPool.set(id, newChunk);
      }
      
      // Update slot statistics
      this.updateSlotStats();
      
      // Periodically promote slots
      await this.promoteSlots();
      
      // Save to disk
      await this.saveToDisk();
      
      return this.memoryPool.get(id);
      
    } catch (error) {
      console.error('Failed to store chunk:', error);
      throw error;
    }
  }

  validateChunk(chunk) {
    const requiredFields = ['ai_provider', 'timestamp'];
    
    for (const field of requiredFields) {
      if (chunk[field] === undefined || chunk[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return {
      id: chunk.id,
      content: chunk.content || '',
      summary: chunk.summary || chunk.content || '',
      embedding: chunk.embedding || null,
      ai_provider: chunk.ai_provider,
      tab_id: chunk.tab_id || 'unknown',
      session_id: chunk.session_id || `${chunk.ai_provider}-${Date.now()}`,
      topic: chunk.topic || 'default',
      timestamp: chunk.timestamp,
      slot: chunk.slot || 1
    };
  }

  async promoteSlots() {
    const maxSlots = this.config.vault?.maxSlots || 9;
    const currentTime = Date.now();
    const promotionInterval = 60000; // 1 minute
    
    for (const [id, chunk] of this.memoryPool) {
      const timeSinceUpdate = currentTime - (chunk.updated_at || chunk.timestamp);
      
      // Promote to colder slots over time if not accessed
      if (timeSinceUpdate > promotionInterval && chunk.slot < maxSlots) {
        chunk.slot = Math.min(maxSlots, chunk.slot + 1);
        chunk.updated_at = currentTime;
        
        // Compress content when reaching final slot
        if (chunk.slot === maxSlots && chunk.content && !chunk.compressed) {
          try {
            chunk.summary = await processor.summarize(chunk.content);
            chunk.content = ''; // Clear full content to save space
            chunk.compressed = true;
          } catch (error) {
            console.error('Failed to compress chunk:', error);
          }
        }
      }
    }
    
    this.updateSlotStats();
  }

  updateSlotStats() {
    const maxSlots = this.config.vault?.maxSlots || 9;
    this.slotStats = new Array(maxSlots).fill(0);
    
    for (const chunk of this.memoryPool.values()) {
      if (chunk.slot >= 1 && chunk.slot <= maxSlots) {
        this.slotStats[chunk.slot - 1]++;
      }
    }
  }

  async search(filters, limit = 50) {
    const results = [];
    
    for (const chunk of this.memoryPool.values()) {
      let matches = true;
      
      // Apply filters
      if (filters.ai_provider && chunk.ai_provider !== filters.ai_provider) {
        matches = false;
      }
      if (filters.session_id && chunk.session_id !== filters.session_id) {
        matches = false;
      }
      if (filters.topic && chunk.topic !== filters.topic) {
        matches = false;
      }
      if (filters.tab_id && chunk.tab_id !== filters.tab_id) {
        matches = false;
      }
      if (filters.slot && chunk.slot !== filters.slot) {
        matches = false;
      }
      if (filters.min_timestamp && chunk.timestamp < filters.min_timestamp) {
        matches = false;
      }
      if (filters.max_timestamp && chunk.timestamp > filters.max_timestamp) {
        matches = false;
      }
      
      if (matches) {
        results.push(chunk);
      }
      
      if (results.length >= limit) {
        break;
      }
    }
    
    // Sort by relevance (slot, then timestamp)
    return results.sort((a, b) => {
      if (a.slot !== b.slot) {
        return a.slot - b.slot; // Hot slots first
      }
      return b.timestamp - a.timestamp; // Recent first
    });
  }

  async getHotContext(limit = 5, filters = {}) {
    const hotSlots = this.config.vault?.hotSlots || 4;
    const hotFilters = { ...filters, slot: null };
    
    const allResults = await this.search(hotFilters, 100);
    const hotResults = allResults.filter(chunk => chunk.slot <= hotSlots);
    
    return hotResults.slice(0, limit);
  }

  async getColdContext(limit = 3, filters = {}) {
    const hotSlots = this.config.vault?.hotSlots || 4;
    const coldFilters = { ...filters, slot: null };
    
    const allResults = await this.search(coldFilters, 100);
    const coldResults = allResults.filter(chunk => chunk.slot > hotSlots);
    
    return coldResults.slice(0, limit);
  }

  async searchByQuery(query, filters = {}, limit = 10) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const chunk of this.memoryPool.values()) {
      // Apply filters first
      let matches = true;
      if (filters.ai_provider && chunk.ai_provider !== filters.ai_provider) matches = false;
      if (filters.session_id && chunk.session_id !== filters.session_id) matches = false;
      if (filters.topic && chunk.topic !== filters.topic) matches = false;
      if (filters.tab_id && chunk.tab_id !== filters.tab_id) matches = false;
      
      if (!matches) continue;
      
      // Calculate relevance score
      let score = 0;
      const summary = (chunk.summary || '').toLowerCase();
      const content = (chunk.content || '').toLowerCase();
      
      // Exact matches in summary get highest score
      if (summary.includes(queryLower)) {
        score += 10;
      }
      
      // Exact matches in content
      if (content.includes(queryLower)) {
        score += 5;
      }
      
      // Word matches
      const queryWords = queryLower.split(/\s+/);
      queryWords.forEach(word => {
        if (summary.includes(word)) score += 3;
        if (content.includes(word)) score += 1;
      });
      
      // Boost score for hot slots
      score += (10 - chunk.slot);
      
      if (score > 0) {
        results.push({ ...chunk, relevance_score: score });
      }
    }
    
    // Sort by relevance score and return top results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  async remove(id) {
    const removed = this.memoryPool.delete(id);
    if (removed) {
      this.updateSlotStats();
      await this.saveToDisk();
    }
    return removed;
  }

  async clearAll() {
    this.memoryPool.clear();
    this.slotStats = new Array(this.config.vault?.maxSlots || 9).fill(0);
    await this.saveToDisk();
  }

  async clearByFilters(filters) {
    const toRemove = [];
    
    for (const [id, chunk] of this.memoryPool) {
      let matches = true;
      
      if (filters.ai_provider && chunk.ai_provider !== filters.ai_provider) matches = false;
      if (filters.session_id && chunk.session_id !== filters.session_id) matches = false;
      if (filters.topic && chunk.topic !== filters.topic) matches = false;
      if (filters.tab_id && chunk.tab_id !== filters.tab_id) matches = false;
      if (filters.slot && chunk.slot !== filters.slot) matches = false;
      
      if (matches) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.memoryPool.delete(id);
    }
    
    this.updateSlotStats();
    await this.saveToDisk();
    
    return toRemove.length;
  }

  getStats() {
    const stats = {
      totalChunks: this.memoryPool.size,
      slotDistribution: [...this.slotStats],
      providers: new Set(),
      topics: new Set(),
      sessions: new Set(),
      oldestChunk: null,
      newestChunk: null,
      averageSlot: 0,
      storageSize: 0
    };
    
    let totalSlots = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    
    for (const chunk of this.memoryPool.values()) {
      stats.providers.add(chunk.ai_provider);
      stats.topics.add(chunk.topic);
      stats.sessions.add(chunk.session_id);
      
      totalSlots += chunk.slot;
      
      if (chunk.timestamp < oldestTime) {
        oldestTime = chunk.timestamp;
        stats.oldestChunk = chunk.timestamp;
      }
      
      if (chunk.timestamp > newestTime) {
        newestTime = chunk.timestamp;
        stats.newestChunk = chunk.timestamp;
      }
      
      stats.storageSize += JSON.stringify(chunk).length;
    }
    
    stats.providers = Array.from(stats.providers);
    stats.topics = Array.from(stats.topics);
    stats.sessions = Array.from(stats.sessions);
    stats.averageSlot = this.memoryPool.size > 0 ? totalSlots / this.memoryPool.size : 0;
    
    return stats;
  }

  async getAll() {
    return Array.from(this.memoryPool.values());
  }

  async saveToDisk() {
    try {
      const vaultPath = this.config.vault?.path || './memory_vault';
      await fs.mkdir(path.dirname(vaultPath), { recursive: true });
      
      const data = {
        chunks: Object.fromEntries(this.memoryPool),
        stats: this.getStats(),
        lastUpdated: Date.now()
      };
      
      await fs.writeFile(`${vaultPath}.json`, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save chunks to disk:', error);
    }
  }

  async loadFromDisk() {
    try {
      const vaultPath = this.config.vault?.path || './memory_vault';
      const data = await fs.readFile(`${vaultPath}.json`, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.chunks) {
        this.memoryPool = new Map(Object.entries(parsed.chunks));
        this.updateSlotStats();
        console.log('Loaded', this.memoryPool.size, 'chunks from disk');
      }
    } catch (error) {
      console.log('No existing vault found, starting fresh');
    }
  }

  // Compatibility methods for existing code
  async storeChunks(id, text) {
    const chunk = {
      id,
      content: text,
      summary: await processor.summarize(text),
      embedding: await processor.embed(text),
      ai_provider: 'unknown',
      tab_id: 'unknown',
      session_id: `unknown-${Date.now()}`,
      topic: 'default',
      timestamp: Date.now(),
      slot: 1
    };
    
    return await this.store(id, chunk);
  }

  async retrieveContext(hotN = 3, coldN = 2) {
    const hot = await this.getHotContext(hotN);
    const cold = await this.getColdContext(coldN);
    
    return {
      hot: hot.map(chunk => chunk.summary || chunk.content),
      cold: cold.map(chunk => chunk.summary || chunk.content)
    };
  }

  // Periodic maintenance
  async promoteHotSlots() {
    await this.promoteSlots();
  }
}

module.exports = ChunkManager;