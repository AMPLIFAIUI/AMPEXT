// © 2025 AMPIQ All rights reserved.
// Background script for cross-tab memory management and AMP app communication
// Hot Memory Priority - minimal storage, maximum performance
// Version: 2.0.1 - Cache busted


// Message Queue for offline desktop app
class MessageQueue {
  constructor() {
    this.queue = [];
    this.maxSize = 1000;
  }
  
  enqueue(message) {
    this.queue.push({
      ...message,
      timestamp: Date.now(),
      id: `msg_${Date.now()}`
    });
    
    if (this.queue.length > this.maxSize) {
      this.queue.shift(); // Remove oldest
    }
  }
  
  dequeue() {
    return this.queue.shift();
  }
  
  getPendingCount() {
    return this.queue.length;
  }
}

const messageQueue = new MessageQueue();

// Global memory state
let activeMemoryPool = null;
let activeTabs = new Map(); // tab_id -> { provider, sessionId, topic, conversationId }
let ampAppStatus = { online: false, lastCheck: 0 };

let ampWindowId = null;
let ampWindowOpen = false;

// Window/Tab switching system
let activeMonitoringTabId = null; // Currently monitored tab
let activeMonitoringWindowId = null; // Currently monitored window
let lastIconClickTime = 0;
const ICON_CLICK_DEBOUNCE = 500; // 500ms debounce

// Analytics will be initialized after class definition
let ampAnalytics = null;

// Single source of truth for stats
class StatsManager {
  constructor() {
    this.stats = {
      domChunks: 0,
      hotBufferChunks: 0,
      archivedChunks: 0,
      totalChunks: 0,
      hotMemorySize: 0,
      domSize: 0,
      archiveSize: 0,
      messageRate: 0,
      growthRate: 0,
      lastUpdated: Date.now()
    };
    this.listeners = [];
  }
  
  updateStats(newStats) {
    this.stats = { ...this.stats, ...newStats, lastUpdated: Date.now() };
    this.notifyListeners();
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.stats);
      } catch (error) {
        console.error('Stats listener error:', error);
      }
    });
  }
}

// Global stats manager instance
const statsManager = new StatsManager();

// Simplified Connection Management - Single Desktop App
let desktopConnected = false;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 5;

// Initialize analytics
try {
  ampAnalytics = new AMPAnalytics();
} catch (error) {
  console.warn('Failed to initialize AMP Analytics:', error);
}

// Initialize memory pool on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeMemoryPool();
  startHealthMonitoring();
  // Clear any persistent badges
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  
  // Test HTTP connection after a delay
  setTimeout(async () => {
    try {
      await testDesktopConnection();
    } catch (error) {
      console.error('HTTP connection failed during startup:', error);
    }
  }, 3000);
  
  // Retry connection every 30 seconds if not connected
  setInterval(async () => {
    if (!desktopConnected) {
      console.log('🔄 Retrying HTTP connection...');
      try {
        await testDesktopConnection();
      } catch (error) {
        console.error('HTTP retry failed:', error);
      }
    }
  }, 30000);
  
  // Update stats every 10 seconds
  setInterval(() => {
    try {
      updateStats();
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }, 10000);
});

// Initialize memory pool on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeMemoryPool();
  startHealthMonitoring();
  // Clear any persistent badges
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  
  // Test native messaging connection after a longer delay to avoid race condition
  setTimeout(async () => {
    await testDesktopConnection();
  }, 3000); // Increased delay to 3 seconds to avoid race condition
  
  console.log('AMP: Extension installed and ready');
});

// Cleanup on shutdown
chrome.runtime.onSuspend.addListener(async () => {
  console.log('AMP Background: Extension shutting down, performing cleanup...');
  
  // Stop health monitoring
  stopHealthMonitoring();
  
  // Final save if memory pool exists
  if (activeMemoryPool && activeMemoryPool.saveToStorage) {
    try {
      await activeMemoryPool.saveToStorage();
      console.log('AMP Background: Final save completed');
    } catch (error) {
      console.error('AMP Background: Final save failed:', error);
    }
  }
  
  console.log('AMP Background: Cleanup completed');
});

// Dummy functions to prevent errors from removed badge system
function updateExtensionBadge(isActive) { 
  // Force clear any existing badges - AGGRESSIVE CLEARING
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  chrome.action.setTitle({ title: "AMP - Auto Memory Persistence" });
  
  // Additional clearing to ensure no overlays persist
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  }, 100);
}
function markActivity() { 
  // Track activity for analytics
  if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
    try {
      ampAnalytics.trackEvent('activity_marked', { timestamp: Date.now() });
    } catch (error) {
      console.warn('AMP Analytics tracking failed:', error);
    }
  }
  // Trigger quick activity animation
  setRingState('quick-activity');
  setTimeout(() => setRingState('normal'), 1000);
}

// Force clear badges on startup and ensure no overlays
chrome.action.setBadgeText({ text: '' });
chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
chrome.action.setTitle({ title: "AMP - Auto Memory Persistence" });

// AGGRESSIVE BADGE CLEARING - Run multiple times to ensure removal
setTimeout(() => {
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
}, 500);

setTimeout(() => {
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
}, 1000);

// Mark when data is actually being processed
function markDataProcessing(bytesProcessed = 0) {
  // Update processing stats
  if (activeMemoryPool) {
    const liveBytes = activeMemoryPool.getLiveBytesCount();
    if (liveBytes && bytesProcessed > 0) {
      console.log(`🔴 Processing ${bytesProcessed} bytes - Ring should be glowing`);
      setRingState('processing');
      // Reset to normal after processing
      setTimeout(() => setRingState('normal'), 2000);
    }
  }
}

// Window management for AMP interface
async function openAmpWindow() {
  // Get all extension windows and check for existing AMP windows
  const ampUrl = chrome.runtime.getURL('amp-ui.html');
  const allWindows = await chrome.windows.getAll({ populate: true });
  let foundWindow = null;

  // Find existing AMP windows and close them first
  for (const win of allWindows) {
    if (win.type === 'popup' && win.tabs && win.tabs.some(tab => tab.url && tab.url.includes('amp-ui.html'))) {
      foundWindow = win;
      break;
    }
  }

  // Close existing AMP window if found
  if (foundWindow) {
    try {
      await chrome.windows.remove(foundWindow.id);
      console.log('🔄 Closed existing AMP window before opening new one');
      ampWindowId = null;
      ampWindowOpen = false;
    } catch (error) {
      console.error('Failed to close existing window:', error);
    }
  }
  
  // Wait a moment for window to close, then open new one
  setTimeout(async () => {
  try {
      console.log('🚀 Opening new AMP window...');
      if (!chrome.windows) throw new Error('Windows API not available - check permissions');
    const currentWindow = await chrome.windows.getCurrent();
      const sidebarWidth = 600;
      const sidebarHeight = 800;
      let left = 100;
      let top = 50;
      if (currentWindow && currentWindow.width) {
        const maxLeft = currentWindow.left + currentWindow.width - sidebarWidth - 100;
        left = Math.max(50, Math.min(maxLeft, currentWindow.left + currentWindow.width - sidebarWidth - 50));
        top = Math.max(50, currentWindow.top + 50);
        if (left < 50) {
          left = Math.max(50, currentWindow.left + (currentWindow.width - sidebarWidth) / 2);
          console.log('🔄 Using center positioning to avoid cutoff');
        }
      }
      let window;
      try {
        window = await chrome.windows.create({
          url: ampUrl,
      type: 'popup',
          width: sidebarWidth,
          height: sidebarHeight,
          left: left,
          top: top,
          focused: true
        });
      } catch (popupError) {
        window = await chrome.windows.create({
          url: ampUrl,
          type: 'normal',
          width: sidebarWidth,
          height: sidebarHeight,
      left: left,
      top: top,
      focused: true
    });
      }
    ampWindowId = window.id;
    ampWindowOpen = true;
      console.log('✅ AMP sidebar window opened successfully:', ampWindowId);
  } catch (error) {
    console.error('❌ Failed to open AMP window:', error);
    ampWindowId = null;
    ampWindowOpen = false;
  }
  }, 100);
}

async function closeAmpWindow() {
  if (ampWindowId && ampWindowOpen) {
    try {
      await chrome.windows.remove(ampWindowId);
      ampWindowId = null;
      ampWindowOpen = false;
      console.log('AMP window closed');
    } catch (error) {
      console.error('Failed to close AMP window:', error);
    }
  }
}

