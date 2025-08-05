// © 2025 AMPiQ - SQLite Storage Manager for AMP Desktop
// Provides indexed storage for conversation memory data

const path = require('path');
const fs = require('fs');

// Try to import electron app, but handle case where it's not available (native host mode)
let app;
try {
  const electron = require('electron');
  app = electron.app;
} catch (error) {
  // Running in native host mode, app will be undefined
  app = null;
}

// Import SQLite - use dynamic path resolution for both development and built environments
let Database;
try {
  // Try local node_modules first (for development)
  Database = require(path.join(__dirname, 'node_modules', 'better-sqlite3'));
} catch (error) {
  try {
    // Try the unpacked path (for built app)
    Database = require(path.join(__dirname, '..', 'app.asar.unpacked', 'node_modules', 'better-sqlite3'));
  } catch (error2) {
    // Try direct require (last resort)
    Database = require('better-sqlite3');
  }
}

class AMPSQLiteStorage {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Get user data directory - handle both Electron and native host modes
      let userDataPath;
      if (app && app.getPath) {
        // Electron mode
        userDataPath = app.getPath('userData');
      } else {
        // Native host mode - use user's home directory
        userDataPath = path.join(process.env.HOME || process.env.USERPROFILE, '.ampiq');
      }
      
      const ampDataDir = path.join(userDataPath, 'AMP');
      
      // Ensure directory exists
      if (!fs.existsSync(ampDataDir)) {
        fs.mkdirSync(ampDataDir, { recursive: true });
      }
      
      this.dbPath = path.join(ampDataDir, 'memory.db');
      
      // Initialize SQLite database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      
      // Create tables
      this.createTables();
      
      // Create indexes for fast searches
      this.createIndexes();
      
      this.isInitialized = true;
      
