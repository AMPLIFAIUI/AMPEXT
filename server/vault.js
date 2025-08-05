// © 2025 AMPIQ All rights reserved.

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { loadConfig } = require('./utils');

class SecureVault {
  constructor() {
    this.config = loadConfig();
    this.vaultPath = this.config.vault?.path || './memory_bank';
    this.indexPath = path.join(this.vaultPath, 'index.json');
    this.encryptionKey = null;
    this.index = new Map(); // id -> metadata
    
    this.init();
  }

  async init() {
    try {
      await this.ensureVaultDirectory();
      await this.generateEncryptionKey();
      await this.loadIndex();
      console.log('SecureVault initialized with', this.index.size, 'chunks');
    } catch (error) {
      console.error('SecureVault initialization failed:', error);
    }
  }

  async ensureVaultDirectory() {
    try {
      await fs.mkdir(this.vaultPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create vault directory:', error);
    }
  }

  async generateEncryptionKey() {
    const keyPath = path.join(this.vaultPath, '.key');
    
    try {
      // Try to load existing key
      const keyData = await fs.readFile(keyPath);
      this.encryptionKey = keyData;
    } catch (error) {
      // Generate new key if none exists
      this.encryptionKey = crypto.randomBytes(32);
      await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
      console.log('Generated new encryption key');
    }
  }

  async loadIndex() {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(indexData);
      
      this.index = new Map(Object.entries(parsed.chunks || {}));
      console.log('Loaded index with', this.index.size, 'entries');
    } catch (error) {
      console.log('No existing index found, starting fresh');
      this.index = new Map();
    }
  }