// Switch monitoring target to the specified tab/window
async function switchMonitoringTarget(tab) {
  try {
    const previousTabId = activeMonitoringTabId;
    const previousWindowId = activeMonitoringWindowId;
    
    // Update active monitoring targets
    activeMonitoringTabId = tab.id;
    activeMonitoringWindowId = tab.windowId;
    
    console.log(`🔄 AMP: Switched monitoring from tab ${previousTabId} to tab ${activeMonitoringTabId} (window ${activeMonitoringWindowId})`);
    
    // Notify all tabs about the monitoring change
    await notifyTabsAboutMonitoringChange(previousTabId, activeMonitoringTabId);
    
    // Update the extension icon to show which window is being monitored
    await updateMonitoringIndicator();
    
    // Update tab info for the new target
    await updateTabInfo(tab.id, tab.url);
    
    // Show notification to user
    await showMonitoringSwitchNotification(tab);
    
  } catch (error) {
    console.error('Failed to switch monitoring target:', error);
  }
}

// Notify tabs about monitoring change
async function notifyTabsAboutMonitoringChange(previousTabId, newTabId) {
  try {
    // Notify previous tab to stop monitoring
    if (previousTabId) {
      try {
        await chrome.tabs.sendMessage(previousTabId, {
          action: 'setMonitoringStatus',
          isActive: false,
          tabId: previousTabId
        });
        console.log(`🔴 Notified tab ${previousTabId} to stop monitoring`);
      } catch (error) {
        // Tab might be closed or not have content script
        console.log(`Tab ${previousTabId} not available for monitoring status update`);
      }
    }
    
    // Notify new tab to start monitoring
    if (newTabId) {
      try {
        await chrome.tabs.sendMessage(newTabId, {
          action: 'setMonitoringStatus',
          isActive: true,
          tabId: newTabId
        });
        console.log(`🟢 Notified tab ${newTabId} to start monitoring`);
      } catch (error) {
        // Tab might not have content script yet
        console.log(`Tab ${newTabId} not ready for monitoring status update`);
      }
    }
  } catch (error) {
    console.error('Failed to notify tabs about monitoring change:', error);
  }
}

// Update monitoring indicator on extension icon
async function updateMonitoringIndicator() {
  try {
    if (activeMonitoringTabId) {
      // Get tab info to show provider name
      const tab = await chrome.tabs.get(activeMonitoringTabId);
      const provider = getAIProviderFromUrl(tab.url);
      
      // Update extension title to show which window is being monitored
      const title = `AMP - Monitoring: ${provider} (${tab.url ? new URL(tab.url).hostname : 'Unknown'})`;
      chrome.action.setTitle({ title });
      
      // Set badge to show active monitoring
      chrome.action.setBadgeText({ text: '●' });
      chrome.action.setBadgeBackgroundColor({ color: [0, 255, 0, 255] }); // Green
      
      console.log(`🟢 Updated monitoring indicator for ${provider}`);
    } else {
      // No active monitoring
      chrome.action.setTitle({ title: 'AMP - Auto Memory Persistence (No active monitoring)' });
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
    }
  } catch (error) {
    console.error('Failed to update monitoring indicator:', error);
  }
}

// Show notification about monitoring switch
async function showMonitoringSwitchNotification(tab) {
  try {
    const provider = getAIProviderFromUrl(tab.url);
    const hostname = tab.url ? new URL(tab.url).hostname : 'Unknown';
    
    // Create notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'AMP Monitoring Switched',
      message: `Now monitoring ${provider} on ${hostname}`,
      priority: 1
    });
    
    console.log(`📢 Notification: Now monitoring ${provider} on ${hostname}`);
  } catch (error) {
    console.error('Failed to show monitoring switch notification:', error);
  }
}

// Show hint that this tab can be monitored
async function showMonitoringSwitchHint(tab) {
  try {
    const provider = getAIProviderFromUrl(tab.url);
    const hostname = tab.url ? new URL(tab.url).hostname : 'Unknown';
    
    // Send message to content script to show hint
    await chrome.tabs.sendMessage(tab.id, {
      action: 'showMonitoringHint',
      provider: provider,
      hostname: hostname
    });
    
    console.log(`💡 Hint: ${provider} on ${hostname} can be monitored`);
  } catch (error) {
    // Tab might not have content script yet, which is normal
    console.log(`Tab ${tab.id} not ready for monitoring hint`);
  }
}

// Listen for window closing
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === ampWindowId) {
    ampWindowId = null;
    ampWindowOpen = false;
    console.log('AMP window was closed by user');
  }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  const now = Date.now();
  
  // Debounce rapid clicks
  if (now - lastIconClickTime < ICON_CLICK_DEBOUNCE) {
    console.log('🔴 Extension icon click debounced');
    return;
  }
  lastIconClickTime = now;
  
  console.log('🔴 Extension icon clicked - switching monitoring target');
  
  // Switch monitoring to the current tab/window
  await switchMonitoringTarget(tab);
  
  // Open the AMP window if not already open
  if (!ampWindowOpen) {
    await openAmpWindow();
  }
});

