// © 2025 AMPIQ All rights reserved.

const express = require('express');
const ChunkManager = require('./chunkManager');
const processor = require('./processor');
const vault = require('./vault');
const utils = require('./utils');

const router = express.Router();

// Initialize chunk manager
let chunkManager;
try {
  chunkManager = new ChunkManager();
} catch (error) {
  console.error('Failed to initialize ChunkManager:', error);
}

// POST /persist - Store memory chunks with metadata
router.post('/persist', async (req, res) => {
  try {
    const { chunks } = req.body;
    
    if (!chunks || !Array.isArray(chunks)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid chunks data' 
      });
    }
    
    const results = [];
    
    for (const chunk of chunks) {
      // Validate required fields
      if (!chunk.id || !chunk.ai_provider || !chunk.timestamp) {
        results.push({
          id: chunk.id || 'unknown',
          success: false,
          error: 'Missing required fields (id, ai_provider, timestamp)'
        });
        continue;
      }
      
      try {
        // Ensure all metadata fields are present
        const normalizedChunk = {
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
        
        // Store in chunk manager
        await chunkManager.store(normalizedChunk.id, normalizedChunk);
        
        // Store in vault with encryption
        await vault.storeChunk(normalizedChunk);
        
        results.push({
          id: chunk.id,
          success: true,
          slot: normalizedChunk.slot
        });
        
      } catch (error) {
        console.error(`Failed to store chunk ${chunk.id}:`, error);
        results.push({
          id: chunk.id,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      stored: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
  } catch (error) {
    console.error('Persist endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /vault - Retrieve stored memory with filtering
router.get('/vault', async (req, res) => {
  try {
    const {
      provider,
      session_id,
      topic,
      tab_id,
      limit = 50,
      offset = 0,
      hot_only = false,
      slot
    } = req.query;
    
    // Build filters
    const filters = {};
    if (provider) filters.ai_provider = provider;
    if (session_id) filters.session_id = session_id;
    if (topic) filters.topic = topic;
    if (tab_id) filters.tab_id = tab_id;
    if (slot) filters.slot = parseInt(slot);
    
    // Get memory chunks
    let chunks = await vault.getChunks(filters);
    
    // Filter by hot slots if requested
    if (hot_only === 'true') {
      const config = utils.loadConfig();
      const hotSlots = config.vault?.hotSlots || 4;
      chunks = chunks.filter(chunk => chunk.slot <= hotSlots);
    }
    
    // Apply pagination
    const total = chunks.length;
    const paginatedChunks = chunks
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    // Get summary statistics
    const providers = [...new Set(chunks.map(c => c.ai_provider))];
    const topics = [...new Set(chunks.map(c => c.topic))];
    const sessions = [...new Set(chunks.map(c => c.session_id))];
    
    res.json({
      success: true,
      chunks: paginatedChunks,
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: total > parseInt(offset) + parseInt(limit)
      },
      statistics: {
        providers,
        topics,
        sessions,
        totalChunks: total
      }
    });
    
  } catch (error) {
    console.error('Vault endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /vault/search - Search memory by query
router.get('/vault/search', async (req, res) => {
  try {
    const {
      query,
      provider,
      session_id,
      topic,
      limit = 10
    } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }
    
    // Build filters
    const filters = {};
    if (provider) filters.ai_provider = provider;
    if (session_id) filters.session_id = session_id;
    if (topic) filters.topic = topic;
    
    // Search in vault
    const results = await vault.searchChunks(query, filters, parseInt(limit));
    
    res.json({
      success: true,
      query,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Vault search endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /vault/clear - Clear memory by filters
router.post('/vault/clear', async (req, res) => {
  try {
    const {
      provider,
      session_id,
      topic,
      tab_id,
      confirm = false
    } = req.body;
    
    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required to clear memory'
      });
    }
    
    // Build filters
    const filters = {};
    if (provider) filters.ai_provider = provider;
    if (session_id) filters.session_id = session_id;
    if (topic) filters.topic = topic;
    if (tab_id) filters.tab_id = tab_id;
    
    // Clear from vault
    const cleared = await vault.clearChunks(filters);
    
    // Clear from chunk manager
    if (Object.keys(filters).length === 0) {
      // Clear all
      await chunkManager.clearAll();
    } else {
      // Clear by filters
      const chunks = await chunkManager.search(filters);
      for (const chunk of chunks) {
        await chunkManager.remove(chunk.id);
      }
    }
    
    res.json({
      success: true,
      cleared,
      filters
    });
    
  } catch (error) {
    console.error('Vault clear endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /vault/stats - Get vault statistics
router.get('/vault/stats', async (req, res) => {
  try {
    const stats = await vault.getStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Vault stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /chunks - Store and process a new chunk (backward compatibility)
router.post('/chunks', async (req, res) => {
  try {
    const { text, metadata = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }
    
    // Generate summary and embedding
    const summary = await processor.summarize(text);
    const embedding = await processor.embed(text);
    
    // Create chunk with metadata
    const chunk = {
      id: `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: text,
      summary,
      embedding,
      ai_provider: metadata.ai_provider || 'unknown',
      tab_id: metadata.tab_id || 'unknown',
      session_id: metadata.session_id || `unknown-${Date.now()}`,
      topic: metadata.topic || 'default',
      timestamp: Date.now(),
      slot: 1
    };
    
    // Store the chunk
    await chunkManager.store(chunk.id, chunk);
    await vault.storeChunk(chunk);
    
    res.json({
      success: true,
      chunk: {
        id: chunk.id,
        summary: chunk.summary,
        slot: chunk.slot,
        timestamp: chunk.timestamp
      }
    });
    
  } catch (error) {
    console.error('Chunks endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /context - Retrieve relevant context (backward compatibility)
router.get('/context', async (req, res) => {
  try {
    const { 
      hotN = 3, 
      coldN = 2, 
      provider, 
      session_id,
      topic 
    } = req.query;
    
    // Build filters
    const filters = {};
    if (provider) filters.ai_provider = provider;
    if (session_id) filters.session_id = session_id;
    if (topic) filters.topic = topic;
    
    // Get hot and cold memory
    const hotContext = await chunkManager.getHotContext(parseInt(hotN), filters);
    const coldContext = await chunkManager.getColdContext(parseInt(coldN), filters);
    
    res.json({
      success: true,
      context: {
        hot: hotContext,
        cold: coldContext,
        total: hotContext.length + coldContext.length
      }
    });
    
  } catch (error) {
    console.error('Context endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /status - Server status check
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;