      // Use stderr for logging when running as native host to avoid interfering with native messaging protocol
      const logOutput = process.stderr || console;
      logOutput.write(`AMP SQLite storage initialized: ${this.dbPath}\n`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize SQLite storage:', error);
      return false;
    }
  }

  createTables() {
    // Main conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        topic TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      )
    `);

    // Memory chunks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_chunks (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        provider TEXT NOT NULL,
        tab_id TEXT,
        topic TEXT,
        message_type TEXT,
        timestamp INTEGER NOT NULL,
        size INTEGER NOT NULL,
        slot INTEGER DEFAULT 1,
        is_encrypted BOOLEAN DEFAULT 0,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Search index table for fast text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(
        chunk_id,
        content,
        summary,
        provider,
        topic,
        content='memory_chunks',
        content_rowid='rowid'
      )
    `);

    // Triggers to maintain search index
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memory_chunks_ai AFTER INSERT ON memory_chunks BEGIN
        INSERT INTO memory_search(chunk_id, content, summary, provider, topic)
        VALUES (new.id, new.content, new.summary, new.provider, new.topic);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memory_chunks_ad AFTER DELETE ON memory_chunks BEGIN
        DELETE FROM memory_search WHERE chunk_id = old.id;
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memory_chunks_au AFTER UPDATE ON memory_chunks BEGIN
        UPDATE memory_search SET
          content = new.content,
          summary = new.summary,
          provider = new.provider,
          topic = new.topic
        WHERE chunk_id = new.id;
      END
    `);
  }

  createIndexes() {
    // Performance indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversations(provider)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC)');
    
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_conversation ON memory_chunks(conversation_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_provider ON memory_chunks(provider)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_timestamp ON memory_chunks(timestamp DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_topic ON memory_chunks(topic)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_slot ON memory_chunks(slot)');
  }

  // Store memory chunk with automatic conversation management
  async storeMemoryChunk(chunk) {
    if (!this.isInitialized) {
      throw new Error('SQLite storage not initialized');
    }

    try {
      const transaction = this.db.transaction(() => {
        // Insert or update conversation
        const conversationExists = this.db.prepare(
          'SELECT id FROM conversations WHERE id = ?'
        ).get(chunk.conversation_id);

        if (!conversationExists) {
          this.db.prepare(`
            INSERT INTO conversations (id, provider, topic, created_at, updated_at, message_count, total_size)
            VALUES (?, ?, ?, ?, ?, 1, ?)
          `).run(
            chunk.conversation_id,
            chunk.ai_provider || chunk.provider,
            chunk.topic || 'conversation',
            chunk.timestamp,
            chunk.timestamp,
            chunk.size || 0
          );
        } else {
          this.db.prepare(`
            UPDATE conversations 
            SET updated_at = ?, message_count = message_count + 1, total_size = total_size + ?
            WHERE id = ?
          `).run(chunk.timestamp, chunk.size || 0, chunk.conversation_id);
        }

        // Insert memory chunk
        this.db.prepare(`
          INSERT OR REPLACE INTO memory_chunks 
          (id, conversation_id, content, summary, provider, tab_id, topic, message_type, timestamp, size, slot, is_encrypted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          chunk.id,
          chunk.conversation_id,
          chunk.content || chunk.fullText,
          chunk.summary,
          chunk.ai_provider || chunk.provider,
          chunk.tab_id,
          chunk.topic,
          chunk.message_type || 'content',
          chunk.timestamp,
          chunk.size || 0,
          chunk.slot || 1,
          chunk.is_encrypted ? 1 : 0
        );
      });

      transaction();
      return { success: true, chunkId: chunk.id };
    } catch (error) {
      console.error('Failed to store memory chunk:', error);
      return { success: false, error: error.message };
    }
  }

  // Generic data storage method for native messaging
  async storeData(data) {
    if (!this.isInitialized) {
      throw new Error('SQLite storage not initialized');
    }

    try {
      // If data has conversation_id, treat it as a memory chunk
      if (data.conversation_id) {
        return await this.storeMemoryChunk(data);
      }

      // Otherwise, store as generic data
      const id = data.id || `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = data.timestamp || Date.now();
      
      // Create a default conversation for generic data
      const conversationId = data.conversation_id || `generic_${Math.floor(timestamp / 86400000)}`;
      
      const transaction = this.db.transaction(() => {
        // Ensure conversation exists
        const conversationExists = this.db.prepare(
          'SELECT id FROM conversations WHERE id = ?'
        ).get(conversationId);

        if (!conversationExists) {
          this.db.prepare(`
            INSERT INTO conversations (id, provider, topic, created_at, updated_at, message_count, total_size)
            VALUES (?, ?, ?, ?, ?, 1, ?)
          `).run(
            conversationId,
            data.provider || 'generic',
            data.topic || 'data',
            timestamp,
            timestamp,
            data.size || 0
          );
        }

        // Store the data as a memory chunk
        this.db.prepare(`
          INSERT OR REPLACE INTO memory_chunks 
          (id, conversation_id, content, summary, provider, tab_id, topic, message_type, timestamp, size, slot, is_encrypted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          conversationId,
          typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
          data.summary,
          data.provider || 'generic',
          data.tab_id,
          data.topic || 'data',
          data.message_type || 'content',
          timestamp,
          data.size || 0,
          data.slot || 1,
          data.is_encrypted ? 1 : 0
        );
      });

      transaction();
      return { success: true, id };
    } catch (error) {
      console.error('Failed to store data:', error);
      return { success: false, error: error.message };
    }
  }

  // Generic data retrieval method for native messaging
  async getData(query) {
    if (!this.isInitialized) {
      throw new Error('SQLite storage not initialized');
    }

    try {
      if (query.conversation_id) {
        return this.getConversationChunks(query.conversation_id, query.limit || 100);
      } else if (query.search) {
        return this.searchMemory(query.search, query.filters || {}, query.limit || 20);
      } else if (query.recent) {
        return this.getRecentActivity(query.limit || 20);
      } else if (query.stats) {
        return this.getStorageStats();
      } else {
        return this.getConversations(query.filters || {}, query.limit || 50, query.offset || 0);
      }
    } catch (error) {
      console.error('Failed to get data:', error);
      throw error;
    }
  }

  // Get conversations with filtering and pagination
  getConversations(filters = {}, limit = 50, offset = 0) {
    if (!this.isInitialized) return [];

    let query = 'SELECT * FROM conversations WHERE 1=1';
    const params = [];

    if (filters.provider) {
      query += ' AND provider = ?';
      params.push(filters.provider);
    }

    if (filters.topic) {
      query += ' AND topic LIKE ?';
      params.push(`%${filters.topic}%`);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      return this.db.prepare(query).all(...params);
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  // Get memory chunks for a conversation
  getConversationChunks(conversationId, limit = 100) {
    if (!this.isInitialized) return [];

    try {
      return this.db.prepare(`
        SELECT * FROM memory_chunks 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC 
        LIMIT ?
      `).all(conversationId, limit);
    } catch (error) {
      console.error('Failed to get conversation chunks:', error);
      return [];
    }
  }

  // Full-text search across all memory
  searchMemory(query, filters = {}, limit = 20) {
    if (!this.isInitialized) return [];

    let searchQuery = `
      SELECT mc.*, c.provider as conv_provider, c.topic as conv_topic
      FROM memory_search ms
      JOIN memory_chunks mc ON ms.chunk_id = mc.id
      JOIN conversations c ON mc.conversation_id = c.id
      WHERE memory_search MATCH ?
    `;
    const params = [query];

    if (filters.provider) {
      searchQuery += ' AND mc.provider = ?';
      params.push(filters.provider);
    }

    if (filters.topic) {
      searchQuery += ' AND mc.topic LIKE ?';
      params.push(`%${filters.topic}%`);
    }

    searchQuery += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    try {
      return this.db.prepare(searchQuery).all(...params);
    } catch (error) {
      console.error('Failed to search memory:', error);
      return [];
    }
  }

  // Get recent activity (for live feed)
  getRecentActivity(limit = 20) {
    if (!this.isInitialized) return [];

    try {
      return this.db.prepare(`
        SELECT 
          mc.id,
          mc.provider,
          mc.topic,
          mc.timestamp,
          mc.size,
          SUBSTR(mc.content, 1, 100) as preview,
          c.message_count
        FROM memory_chunks mc
        JOIN conversations c ON mc.conversation_id = c.id
        ORDER BY mc.timestamp DESC
        LIMIT ?
      `).all(limit);
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  // Get storage statistics
  getStorageStats() {
    if (!this.isInitialized) {
      return {
        totalConversations: 0,
        totalChunks: 0,
        totalSize: 0,
        providers: [],
        oldestEntry: null,
        newestEntry: null
      };
    }

    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT c.id) as totalConversations,
          COUNT(mc.id) as totalChunks,
          SUM(mc.size) as totalSize,
          MIN(mc.timestamp) as oldestEntry,
          MAX(mc.timestamp) as newestEntry
        FROM conversations c
        JOIN memory_chunks mc ON c.id = mc.conversation_id
      `).get();

      const providers = this.db.prepare(`
        SELECT DISTINCT provider, COUNT(*) as count
        FROM conversations
        GROUP BY provider
        ORDER BY count DESC
      `).all();

      return {
        ...stats,
        providers: providers
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalConversations: 0,
        totalChunks: 0,
        totalSize: 0,
        providers: [],
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  // Export conversation data
  exportConversation(conversationId) {
    if (!this.isInitialized) return null;

    try {
      const conversation = this.db.prepare(
        'SELECT * FROM conversations WHERE id = ?'
      ).get(conversationId);

      if (!conversation) return null;

      const chunks = this.getConversationChunks(conversationId, 10000);

      return {
        conversation,
        chunks,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export conversation:', error);
      return null;
    }
  }

  // Clear old data (maintenance)
  clearOldData(olderThanDays = 90) {
    if (!this.isInitialized) return { deleted: 0 };

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    try {
      const result = this.db.prepare(`
        DELETE FROM conversations 
        WHERE updated_at < ? AND status != 'pinned'
      `).run(cutoffTime);

      return { deleted: result.changes };
    } catch (error) {
      console.error('Failed to clear old data:', error);
      return { deleted: 0 };
    }
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

module.exports = AMPSQLiteStorage;