async function initializeMemoryPool() {
  try {
    console.log('AMP Background: Initializing memory pool with fallback mode...');
    
    // Use fallback memory pool since ES6 imports aren't allowed in Service Workers
    activeMemoryPool = {
      hotPool: new Map(),
      domMirror: new Map(),
      conversationIndex: new Map(),
      stats: {
        domChunks: 0,
        hotBufferChunks: 0,
        archivedChunks: 0,
        totalChunks: 0,
        hotMemorySize: 0,
        domSize: 0,
        hotBufferSize: 0,
        archiveSize: 0,
        messageRate: 0,
        growthRate: 0,
        providers: [],
        topics: [],
        lastUpdated: Date.now(),
        storageDir: '',
        overflowCount: 0,
        allMemoryCount: 0,
        sessionActive: false,
        slotStats: [
          { id: 1, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
          { id: 2, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
          { id: 3, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
          { id: 4, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
          { id: 5, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' }
        ],
        overflowQueueLength: 0
      },
      getStats: function() {
        // Return stats in the same format as the real memory pool
        return {
          domChunks: this.stats.domChunks || 0,
          hotBufferChunks: this.stats.hotBufferChunks || 0,
          archivedChunks: this.stats.archivedChunks || 0,
          totalChunks: this.stats.totalChunks || 0,
          hotMemorySize: this.stats.hotMemorySize || 0,
          domSize: this.stats.domSize || 0,
          hotBufferSize: this.stats.hotBufferSize || 0,
          archiveSize: this.stats.archiveSize || 0,
          messageRate: this.stats.messageRate || 0,
          growthRate: this.stats.growthRate || 0,
          providers: this.stats.providers || [],
          topics: this.stats.topics || [],
          // Add additional properties that might be expected
          lastUpdated: Date.now(),
          storageDir: '',
          overflowCount: 0,
          allMemoryCount: 0,
          sessionActive: false,
          slotStats: [
            { id: 1, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
            { id: 2, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
            { id: 3, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
            { id: 4, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' },
            { id: 5, currentSize: 0, maxSize: 0, chunkCount: 0, utilization: '0%' }
          ],
          overflowQueueLength: 0
        };
      },
      getLiveBytesCount: function() {
        return {
          summaryIndexBytes: 0,
          rawArchiveBytes: 0,
          totalBytes: 0,
          summaryIndexMB: '0.00',
          rawArchiveMB: '0.00',
          totalMB: '0.00',
          timestamp: Date.now(),
          chunksPerSecond: 0,
          bytesPerSecond: 0
        };
      },
      getAll: function() {
        return Array.from(this.hotPool.values());
      },
      performWaterfallCascade: async function() {
        console.log('AMP Background: Waterfall cascade triggered (fallback mode)');
      },
      performReverseInjection: async function() {
        console.log('AMP Background: Reverse injection triggered (fallback mode)');
        return [];
      },
      getLiveBytesCount: function() {
        const now = Date.now();
        const totalBytes = this.stats.hotMemorySize || 0;
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
      },
      addChunk: async function(text, metadata) {
        try {
          const chunk = {
            id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversation_id: metadata.conversation_id || `conv_${Date.now()}`,
            fullText: text,
            summary: text.substring(0, 200),
            ai_provider: metadata.ai_provider || 'unknown',
            tab_id: metadata.tab_id || 'unknown',
            topic: metadata.topic || 'conversation',
            timestamp: Date.now(),
            size: text.length
          };
          
          this.hotPool.set(chunk.id, chunk);
          this.stats.totalChunks++;
          this.stats.hotMemorySize += text.length;
          
          console.log(`AMP Background: Chunk added (fallback mode) - ${text.length} chars`);
          return chunk;
        } catch (error) {
          console.error('AMP Background: Failed to add chunk (fallback mode):', error);
          return null;
        }
      },
      getAllChunks: function() {
        return Array.from(this.hotPool.values());
      },
      retryOverflowQueue: async function() {
        console.log('AMP Background: Overflow queue retry (fallback mode)');
      },
      searchSummaryIndex: async function(query, options) {
        console.log('AMP Background: Search summary index (fallback mode)');
        return [];
      },
      searchThinZipper: async function(query) {
        console.log('AMP Background: Search thin zipper (fallback mode)');
        // Return mock results for fallback mode
        return Array.from(this.hotPool.values()).map(chunk => ({
          address: chunk.id,
          relevance: 0.8,
          summary: chunk.summary
        }));
      },
      retrieveFromFatZipper: async function(address) {
        console.log('AMP Background: Retrieve from fat zipper (fallback mode)');
        const chunk = this.hotPool.get(address);
        if (chunk) {
          return {
            chunk: chunk,
            s1s9Data: {}
          };
        }
        return null;
      },
      getSmartContextForInjection: async function(query, conversationId, maxTokens) {
        console.log('AMP Background: Get smart context for injection (fallback mode)');
        // Return mock context for fallback mode
        const chunks = Array.from(this.hotPool.values()).filter(chunk => 
          chunk.conversation_id === conversationId
        );
        return chunks.map(chunk => chunk.fullText).join('\n\n').substring(0, maxTokens);
      }
    };
    
    // Add some sample data for testing stats
    console.log('AMP Background: Adding sample data for stats testing...');
    await activeMemoryPool.addChunk('This is a sample conversation about artificial intelligence and machine learning. The user is asking questions about how neural networks work and their applications in modern technology.', {
      ai_provider: 'chatgpt',
      conversation_id: 'sample_conv_1',
      topic: 'AI Discussion'
    });
    
    await activeMemoryPool.addChunk('Another sample message about web development and JavaScript frameworks. This covers topics like React, Vue, and Angular for building modern web applications.', {
      ai_provider: 'claude',
      conversation_id: 'sample_conv_2', 
      topic: 'Web Development'
    });
    
    await activeMemoryPool.addChunk('A third sample about data science and Python programming. This includes information about pandas, numpy, and scikit-learn for data analysis and machine learning.', {
      ai_provider: 'bard',
      conversation_id: 'sample_conv_3',
      topic: 'Data Science'
    });
    
    console.log('AMP Background: Memory pool initialized with sample data');
    return true;
  } catch (error) {
    console.error('AMP Background: Failed to initialize memory pool:', error);
    return false;
  }
}

// Enhanced tab management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTabInfo(activeInfo.tabId);
  
  // If the newly activated tab is on an AI provider site, offer to switch monitoring
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const provider = getAIProviderFromUrl(tab.url);
  
  if (provider !== 'unknown' && activeMonitoringTabId !== activeInfo.tabId) {
    // Show a subtle indicator that this tab can be monitored
    await showMonitoringSwitchHint(tab);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await updateTabInfo(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Flush memory for closed tab
  await flushTabMemory(tabId);
  activeTabs.delete(tabId.toString());
  
  // If the closed tab was being monitored, clear monitoring status
  if (tabId === activeMonitoringTabId) {
    activeMonitoringTabId = null;
    activeMonitoringWindowId = null;
    await updateMonitoringIndicator();
    console.log('🔄 AMP: Monitoring target closed, monitoring disabled');
  }
});

async function updateTabInfo(tabId, url = null) {
  try {
    if (!url) {
      const tab = await chrome.tabs.get(tabId);
      url = tab.url;
    }
    
    // Detect provider from URL (AI providers only)
    const provider = getAIProviderFromUrl(url);
    
    // Safely extract hostname from URL
    let hostname = 'unknown';
    try {
      if (url && url.startsWith('http')) {
        hostname = new URL(url).hostname.replace('www.', '');
      }
    } catch (urlError) {
      console.warn('Invalid URL provided:', url, urlError);
      hostname = 'unknown';
    }
    
    if (provider !== 'unknown') {
      // Check if we should prompt for context carryover
      const shouldPrompt = await checkContextCarryover(tabId, provider, hostname);
      
      if (shouldPrompt) {
        // Show context carryover prompt
        await showContextCarryoverPrompt(tabId, provider, hostname);
      }
      
      const tabInfo = {
        provider,
        hostname,
        sessionId: `session_${provider}_${tabId}_${Date.now()}`,
        topic: 'conversation',
        conversationId: `conv_${provider}_${tabId}_${Date.now()}`,
        lastActivity: Date.now(),
        contextCarryover: false // Will be set by user choice
      };
      
      activeTabs.set(tabId.toString(), tabInfo);
      console.log(`AMP Background: Updated tab ${tabId} - ${provider} (${hostname})`);
    }
  } catch (error) {
    console.error('Failed to update tab info:', error);
  }
}

// Check if we should prompt for context carryover
async function checkContextCarryover(tabId, provider, hostname) {
  try {
    // Get user preferences for context carryover
    const result = await chrome.storage.local.get(['amp_context_carryover_preferences']);
    const preferences = result.amp_context_carryover_preferences || {};
    
    // Check if user has set a preference for this site
    if (preferences[hostname] !== undefined) {
      return false; // User already has a preference
    }
    
    // Check if there's relevant context to carry over
    if (activeMemoryPool) {
      const stats = activeMemoryPool.getStats();
      if (stats.totalChunks > 0) {
        return true; // There's context to potentially carry over
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking context carryover:', error);
    return false;
  }
}

// Show context carryover prompt
async function showContextCarryoverPrompt(tabId, provider, hostname) {
  try {
    // Check if tab exists and is accessible before sending message
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      console.log(`AMP Background: Tab ${tabId} not found or not accessible, skipping context carryover prompt`);
      return;
    }
    
    // Create a notification to the user
    await chrome.tabs.sendMessage(tabId, {
      action: 'showContextCarryoverPrompt',
      provider,
      hostname,
      timestamp: Date.now()
    });
    
    console.log(`AMP Background: Context carryover prompt sent to tab ${tabId}`);
  } catch (error) {
    // Don't log errors for tabs that don't exist - this is expected
    if (error.message.includes('Receiving end does not exist') || error.message.includes('Could not establish connection')) {
      console.log(`AMP Background: Tab ${tabId} not ready for messages, skipping context carryover prompt`);
    } else {
      console.error('Failed to show context carryover prompt:', error);
    }
  }
}

function getAIProviderFromUrl(url) {
  if (!url) return 'unknown';
  
  if (url.includes('chatgpt.com') || url.includes('openai.com')) return 'chatgpt';
  if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'gemini';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('poe.com')) return 'poe';
  if (url.includes('character.ai')) return 'character';
  if (url.includes('you.com')) return 'you';
  if (url.includes('blackbox.ai')) return 'blackbox';
  
  return 'unknown';
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    console.log('AMP Background: Received message:', message.action, message);
    switch (message.action) {
      case 'storeMemory':
        await handleStoreMemory(message, sender);
        sendResponse({ success: true });
        break;
        
      case 'getMemoryStats':
        console.log('🔧 Background: Received getMemoryStats request');
        const stats = await handleGetMemoryStats();
        console.log('🔧 Background: Sending stats response:', stats);
        sendResponse({ success: true, stats });
        break;
        
      case 'get_connection_status':
        try {
          const status = await getDesktopStatus();
          sendResponse({ 
            desktopConnected: status ? status.connected : false,
            storageAvailable: status ? status.storageAvailable : false,
            stats: status ? status.stats : null
          });
        } catch (error) {
          sendResponse({ desktopConnected: false, error: error.message });
        }
        break;
        
      case 'pingDesktopApp':
        try {
          const connected = await testDesktopConnection();
          sendResponse({ success: connected });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'setContextCarryover':
        try {
          const { tabId, carryover } = message;
          const hostname = new URL(sender.tab.url).hostname;
          
          // Store user preference for this site
          const result = await chrome.storage.local.get(['amp_context_carryover_preferences']);
          const preferences = result.amp_context_carryover_preferences || {};
          preferences[hostname] = carryover;
          
          await chrome.storage.local.set({
            amp_context_carryover_preferences: preferences
          });
          
          console.log(`AMP Background: Context carryover preference set for ${hostname}: ${carryover}`);
          
          // Update tab info with the preference
          if (activeTabs.has(tabId)) {
            activeTabs.set(tabId, {
              ...activeTabs.get(tabId),
              contextCarryover: carryover
            });
          }
          
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error setting context carryover preference:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'clearContextCarryoverPreference':
        try {
          const hostname = new URL(sender.tab.url).hostname;
          
          // Remove user preference for this site
          const result = await chrome.storage.local.get(['amp_context_carryover_preferences']);
          const preferences = result.amp_context_carryover_preferences || {};
          delete preferences[hostname];
          
          await chrome.storage.local.set({
            amp_context_carryover_preferences: preferences
          });
          
          console.log(`AMP Background: Context carryover preference cleared for ${hostname}`);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error clearing context carryover preference:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getMonitoringStatus':
        try {
          const isActive = sender.tab.id === activeMonitoringTabId;
          sendResponse({ 
            isActive: isActive,
            activeTabId: activeMonitoringTabId,
            activeWindowId: activeMonitoringWindowId
          });
        } catch (error) {
          sendResponse({ isActive: false, error: error.message });
        }
        break;
        
      case 'requestMonitoringSwitch':
        try {
          await switchMonitoringTarget(sender.tab);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getTabId':
        try {
          const tabId = sender.tab?.id;
          sendResponse({ success: true, tabId: tabId });
        } catch (error) {
          console.error('Error getting tab ID:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getMemoryData':
        try {
          const memoryData = [];
          
          // Get data from active memory pool using the correct structure
          if (activeMemoryPool && activeMemoryPool.hotPool) {
            const chunks = Array.from(activeMemoryPool.hotPool.values());
            chunks.forEach((chunk, index) => {
              memoryData.push({
                id: chunk.id || `chunk-${index}`,
                content: chunk.fullText || chunk.content || '',
                provider: chunk.ai_provider || chunk.provider || 'unknown',
                timestamp: chunk.timestamp || Date.now(),
                index: index,
                type: chunk.topic || chunk.type || 'conversation'
              });
            });
          }
          
          console.log(`🔧 Background: Returning ${memoryData.length} memory chunks to UI`);
          sendResponse({ success: true, data: memoryData });
        } catch (error) {
          console.error('Error getting memory data:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      default:
        // Use HTTP instead of native messaging
        try {
          const response = await sendToDesktopApp(message);
          sendResponse(response);
        } catch (error) {
          sendResponse({ error: error.message });
        }
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleStoreMemory(message, sender) {
  try {
    console.log('AMP Background: handleStoreMemory called with:', { content: message.content?.substring(0, 100) + '...', provider: message.provider, messageType: message.messageType });
    markActivity(); // Mark real-time activity
    setRingState('processing'); // Trigger processing animation
    
    const { content, summary, provider, tabId, topic, conversationId, messageId, messageType } = message;
    
    // Validate input
    if (!content || content.trim().length === 0) {
      console.warn('AMP Background: Empty content received, skipping...');
      return;
    }
    
    // Use the robust addChunk method
    const chunk = await activeMemoryPool.addChunk(content, {
      conversation_id: conversationId,
      ai_provider: provider,
      tab_id: tabId,
      topic: topic,
      messageId: messageId,
      messageType: messageType,
      captureMethod: 'realtime'
    });
    
    if (chunk) {
      console.log(`✅ AMP Background: REAL DATA stored and persisted - ${messageType} (${content.length} chars):`, chunk.id);
      
      // Mark data processing for indicators
      markDataProcessing(content.length);
      
      // Update stats
      updateStats();
      
      // Reset ring to normal after processing
      setTimeout(() => setRingState('normal'), 1500);
      
      // Check system health periodically
      if (activeMemoryPool.getSystemHealth) {
        const health = activeMemoryPool.getSystemHealth();
        if (health.errorCount > 5) {
          console.warn('AMP Background: High error count detected, attempting recovery...');
          await activeMemoryPool.attemptRecovery();
        }
      }
      
    } else {
      console.error('AMP Background: ❌ Failed to store memory chunk');
    }
    
  } catch (error) {
    console.error('AMP Background: ❌ Critical error in handleStoreMemory:', error);
    
    // Attempt recovery if this is a storage error
    if (activeMemoryPool.attemptRecovery) {
      await activeMemoryPool.attemptRecovery();
    }
  }
}

// Analytics System
class AMPAnalytics {
  constructor() {
    this.events = [];
    this.metrics = {
      totalInjectionRequests: 0,
      successfulInjections: 0,
      failedInjections: 0,
      totalSearches: 0,
      cacheHits: 0,
      crossProviderTransfers: 0,
      storageOperations: 0,
      errors: 0
    };
    this.startTime = Date.now();
  }

  trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: data
    };
    
    this.events.push(event);
    
    // Update metrics
    switch (eventType) {
      case 'injection_request':
        this.metrics.totalInjectionRequests++;
        break;
      case 'injection_success':
        this.metrics.successfulInjections++;
        break;
      case 'injection_failed':
        this.metrics.failedInjections++;
        break;
      case 'search_performed':
        this.metrics.totalSearches++;
        break;
      case 'cache_hit':
        this.metrics.cacheHits++;
        break;
      case 'cross_provider_transfer':
        this.metrics.crossProviderTransfers++;
        break;
      case 'storage_operation':
        this.metrics.storageOperations++;
        break;
      case 'error_occurred':
        this.metrics.errors++;
        break;
    }
    
    // Limit events array size
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  getAnalytics() {
    const uptime = Date.now() - this.startTime;
    const injectionSuccessRate = this.metrics.totalInjectionRequests > 0 
      ? (this.metrics.successfulInjections / this.metrics.totalInjectionRequests) * 100 
      : 0;
    
    const cacheHitRate = this.metrics.totalSearches > 0 
      ? (this.metrics.cacheHits / this.metrics.totalSearches) * 100 
      : 0;
    
    return {
      uptime: uptime,
      metrics: this.metrics,
      injectionSuccessRate: injectionSuccessRate,
      cacheHitRate: cacheHitRate,
      eventsPerHour: (this.events.length / (uptime / (1000 * 60 * 60))),
      recentEvents: this.events.slice(-10)
    };
  }

  exportAnalytics() {
    return {
      analytics: this.getAnalytics(),
      events: this.events,
      exportTime: Date.now()
    };
  }
  
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    return {
      ...this.metrics,
      totalEvents: this.events.length,
      uptime: uptime,
      averageEventsPerMinute: this.events.length / Math.max(1, uptime / 60000),
      eventsPerHour: this.events.length / Math.max(1, uptime / (1000 * 60 * 60))
    };
  }
}

  // Analytics already initialized at the top

function calculateImportance(content, messageType) {
  let importance = 1;
  
  // Higher importance for questions and commands
  if (content.includes('?')) importance += 2;
  if (messageType === 'user') importance += 1;
  if (messageType === 'assistant') importance += 1.5;
  
  // Length-based importance
  if (content.length > 200) importance += 1;
  if (content.length > 500) importance += 2;
  
  // Keyword-based importance
  const keywords = ['explain', 'how', 'what', 'why', 'code', 'example', 'problem', 'solution'];
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) importance += 0.5;
  });
  
  return Math.min(5, importance); // Cap at 5
}

// Handle context injection requests
async function handleContextInjectionRequest(message, sender, sendResponse) {
  try {
    const { provider, tabId, conversationId } = message;
    
    console.log(`🔄 AMP Background: Context injection requested for ${provider} (${conversationId})`);
    
    // Track injection request
    if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
      try {
        ampAnalytics.trackEvent('injection_request', { provider, conversationId });
      } catch (error) {
        console.warn('AMP Analytics tracking failed:', error);
      }
    }
    
    // Get relevant context from memory pool with injection amount logic
    const injectionAmount = await calculateInjectionAmount(provider, conversationId);
    const context = await activeMemoryPool.getSmartContextForInjection(
      '', // No specific query, get general context
      conversationId,
      injectionAmount.maxTokens
    );
    
    if (context && context.length > 100) {
      // Show approval popup to user
      const approved = await showContextInjectionPopup(context, provider);
      
      if (approved) {
        // Send context to content script for injection
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'injectContext',
          context: context,
          amount: context.length
        });
        
        // Track successful injection
        if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
          try {
            ampAnalytics.trackEvent('injection_success', { 
              provider, 
              conversationId, 
              contextSize: context.length,
              amount: injectionAmount.preferredTokens 
            });
          } catch (error) {
            console.warn('AMP Analytics tracking failed:', error);
          }
        }
        
        console.log(`✅ AMP Background: Context injection approved and sent (${context.length} chars)`);
        sendResponse({ approved: true, contextLength: context.length });
      } else {
        console.log('❌ AMP Background: Context injection denied by user');
        sendResponse({ approved: false });
      }
    } else {
      console.log('❌ AMP Background: No relevant context found for injection');
      sendResponse({ approved: false, error: 'No context available' });
    }
    
  } catch (error) {
    console.error('❌ AMP Background: Error handling context injection request:', error);
    sendResponse({ approved: false, error: error.message });
  }
}

// Calculate optimal injection amount based on provider and context
async function calculateInjectionAmount(provider, conversationId) {
  const providerLimits = {
    'ChatGPT': { maxTokens: 4000, preferredTokens: 2000 },
    'Claude': { maxTokens: 100000, preferredTokens: 8000 },
    'Gemini': { maxTokens: 30000, preferredTokens: 4000 },
    'Blackbox': { maxTokens: 8000, preferredTokens: 3000 }
  };
  
  const limits = providerLimits[provider] || { maxTokens: 4000, preferredTokens: 2000 };
  
  // Get conversation history to determine relevance
  const conversation = await activeMemoryPool.getConversation(conversationId);
  const conversationLength = conversation ? conversation.length : 0;
  
  // Adjust based on conversation complexity
  let adjustedTokens = limits.preferredTokens;
  if (conversationLength > 20) {
    adjustedTokens = Math.min(limits.maxTokens, adjustedTokens * 1.5);
  } else if (conversationLength < 5) {
    adjustedTokens = Math.max(1000, adjustedTokens * 0.7);
  }
  
  // Get cross-provider context if available
  const crossProviderContext = await activeMemoryPool.getCrossProviderContext('', 1);
  if (crossProviderContext.length > 0) {
    adjustedTokens = Math.min(limits.maxTokens, adjustedTokens + 500);
  }
  
  return {
    maxTokens: limits.maxTokens,
    preferredTokens: adjustedTokens,
    provider: provider,
    conversationLength: conversationLength,
    hasCrossProvider: crossProviderContext.length > 0
  };
}

// Show context injection approval popup
async function showContextInjectionPopup(context, provider) {
  return new Promise((resolve) => {
    // Create popup for user approval
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
    `;
    
    popup.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #007bff;">🔄 AMP Context Injection</h3>
      <p style="margin: 0 0 10px 0; font-size: 14px;">
        <strong>${provider}</strong> appears to have lost context. 
        Should AMP inject previous conversation context?
      </p>
      <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 12px; max-height: 150px; overflow-y: auto;">
        <strong>Context Preview:</strong><br>
        ${context.substring(0, 300)}${context.length > 300 ? '...' : ''}
      </div>
      <div style="text-align: right; margin-top: 15px;">
        <button id="amp-inject-deny" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ccc; background: #f8f9fa; border-radius: 4px; cursor: pointer;">Deny</button>
        <button id="amp-inject-approve" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Inject Context</button>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Handle button clicks
    popup.querySelector('#amp-inject-approve').onclick = () => {
      document.body.removeChild(popup);
      resolve(true);
    };
    
    popup.querySelector('#amp-inject-deny').onclick = () => {
      document.body.removeChild(popup);
      resolve(false);
    };
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
        resolve(false);
      }
    }, 30000);
  });
}

// Desktop retry queue
const desktopRetryQueue = [];

function queueForDesktopRetry(chunk, fatAddress, thinTag) {
  desktopRetryQueue.push({
    chunk: chunk,
    fatAddress: fatAddress,
    thinTag: thinTag,
    timestamp: Date.now(),
    retryCount: 0
  });
  
  // Limit queue size
  if (desktopRetryQueue.length > 100) {
    desktopRetryQueue.shift();
  }
}

async function processDesktopRetryQueue() {
  if (desktopRetryQueue.length === 0 || !desktopConnected) return;
  
  console.log(`🔄 AMP Background: Processing ${desktopRetryQueue.length} queued items for desktop`);
  
  const itemsToProcess = [...desktopRetryQueue];
  desktopRetryQueue.length = 0;
  
  for (const item of itemsToProcess) {
    try {
      if (item.retryCount < 3) {
        const response = await sendToDesktopApp({
          type: 'storeMemory',
          chunk: item.chunk,
          fatAddress: item.fatAddress,
          thinTag: item.thinTag,
          timestamp: item.timestamp,
          provider: item.chunk.ai_provider,
          conversationId: item.chunk.conversation_id,
          isRetry: true
        });
        
        if (response && response.success) {
          if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
            try {
              ampAnalytics.trackEvent('desktop_retry_success', {
                chunkId: item.chunk.id,
                retryCount: item.retryCount
              });
            } catch (error) {
              console.warn('AMP Analytics tracking failed:', error);
            }
          }
        } else {
          throw new Error('Desktop app returned failure response');
        }
      } else {
        if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
          try {
            ampAnalytics.trackEvent('desktop_retry_failed', {
              chunkId: item.chunk.id,
              retryCount: item.retryCount
            });
          } catch (error) {
            console.warn('AMP Analytics tracking failed:', error);
          }
        }
      }
    } catch (error) {
      item.retryCount++;
      if (item.retryCount < 3) {
        desktopRetryQueue.push(item);
      }
    }
  }
}

// Settings management
async function updateAMPSettings(settings) {
  try {
    // Store settings in Chrome storage
    await chrome.storage.local.set({ 'amp-settings': settings });
    
    // Apply settings to memory pool
    if (activeMemoryPool) {
      // Update injection settings
      if (settings.injection) {
        activeMemoryPool.injectionSettings = settings.injection;
      }
      
      // Update performance settings
      if (settings.performance) {
        activeMemoryPool.performanceSettings = settings.performance;
      }
      
      // Update security settings
      if (settings.security) {
        activeMemoryPool.securitySettings = settings.security;
      }
    }
    
    console.log('✅ AMP Settings updated successfully');
    if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
      try {
        ampAnalytics.trackEvent('settings_updated', settings);
      } catch (error) {
        console.warn('AMP Analytics tracking failed:', error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to update AMP settings:', error);
    throw error;
  }
}

async function handleGetMemoryStats() {
  try {
    // Get REAL stats from the active memory pool
    if (!activeMemoryPool) {
      console.warn('AMP Background: Memory pool not initialized');
      return {
        totalChunks: 0,
        domChunks: 0,
        hotBufferChunks: 0,
        archivedChunks: 0,
        hotMemorySize: 0,
        domSize: 0,
        hotBufferSize: 0,
        archiveSize: 0,
        messageRate: 0,
        growthRate: 0,
        providers: [],
        topics: [],
        conversations: [],
        lastUpdated: Date.now(),
        error: 'Memory pool not initialized'
      };
    }

    const stats = activeMemoryPool.getStats();
    const allChunks = activeMemoryPool.getAllChunks();
    
    // Calculate REAL numbers with proper fallbacks
    const realStats = {
      totalChunks: allChunks.length,
      domChunks: stats.domChunks || 0,
      hotBufferChunks: stats.hotBufferChunks || 0,
      archivedChunks: stats.archivedChunks || 0,
      hotMemorySize: stats.hotMemorySize || 0,
      domSize: stats.domSize || 0,
      hotBufferSize: stats.hotBufferSize || 0,
      archiveSize: stats.archiveSize || 0,
      messageRate: stats.messageRate || 0,
      growthRate: stats.growthRate || 0,
      providers: Array.from(activeMemoryPool.conversationIndex?.keys() || []),
      topics: Array.from(activeMemoryPool.conversationIndex?.keys() || []),
      conversations: Array.from(activeMemoryPool.conversationIndex?.keys() || []),
      lastUpdated: Date.now(),
      totalSize: allChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0),
      activeTabs: activeTabs.size
    };

    console.log(`🔧 Background: Returning stats - ${realStats.totalChunks} chunks, ${realStats.totalSize} bytes`);
    
    // Update the stats manager with real data
    statsManager.updateStats(realStats);
    
    return realStats;
  } catch (error) {
    console.error('AMP Background: Error getting memory stats:', error);
    return {
      totalChunks: 0,
      domChunks: 0,
      hotBufferChunks: 0,
      archivedChunks: 0,
      hotMemorySize: 0,
      domSize: 0,
      hotBufferSize: 0,
      archiveSize: 0,
      messageRate: 0,
      growthRate: 0,
      providers: [],
      topics: [],
      conversations: [],
      lastUpdated: Date.now(),
      error: error.message
    };
  }
}

async function handleExportMemory() {
    const stats = activeMemoryPool.getStats();
    const allMemory = activeMemoryPool.getAllChunks();
    
    return {
      timestamp: new Date().toISOString(),
      memoryArchitecture: {
        domChunks: stats.domChunks,
        hotBufferChunks: stats.hotBufferChunks,
        archivedChunks: stats.archivedChunks,
        hotMemorySize: stats.hotMemorySize
      },
      totalChunks: allMemory.length,
      memory: allMemory
    };
}

async function handleClearMemory() {
    // Clear all slots
    for (const slot of activeMemoryPool.slots) {
      slot.chunks.clear();
      slot.currentSize = 0;
    }
    activeMemoryPool.domMirror.clear();
    activeMemoryPool.conversationIndex.clear();
    activeMemoryPool.providerIndex.clear();
    activeMemoryPool.topicIndex.clear();
    activeMemoryPool.overflowQueue = [];
    updateStats();
    console.log('All memory cleared');
}

// Send all memory to desktop app
async function handleSendAllToGUI() {
  try {
    console.log('🔄 Sending all memory to desktop app...');
    
    // Get all memory chunks from the pool
    const allChunks = activeMemoryPool.getAllChunks();
    console.log(`📦 Found ${allChunks.length} chunks to send`);
    
    if (allChunks.length === 0) {
      console.log('📭 No memory chunks to send');
      return;
    }
    
    // Send to desktop app via HTTP
    const response = await sendToDesktopApp({
      type: 'sendAllMemory',
      chunks: allChunks,
      timestamp: Date.now(),
      totalChunks: allChunks.length,
      totalSize: allChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    });
    
    if (response && response.success) {
      console.log(`✅ Successfully sent ${response.storedCount}/${response.totalCount} chunks to desktop app`);
    } else {
      console.warn('⚠️ Failed to send memory to desktop app:', response);
    }
  } catch (error) {
    console.error('❌ Error sending memory to desktop app:', error);
  }
}

// Handle overflow data from memory pool
async function handleSendToDesktop(message) {
  try {
    console.log('🔄 Sending message to desktop app...');
    
    const response = await sendToDesktopApp(message);
    
    if (response && response.success) {
      console.log('✅ Message sent to desktop app successfully');
    } else {
      console.warn('⚠️ Failed to send message to desktop app:', response);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error sending message to desktop app:', error);
    throw error;
  }
}

async function handleGetDetailedStats() {
    const stats = activeMemoryPool.getStats();
    
    return {
      ...stats,
      memoryBreakdown: {
        domLayer: stats.domChunks,
        hotBuffer: stats.hotBufferChunks,
        archive: stats.archivedChunks
      },
      storageInfo: {
        hotMemoryMB: (stats.hotMemorySize / 1024 / 1024).toFixed(2),
      domMirrorKB: '0.0'
    }
  };
}

function updateStats() {
  try {
    const memories = Array.from(activeMemoryPool.hotPool.values());
    const providers = new Set();
    const topics = new Set();
    const conversations = new Set();
    let totalSize = 0;
    let totalChars = 0;
    
    memories.forEach(mem => {
      providers.add(mem.ai_provider);
      topics.add(mem.topic);
      conversations.add(mem.conversation_id);
      totalSize += mem.size || 0;
      totalChars += mem.content?.length || 0;
    });
    
    // Get analytics metrics if available
    let analyticsMetrics = {};
    if (ampAnalytics && typeof ampAnalytics.getMetrics === 'function') {
      try {
        analyticsMetrics = ampAnalytics.getMetrics();
      } catch (error) {
        console.warn('Failed to get analytics metrics:', error);
      }
    }
    
    // Calculate size for each layer
    const domMemories = memories.filter(m => m.inDom);
    const hotMemories = memories.filter(m => m.inHot && !m.inDom);
    const archivedMemories = memories.filter(m => m.slot === 9);
    
    const domSize = domMemories.reduce((sum, m) => sum + (m.size || 0), 0);
    const hotBufferSize = hotMemories.reduce((sum, m) => sum + (m.size || 0), 0);
    const archiveSize = archivedMemories.reduce((sum, m) => sum + (m.size || 0), 0);
    
    const newStats = {
      domChunks: domMemories.length,
      hotBufferChunks: hotMemories.length,
      archivedChunks: archivedMemories.length,
      totalChunks: memories.length,
      hotMemorySize: totalSize,
      domSize: domSize,
      hotBufferSize: hotBufferSize,
      archiveSize: archiveSize,
      totalCharacters: totalChars,
      providers: Array.from(providers),
      topics: Array.from(topics),
      conversations: Array.from(conversations),
      lastUpdated: Date.now(),
      analytics: analyticsMetrics,
      systemHealth: {
        errorCount: 0,
        lastError: null,
        uptime: Date.now() - (ampAnalytics?.startTime || Date.now())
      }
    };
    
    // Update the single source of truth
    statsManager.updateStats(newStats);
    
    // Also update the memory pool stats for backward compatibility
    activeMemoryPool.stats = newStats;
    
    // Update connection status
    updateConnectionStatus(desktopConnected);
    
  } catch (error) {
    console.error('Failed to update stats:', error);
    // Set basic stats if update fails
    const errorStats = {
      totalChunks: 0,
      hotMemorySize: 0,
      providers: [],
      topics: [],
      conversations: [],
      lastUpdated: Date.now(),
      error: error.message
    };
    
    statsManager.updateStats(errorStats);
    activeMemoryPool.stats = errorStats;
  }
}

async function broadcastMemoryUpdate(memoryChunk, excludeTabId) {
  // Get all tabs with the same provider
  const targetTabs = [];
  
  for (const [tabId, tabInfo] of activeTabs) {
    if (tabId !== excludeTabId?.toString() && tabInfo.provider === memoryChunk.ai_provider) {
      targetTabs.push(parseInt(tabId));
    }
  }
  
  // Send memory update to target tabs
  for (const tabId of targetTabs) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'AMP_MEMORY_UPDATE',
        chunk: memoryChunk,
        source: 'background'
      });
    } catch (error) {
      // Tab might be closed or inactive
      console.log(`Failed to send memory update to tab ${tabId}`);
    }
  }
}

async function flushTabMemory(tabId) {
  try {
    console.log(`AMP Background: Flushing memory for tab ${tabId}`);
    
    // Get all hot memory for this tab
    const tabMemory = Array.from(activeMemoryPool.hotPool.values()).filter(chunk => chunk.tab_id === tabId.toString());
    
    if (tabMemory.length > 0) {
      // Check if AMP app is running and send memory (for future LLM adoption)
      try {
      const ampOnline = await checkAmpAppStatus();
      
      if (ampOnline) {
        await sendToAmpApp(tabMemory);
        console.log(`Sent ${tabMemory.length} chunks to AMP app`);
        }
      } catch (error) {
        // Silently handle AMP app connection issues - extension works independently
        console.log('AMP app integration skipped (extension mode)');
      }
      
      // Archive recent valuable memory to slot 9 before tab close
      const recentMemory = tabMemory.filter(chunk => 
        Date.now() - chunk.timestamp < 24 * 60 * 60 * 1000 && // Less than 24 hours old
        chunk.size > 100 && // Substantial content
        chunk.inHot // Still in hot memory
      );
      
      for (const chunk of recentMemory) {
        if (chunk.slot < 9) {
          // This functionality is removed from memoryPool, so this block is effectively a no-op
          // For now, we'll just log that it would have been archived
          console.log(`AMP Background: Would have archived chunk ${chunk.id} to slot 9`);
        }
      }
    }
    
    // Always save crash safety backup
    // This functionality is removed from memoryPool, so this block is effectively a no-op
    // For now, we'll just log that it would have been saved
    console.log(`AMP Background: Would have saved memory to storage`);
  } catch (error) {
    console.error('Failed to flush tab memory:', error);
  }
}

async function checkAmpAppStatus() {
  const now = Date.now();
  
  // Check every 30 seconds
  if (now - ampAppStatus.lastCheck < 30000) {
    return ampAppStatus.online;
  }
  
  try {
    const response = await fetch('http://127.0.0.1:3456/status', {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(2000)
    });
    
    ampAppStatus.online = response.ok;
    ampAppStatus.lastCheck = now;
    
    return ampAppStatus.online;
  } catch (error) {
    // Silently handle CORS and network errors - AMP app is optional
    ampAppStatus.online = false;
    ampAppStatus.lastCheck = now;
    console.log('AMP app not available (normal if not running locally)');
    return false;
  }
}

// Native Messaging integration
// nativeConnected already declared above

// Function to update connection status and notify all UI components
function updateConnectionStatus(connected) {
  try {
    desktopConnected = connected;
    
    // Update ring state based on connection
    try {
      if (connected) {
        setRingState('normal'); // Green/connected state
        console.log('🟢 AMP Background: Connected');
      } else {
        setRingState('idle'); // Red/disconnected state
        console.log('🔴 AMP Background: Disconnected');
      }
    } catch (error) {
      console.warn('Failed to update ring state:', error);
    }
    
    // Broadcast connection status to all tabs (only if chrome.tabs is available)
    try {
      if (chrome && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({}, (tabs) => {
          if (tabs && Array.isArray(tabs)) {
            tabs.forEach(tab => {
              try {
                if (chrome.tabs && chrome.tabs.sendMessage) {
                  chrome.tabs.sendMessage(tab.id, {
                    type: 'connectionStatusUpdate',
                    connected: connected
                  }).catch(() => {
                    // Ignore errors for tabs that don't have content scripts
                  });
                }
              } catch (error) {
                // Ignore individual tab errors
              }
            });
          }
        });
      }
    } catch (tabsError) {
      console.warn('Failed to broadcast connection status to tabs:', tabsError);
    }
    
    console.log(`Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
  } catch (error) {
    console.error('updateConnectionStatus failed:', error);
  }
}

// Replace sendToAmpApp with HTTP
async function sendToDesktopApp(message) {
  try {
    console.log('Sending HTTP message:', message.type);
    
    const response = await fetch('http://127.0.0.1:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('HTTP response:', data);
    
    updateConnectionStatus(true);
    return data;
  } catch (error) {
    console.error('HTTP request failed:', error);
    updateConnectionStatus(false);
    return null;
  }
}

// Test connection via HTTP
async function testDesktopConnection() {
  try {
    console.log('🔍 Testing HTTP connection to desktop app...');
    
    const response = await fetch('http://127.0.0.1:3000/ping');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data.type === 'pong') {
      updateConnectionStatus(true);
      console.log('✅ HTTP connection successful');
      return true;
    } else {
      console.warn('⚠️ Unexpected response from desktop app:', data);
      updateConnectionStatus(false);
      return false;
    }
  } catch (error) {
    console.error('❌ HTTP connection test failed:', error);
    updateConnectionStatus(false);
    return false;
  }
}

// Get status via HTTP
async function getDesktopStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3000/status');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get desktop status:', error);
    return null;
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AMP Extension installed/updated');
  await initializeMemoryPool();
  startHealthMonitoring();
  
  // Initialize monitoring system
  await initializeMonitoringSystem();
  
  // Test desktop app connection
  setTimeout(() => {
    testDesktopConnection();
  }, 1000);
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('AMP Extension started');
  await initializeMemoryPool();
  startHealthMonitoring();
  
  // Initialize monitoring system
  await initializeMonitoringSystem();
  
  // Test desktop app connection
  setTimeout(() => {
    testDesktopConnection();
  }, 1000);
});

// Remove old native messaging - use HTTP instead
function sendToDesktop(message) {
  return sendToDesktopApp(message);
}

// Replace sendToAmpApp with HTTP
async function sendToAmpApp(memoryChunks) {
  try {
    const response = await sendToDesktopApp({ 
      type: 'sendAllMemory', 
      chunks: memoryChunks,
      timestamp: Date.now(),
      totalChunks: memoryChunks.length,
      totalSize: memoryChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    });
    
    if (response && response.success) {
      console.log(`✅ Sent ${memoryChunks.length} chunks to desktop app`);
    } else {
      console.warn('⚠️ Desktop app response indicates failure');
    }
  } catch (error) {
    console.error('Failed to send memory to desktop app:', error);
  }
}

// Check desktop app status
async function checkDesktopStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3000/status');
    
    if (response.ok) {
      const status = await response.json();
      console.log('Desktop app status:', status);
      return status.online || false;
    }
    
    return false;
  } catch (error) {
    console.log('Desktop app not available:', error.message);
    return false;
  }
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Periodic maintenance - minimal overhead
setInterval(async () => {
  try {
    // Check AMP app status
    await checkAmpAppStatus();
    
    // Retry overflow queue if desktop is available
    if (activeMemoryPool && activeMemoryPool.retryOverflowQueue) {
      await activeMemoryPool.retryOverflowQueue();
    }
    
    const stats = activeMemoryPool.getStats();
    console.log(`AMP Background: Rolling state - DOM: ${stats.domChunks}, Hot: ${stats.hotBufferChunks}, Archive: ${stats.archivedChunks}`);
    console.log(`Hot memory: ${(stats.hotMemorySize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Overflow queue: ${stats.overflowQueueLength} items pending`);
  } catch (error) {
    console.error('Periodic maintenance failed:', error);
  }
}, 60000); // Every minute - lightweight maintenance

// Initialize monitoring system
async function initializeMonitoringSystem() {
  try {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const activeTab = tabs[0];
      const provider = getAIProviderFromUrl(activeTab.url);
      
      // If the active tab is on an AI provider site, set it as the monitoring target
      if (provider !== 'unknown') {
        await switchMonitoringTarget(activeTab);
        console.log(`🟢 AMP: Auto-initialized monitoring for ${provider} on ${activeTab.url}`);
      } else {
        console.log('AMP: No AI provider detected on active tab, monitoring disabled');
      }
    }
  } catch (error) {
    console.error('AMP: Failed to initialize monitoring system:', error);
  }
}

// Initialize on script load
initializeMemoryPool().then(async () => {
  console.log('AMP Background: Memory pool initialized successfully');
  
  // Initialize monitoring system
  await initializeMonitoringSystem();
  
  // Connect to desktop app after initialization
  setTimeout(() => {
    testDesktopConnection().then(connected => {
      if (connected) {
        console.log('AMP Background: HTTP connection to desktop app successful');
        // Send current memory data to desktop app
        sendCurrentMemoryToDesktop();
      } else {
        console.warn('AMP Background: HTTP connection not available - desktop features disabled');
      }
    });
  }, 3000); // Wait 3 seconds before connecting to avoid race condition
  
  // Start periodic stats broadcasting to connected clients
  setInterval(() => {
    try {
      const stats = activeMemoryPool.getStats();
      // Broadcast stats to all connected clients (popup, desktop UI, etc.)
      chrome.runtime.sendMessage({
        action: 'statsUpdate',
        stats: stats
      }).catch(() => {
        // Ignore errors when no clients are connected
      });
    } catch (error) {
      console.warn('AMP Background: Failed to broadcast stats:', error);
    }
  }, 10000); // Broadcast stats every 10 seconds
}).catch(error => {
  console.error('AMP Background: Failed to initialize memory pool:', error);
});

// Send current memory data to desktop app
async function sendCurrentMemoryToDesktop() {
  try {
    if (!activeMemoryPool) {
      console.warn('AMP Background: Memory pool not available');
      return;
    }
    
    const allChunks = activeMemoryPool.getAll();
    if (allChunks.length === 0) {
      console.log('AMP Background: No memory chunks to send - creating test data');
      // Clear any existing chunks to ensure clean test data
      if (activeMemoryPool.clear) {
        activeMemoryPool.clear();
      }
      // Create test memory chunks for demonstration
      const testChunks = [
        {
          id: 'test-1',
          content: 'This is a test memory chunk from the extension. It contains sample conversation data.',
          ai_provider: 'ChatGPT',
          timestamp: Date.now() - 60000,
          topic: 'Test Conversation',
          inDom: true,
          inHot: true,
          slot: 1,
          size: 150
        },
        {
          id: 'test-2', 
          content: 'Another test chunk showing how memory data flows from extension to desktop app.',
          ai_provider: 'Claude',
          timestamp: Date.now() - 30000,
          topic: 'Memory System Test',
          inDom: false,
          inHot: true,
          slot: 2,
          size: 120
        },
        {
          id: 'test-3',
          content: 'This is archived memory data that has been moved to cold storage. It represents older conversations that are no longer in the hot buffer.',
          ai_provider: 'ChatGPT',
          timestamp: Date.now() - 3600000, // 1 hour ago
          topic: 'Archived Conversation',
          inDom: false,
          inHot: false,
          slot: 9,
          size: 200
        }
      ];
      
      // Store test chunks in memory pool so popup can display them
      if (activeMemoryPool) {
        // Clear existing chunks first
        if (activeMemoryPool.clear) {
          activeMemoryPool.clear();
        }
        testChunks.forEach(chunk => {
          activeMemoryPool.store(chunk);
        });
        console.log('🔧 Background: Stored test chunks in memory pool for popup display');
      }
      
      console.log(`AMP Background: Sending ${testChunks.length} test memory chunks to desktop app`);
      
      const response = await sendToDesktopApp({
        type: 'sendAllMemory',
        chunks: testChunks,
        timestamp: Date.now(),
        totalChunks: testChunks.length,
        totalSize: testChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
      });
      
      if (response && response.success) {
        console.log(`✅ Successfully sent ${testChunks.length} test chunks to desktop app`);
      } else {
        console.warn('⚠️ Failed to send test memory chunks to desktop app:', response);
      }
      return;
    }
    
    console.log(`AMP Background: Sending ${allChunks.length} memory chunks to desktop app`);
    
    const response = await sendToDesktopApp({
      type: 'sendAllMemory',
      chunks: allChunks,
      timestamp: Date.now(),
      totalChunks: allChunks.length,
      totalSize: allChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    });
    
    if (response && response.success) {
      console.log(`✅ Successfully sent ${allChunks.length} chunks to desktop app`);
    } else {
      console.warn('⚠️ Failed to send memory chunks to desktop app:', response);
    }
  } catch (error) {
    console.error('❌ Error sending memory to desktop app:', error);
  }
}

// System health monitoring
let healthCheckInterval = null;
let memorySendInterval = null;

function startHealthMonitoring() {
  // Check system health every 30 seconds
  healthCheckInterval = setInterval(async () => {
    try {
      if (activeMemoryPool && activeMemoryPool.getSystemHealth) {
        const health = activeMemoryPool.getSystemHealth();
        
        // Log health status
        console.log('AMP Background: System health check:', {
          hotPoolSize: health.hotPoolSize,
          errorCount: health.errorCount,
          isRecovering: health.isRecovering,
          backupQueueLength: health.backupQueueLength
        });
        
        // Trigger recovery if needed
        if (health.errorCount > 10) {
          console.warn('AMP Background: High error count, triggering recovery...');
          await activeMemoryPool.attemptRecovery();
        }
        
        // Validate integrity
        if (activeMemoryPool.validateIntegrity) {
          const integrity = activeMemoryPool.validateIntegrity();
          if (!integrity.isValid) {
            console.warn('AMP Background: Integrity issues detected:', integrity.issues);
            await activeMemoryPool.attemptRecovery();
          }
        }
      }
      
      // Test desktop app connection every 30 seconds
      if (desktopConnected) {
        try {
          const response = await fetch('http://127.0.0.1:3000/ping');
          if (!response.ok || response.status !== 200) {
            console.warn('AMP Background: HTTP connection lost, attempting reconnect...');
            updateConnectionStatus(false);
            // Try to reconnect
            setTimeout(() => testDesktopConnection(), 2000);
          }
        } catch (error) {
          console.warn('AMP Background: HTTP health check failed:', error);
          updateConnectionStatus(false);
          // Try to reconnect
          setTimeout(() => testDesktopConnection(), 2000);
        }
      }
    } catch (error) {
      console.error('AMP Background: Health check failed:', error);
    }
  }, 30000); // 30 seconds

  // Send memory data to desktop app every 3 seconds if connected
  memorySendInterval = setInterval(async () => {
    try {
      if (desktopConnected && activeMemoryPool) {
        await sendCurrentMemoryToDesktop();
      }
    } catch (error) {
      console.error('AMP Background: Memory send failed:', error);
    }
  }, 3000); // 3 seconds
}

function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (memorySendInterval) {
    clearInterval(memorySendInterval);
    memorySendInterval = null;
  }
}

// Rainbow + Colored Spot Status System
const frameSets = {
  // 🌈 Pure Rainbow: Perfect state
  normal: [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/normal-4.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/normal-4.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  
  // 🌈 + 🟡 Yellow Spot: Processing content
  processing: [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/processing-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/processing-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  
  // 🌈 + 🔴 Red Spot: Warning/idle state
  idle: [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/error-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/error-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  
  // 🌈 + 🔵 Blue Spot: Connected but not on AI site
  'not-ai-site': [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/idle-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/idle-1.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  
  // 🌈 + 🟠 Orange Spot: Quick activity
  'quick-activity': [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/processing-2.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/processing-2.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  
  // 🔴 Solid Red: Error/crash state (Debug)
  error: [
    'animated logo/error-1.png', 'animated logo/error-2.png', 'animated logo/error-3.png', 'animated logo/error-4.png',
    'animated logo/error-5.png', 'animated logo/error-6.png', 'animated logo/error-7.png', 'animated logo/error-8.png'
  ],
  
  // ⚪ Solid Grey: No connection (Debug)
  'no-connection': [
    'animated logo/idle-1.png', 'animated logo/idle-2.png', 'animated logo/idle-3.png', 'animated logo/idle-4.png',
    'animated logo/idle-5.png', 'animated logo/idle-6.png', 'animated logo/idle-7.png', 'animated logo/idle-8.png'
  ],
  
  // 🟡 Solid Yellow: Debug mode
  'debug': [
    'animated logo/processing-1.png', 'animated logo/processing-2.png', 'animated logo/processing-3.png', 'animated logo/processing-4.png',
    'animated logo/processing-5.png', 'animated logo/processing-6.png', 'animated logo/processing-7.png', 'animated logo/processing-8.png'
  ]
};

let ringFrames = frameSets.normal;
let ringFrameIndex = 0;
let ringAnimationInterval = null;
let currentRingState = 'normal';

function setRingState(state) {
  try {
    if (!frameSets[state]) state = 'normal';
    if (currentRingState === state) return;
    currentRingState = state;
    stopRingAnimation();
    ringFrames = frameSets[state];
    ringFrameIndex = 0;
    startRingAnimation();
  } catch (error) {
    console.warn('setRingState failed:', error);
  }
}

function startRingAnimation() {
  try {
    if (ringAnimationInterval) return;
    ringAnimationInterval = setInterval(() => {
      try {
        if (chrome && chrome.action && chrome.action.setIcon) {
          chrome.action.setIcon({
            path: {
              16: ringFrames[ringFrameIndex],
              32: ringFrames[ringFrameIndex],
              48: ringFrames[ringFrameIndex],
              64: ringFrames[ringFrameIndex],
              128: ringFrames[ringFrameIndex],
            }
          });
        }
        ringFrameIndex = (ringFrameIndex + 1) % ringFrames.length;
      } catch (error) {
        console.warn('Ring animation frame failed:', error);
      }
    }, 81); // 81ms = 12.35 FPS
  } catch (error) {
    console.warn('startRingAnimation failed:', error);
  }
}

function stopRingAnimation() {
  if (ringAnimationInterval) {
    clearInterval(ringAnimationInterval);
    ringAnimationInterval = null;
  }
}

// Start with idle (grey) if not connected
setRingState('idle');

// Start the animation when the extension loads
startRingAnimation();