  async saveIndex() {
    try {
      const indexData = {
        version: '1.0.0',
        lastUpdated: Date.now(),
        totalChunks: this.index.size,
        chunks: Object.fromEntries(this.index)
      };
      
      await fs.writeFile(this.indexPath, JSON.stringify(indexData, null, 2));
    } catch (error) {
      console.error('Failed to save index:', error);
    }
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      tag: tag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const { iv, encrypted, tag } = encryptedData;
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  async storeChunk(chunk) {
    try {
      // Validate chunk
      if (!chunk.id || !chunk.ai_provider || !chunk.timestamp) {
        throw new Error('Invalid chunk: missing required fields');
      }
      
      // Create filename based on provider and ID
      const filename = this.generateFilename(chunk);
      const filePath = path.join(this.vaultPath, filename);
      
      // Encrypt chunk data
      const encryptedData = this.encrypt(chunk);
      
      // Save encrypted chunk to file
      await fs.writeFile(filePath, JSON.stringify(encryptedData), { mode: 0o600 });
      
      // Update index
      const indexEntry = {
        id: chunk.id,
        filename,
        ai_provider: chunk.ai_provider,
        tab_id: chunk.tab_id,
        session_id: chunk.session_id,
        topic: chunk.topic,
        timestamp: chunk.timestamp,
        slot: chunk.slot,
        size: JSON.stringify(chunk).length,
        created: Date.now()
      };
      
      this.index.set(chunk.id, indexEntry);
      
      // Save index
      await this.saveIndex();
      
      return indexEntry;
      
    } catch (error) {
      console.error('Failed to store chunk:', error);
      throw error;
    }
  }

  async getChunk(id) {
    try {
      const indexEntry = this.index.get(id);
      if (!indexEntry) {
        throw new Error(`Chunk not found: ${id}`);
      }
      
      const filePath = path.join(this.vaultPath, indexEntry.filename);
      const encryptedData = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(encryptedData);
      
      return this.decrypt(parsed);
      
    } catch (error) {
      console.error('Failed to get chunk:', error);
      throw error;
    }
  }

  async getChunks(filters = {}) {
    try {
      let results = [];
      
      for (const [id, indexEntry] of this.index) {
        let matches = true;
        
        // Apply filters
        if (filters.ai_provider && indexEntry.ai_provider !== filters.ai_provider) {
          matches = false;
        }
        if (filters.session_id && indexEntry.session_id !== filters.session_id) {
          matches = false;
        }
        if (filters.topic && indexEntry.topic !== filters.topic) {
          matches = false;
        }
        if (filters.tab_id && indexEntry.tab_id !== filters.tab_id) {
          matches = false;
        }
        if (filters.slot && indexEntry.slot !== filters.slot) {
          matches = false;
        }
        if (filters.min_timestamp && indexEntry.timestamp < filters.min_timestamp) {
          matches = false;
        }
        if (filters.max_timestamp && indexEntry.timestamp > filters.max_timestamp) {
          matches = false;
        }
        
        if (matches) {
          try {
            const chunk = await this.getChunk(id);
            results.push(chunk);
          } catch (error) {
            console.error(`Failed to load chunk ${id}:`, error);
          }
        }
      }
      
      // Sort by slot (hot first), then timestamp (recent first)
      return results.sort((a, b) => {
        if (a.slot !== b.slot) {
          return a.slot - b.slot;
        }
        return b.timestamp - a.timestamp;
      });
      
    } catch (error) {
      console.error('Failed to get chunks:', error);
      throw error;
    }
  }

  async searchChunks(query, filters = {}, limit = 10) {
    try {
      const chunks = await this.getChunks(filters);
      const queryLower = query.toLowerCase();
      const results = [];
      
      for (const chunk of chunks) {
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
        
    } catch (error) {
      console.error('Failed to search chunks:', error);
      throw error;
    }
  }

  async clearChunks(filters = {}) {
    try {
      let cleared = 0;
      const toRemove = [];
      
      for (const [id, indexEntry] of this.index) {
        let matches = true;
        
        // Apply filters
        if (filters.ai_provider && indexEntry.ai_provider !== filters.ai_provider) {
          matches = false;
        }
        if (filters.session_id && indexEntry.session_id !== filters.session_id) {
          matches = false;
        }
        if (filters.topic && indexEntry.topic !== filters.topic) {
          matches = false;
        }
        if (filters.tab_id && indexEntry.tab_id !== filters.tab_id) {
          matches = false;
        }
        if (filters.slot && indexEntry.slot !== filters.slot) {
          matches = false;
        }
        
        if (matches || Object.keys(filters).length === 0) {
          toRemove.push({ id, filename: indexEntry.filename });
}
      }
      
      // Remove files and index entries
      for (const item of toRemove) {
        try {
          const filePath = path.join(this.vaultPath, item.filename);
          await fs.unlink(filePath);
          this.index.delete(item.id);
          cleared++;
        } catch (error) {
          console.error(`Failed to remove chunk ${item.id}:`, error);
        }
      }
      
      // Save updated index
      await this.saveIndex();
      
      return cleared;
      
    } catch (error) {
      console.error('Failed to clear chunks:', error);
      throw error;
    }
  }

  async getStats() {
    const stats = {
      totalChunks: this.index.size,
      providers: new Set(),
      topics: new Set(),
      sessions: new Set(),
      slotDistribution: new Array(9).fill(0),
      totalSize: 0,
      oldestChunk: null,
      newestChunk: null
    };
    
    let oldestTime = Infinity;
    let newestTime = 0;
    
    for (const indexEntry of this.index.values()) {
      stats.providers.add(indexEntry.ai_provider);
      stats.topics.add(indexEntry.topic);
      stats.sessions.add(indexEntry.session_id);
      stats.totalSize += indexEntry.size || 0;
      
      // Update slot distribution
      if (indexEntry.slot >= 1 && indexEntry.slot <= 9) {
        stats.slotDistribution[indexEntry.slot - 1]++;
      }
      
      // Track oldest and newest
      if (indexEntry.timestamp < oldestTime) {
        oldestTime = indexEntry.timestamp;
        stats.oldestChunk = indexEntry.timestamp;
      }
      
      if (indexEntry.timestamp > newestTime) {
        newestTime = indexEntry.timestamp;
        stats.newestChunk = indexEntry.timestamp;
      }
    }
    
    stats.providers = Array.from(stats.providers);
    stats.topics = Array.from(stats.topics);
    stats.sessions = Array.from(stats.sessions);
    
    return stats;
  }

  generateFilename(chunk) {
    const provider = chunk.ai_provider.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = chunk.timestamp;
    const hash = crypto.createHash('md5').update(chunk.id).digest('hex').substring(0, 8);
    
    return `chunk-${provider}-${timestamp}-${hash}.enc`;
  }

  async exportVaultData() {
    try {
      const chunks = await this.getChunks();
      
      return {
        version: '1.0.0',
        exported: Date.now(),
        chunks,
        stats: await this.getStats()
      };
      
    } catch (error) {
      console.error('Failed to export vault data:', error);
      throw error;
    }
  }

  async importVaultData(data) {
    try {
      if (!data.chunks || !Array.isArray(data.chunks)) {
        throw new Error('Invalid import data format');
      }
      
      let imported = 0;
      let failed = 0;
      
      for (const chunk of data.chunks) {
        try {
          await this.storeChunk(chunk);
          imported++;
        } catch (error) {
          console.error(`Failed to import chunk ${chunk.id}:`, error);
          failed++;
        }
      }
      
      return { imported, failed };
      
    } catch (error) {
      console.error('Failed to import vault data:', error);
      throw error;
    }
  }

  async clearAllMemory() {
    return await this.clearChunks({});
  }

  async close() {
    // Cleanup resources if needed
    console.log('SecureVault closed');
  }

  // Backward compatibility methods
  async _getRaw(id) {
    return await this.getChunk(id);
  }

  async _putRaw(id, data) {
    const chunk = {
      id,
      content: '',
      summary: data.summary || '',
      embedding: data.embedding || null,
      ai_provider: 'unknown',
      tab_id: 'unknown',
      session_id: `unknown-${Date.now()}`,
      topic: 'default',
      timestamp: data.timestamp || Date.now(),
      slot: data.slot || 1
    };
    
    return await this.storeChunk(chunk);
    }

  async _getAll() {
    return await this.getChunks();
  }
}

// Export both class and instance for compatibility
const vault = new SecureVault();

module.exports = vault;
module.exports.SecureVault = SecureVault;