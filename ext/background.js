// © 2025 AMPIQ All rights reserved.
// Background script for cross-tab memory management and AMP app communication
// Hot Memory Priority - minimal storage, maximum performance
// Version: 4.0.0 - Production

// Production logging - MUST be declared before importScripts
const AMP_DEBUG = false;

// IMPORTANT: importScripts MUST be near the top, synchronously
// This is a Chrome Service Worker requirement
importScripts('utils.js');
importScripts('license.js');

// Background-specific logging (utils.js and license.js have their own)
const logBg = (...args) => AMP_DEBUG && console.log('[AMP Background]', ...args);
const logBgError = (...args) => console.error('[AMP Background]', ...args);

// Alias for log() used throughout the file
const log = logBg;
const logError = logBgError;

// ============================================================
// RING ANIMATION - MUST BE AT TOP FOR IMMEDIATE START
// ============================================================
const frameSets = {
  normal: [
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/normal-4.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png',
    'animated logo/normal-1.png', 'animated logo/normal-2.png', 'animated logo/normal-3.png', 'animated logo/normal-4.png',
    'animated logo/normal-5.png', 'animated logo/normal-6.png', 'animated logo/normal-7.png', 'animated logo/normal-8.png'
  ],
  processing: [
    'animated logo/processing-1.png', 'animated logo/processing-2.png', 'animated logo/processing-3.png', 'animated logo/processing-4.png',
    'animated logo/processing-5.png', 'animated logo/processing-6.png', 'animated logo/processing-7.png', 'animated logo/processing-8.png',
    'animated logo/processing-1.png', 'animated logo/processing-2.png', 'animated logo/processing-3.png', 'animated logo/processing-4.png',
    'animated logo/processing-5.png', 'animated logo/processing-6.png', 'animated logo/processing-7.png', 'animated logo/processing-8.png'
  ],
  idle: [
    'animated logo/idle-1.png', 'animated logo/idle-2.png', 'animated logo/idle-3.png', 'animated logo/idle-4.png',
    'animated logo/idle-5.png', 'animated logo/idle-6.png', 'animated logo/idle-7.png', 'animated logo/idle-8.png',
    'animated logo/idle-1.png', 'animated logo/idle-2.png', 'animated logo/idle-3.png', 'animated logo/idle-4.png',
    'animated logo/idle-5.png', 'animated logo/idle-6.png', 'animated logo/idle-7.png', 'animated logo/idle-8.png'
  ],
  error: [
    'animated logo/error-1.png', 'animated logo/error-2.png', 'animated logo/error-3.png', 'animated logo/error-4.png',
    'animated logo/error-5.png', 'animated logo/error-6.png', 'animated logo/error-7.png', 'animated logo/error-8.png',
    'animated logo/error-1.png', 'animated logo/error-2.png', 'animated logo/error-3.png', 'animated logo/error-4.png',
    'animated logo/error-5.png', 'animated logo/error-6.png', 'animated logo/error-7.png', 'animated logo/error-8.png'
  ],
  'quick-activity': [
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

// START ANIMATION IMMEDIATELY
startRingAnimation();
// ============================================================

// ADAPTIVE PERFORMANCE CONFIGURATION
// Detects system capabilities and adjusts accordingly
const PERF_CONFIG = {
  // Base interval frequencies (in ms)
  STATS_UPDATE_INTERVAL: 15000,      // 15s base
  HEALTH_CHECK_INTERVAL: 30000,      // 30s base
  CONNECTION_RETRY_INTERVAL: 30000,  // 30s base
  MEMORY_SEND_INTERVAL: 5000,        // 5s base
  MAINTENANCE_INTERVAL: 60000,       // 1min base
  STATS_BROADCAST_INTERVAL: 10000,   // 10s base
  
  // Memory limits - can use more RAM for better performance
  MAX_QUEUE_SIZE: 1000,              // Allow larger queue
  MAX_ACTIVITY_ENTRIES: 100,         // More activity history
  MAX_HOT_MEMORY_MB: 50,             // Up to 50MB hot memory when available
  
  // Throttling
  IDLE_THRESHOLD: 120000,            // 2 minutes = idle (more lenient)
  THROTTLE_MULTIPLIER_IDLE: 2,       // 2x slower when idle (less aggressive)
  
  // Performance mode
  performanceMode: 'balanced',       // 'power-saver', 'balanced', 'performance'
};

// Detect system capabilities and adjust performance
async function detectSystemCapabilities() {
  try {
    // Check available memory (if API available)
    if (navigator.deviceMemory) {
      const memoryGB = navigator.deviceMemory;
      log(`📊 System memory: ${memoryGB}GB`);
      
      if (memoryGB >= 8) {
        // High-end system - use more resources
        PERF_CONFIG.performanceMode = 'performance';
        PERF_CONFIG.MAX_HOT_MEMORY_MB = 100;
        PERF_CONFIG.STATS_UPDATE_INTERVAL = 10000;
        PERF_CONFIG.MEMORY_SEND_INTERVAL = 3000;
        log('📊 Performance mode: HIGH (8GB+ RAM detected)');
      } else if (memoryGB >= 4) {
        // Mid-range system - balanced
        PERF_CONFIG.performanceMode = 'balanced';
        PERF_CONFIG.MAX_HOT_MEMORY_MB = 50;
        log('📊 Performance mode: BALANCED (4GB+ RAM detected)');
      } else {
        // Low-end system - conserve resources
        PERF_CONFIG.performanceMode = 'power-saver';
        PERF_CONFIG.MAX_HOT_MEMORY_MB = 25;
        PERF_CONFIG.STATS_UPDATE_INTERVAL = 30000;
        PERF_CONFIG.MEMORY_SEND_INTERVAL = 10000;
        PERF_CONFIG.THROTTLE_MULTIPLIER_IDLE = 4;
        log('📊 Performance mode: POWER-SAVER (low RAM detected)');
      }
    }
    
    // Check for hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency) {
      const cores = navigator.hardwareConcurrency;
      log(`📊 CPU cores: ${cores}`);
      
      if (cores >= 8) {
        // Many cores - can do more parallel processing
        PERF_CONFIG.MAX_QUEUE_SIZE = 2000;
      }
    }
    
    // Check connection type for network-related settings
    if (navigator.connection) {
      const conn = navigator.connection;
      log(`📊 Connection: ${conn.effectiveType}, downlink: ${conn.downlink}Mbps`);
      
      if (conn.effectiveType === '4g' && conn.downlink >= 10) {
        // Fast connection - can sync more frequently
        PERF_CONFIG.MEMORY_SEND_INTERVAL = Math.min(PERF_CONFIG.MEMORY_SEND_INTERVAL, 3000);
      }
    }
    
  } catch (error) {
    log('📊 Could not detect system capabilities, using balanced defaults');
  }
}

// Initialize capability detection
detectSystemCapabilities();

// Idle state tracking
let isExtensionIdle = false;
let lastActivityTime = Date.now();
let activeIntervalIds = [];

// Function to stop all active intervals (for license deactivation)
function stopAllIntervals() {
  log('Stopping all active intervals...');
  activeIntervalIds.forEach(id => {
    try {
      clearInterval(id);
    } catch (e) {
      // Ignore errors clearing intervals
    }
  });
  activeIntervalIds = [];
}

log('✅ AMP Background: utils.js imported successfully');

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
        logError('Stats listener error:', error);
      }
    });
  }
}

// Global stats manager instance
const statsManager = new StatsManager();

// Broadcast stats to all open extension pages (popups, windows)
statsManager.addListener((stats) => {
  try {
    chrome.runtime.sendMessage({
      type: 'statsUpdate',
      action: 'statsUpdate',
      stats: stats
    }).catch(() => {
      // Silently ignore if no receivers (popup closed)
    });
  } catch (error) {
    // Ignore broadcast errors
  }
});

// Simplified Connection Management - Single Desktop App
let desktopConnected = false;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 5;

// Analytics initialization will happen after AMPAnalytics class is defined (see line ~1600)

// Initialize memory pool on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeMemoryPool();
  startHealthMonitoring();
  // Clear any persistent badges
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  
  // Initialize native messaging after a delay
  setTimeout(async () => {
    try {
      initializeNativeMessaging();
    } catch (error) {
      logError('Native messaging failed during startup:', error);
    }
  }, 3000);
  
  // Retry connection every 60 seconds if not connected (reduced frequency)
  // But only if native host is registered (not if "host not found" error)
  const retryInterval = setInterval(async () => {
    // Skip if idle
    if (isExtensionIdle) return;
    
    // Skip if we know the host isn't registered
    if (globalThis._nativeHostNotRegisteredLogged) {
      return; // Don't retry if host isn't registered
    }
    
    if (!desktopConnected) {
      log('🔄 Retrying native messaging connection...');
      try {
        await testDesktopConnection();
      } catch (error) {
        // Only log if it's not a "host not found" error
        if (!error.message || (!error.message.includes('host not found') && !error.message.includes('not registered'))) {
          logError('Native messaging retry failed:', error);
        }
      }
    }
  }, PERF_CONFIG.CONNECTION_RETRY_INTERVAL);
  activeIntervalIds.push(retryInterval);
  
  // Update stats every 30 seconds (reduced from 10s)
  const statsInterval = setInterval(() => {
    // Skip if idle
    if (isExtensionIdle) return;
    
    try {
      updateStats();
    } catch (error) {
      logError('Failed to update stats:', error);
    }
  }, PERF_CONFIG.STATS_UPDATE_INTERVAL);
  activeIntervalIds.push(statsInterval);
});

// Initialize memory pool on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeMemoryPool();
  startHealthMonitoring();
  // Clear any persistent badges
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
  
  // Initialize native messaging after a delay
  setTimeout(async () => {
    initializeNativeMessaging();
  }, 3000);
  
  log('AMP: Extension installed and ready');
});

// Cleanup on shutdown
chrome.runtime.onSuspend.addListener(async () => {
  log('AMP Background: Extension shutting down, performing cleanup...');
  
  // Stop health monitoring
  stopHealthMonitoring();
  
  // Final save if memory pool exists
  if (activeMemoryPool && activeMemoryPool.saveToStorage) {
    try {
      await activeMemoryPool.saveToStorage();
      log('AMP Background: Final save completed');
    } catch (error) {
      logError('AMP Background: Final save failed:', error);
    }
  }
  
  log('AMP Background: Cleanup completed');
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
      log(`🔴 Processing ${bytesProcessed} bytes - Ring should be glowing`);
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
      log('🔄 Closed existing AMP window before opening new one');
      ampWindowId = null;
      ampWindowOpen = false;
    } catch (error) {
      logError('Failed to close existing window:', error);
    }
  }
  
  // Wait a moment for window to close, then open new one
  setTimeout(async () => {
  try {
      log('🚀 Opening new AMP window...');
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
          log('🔄 Using center positioning to avoid cutoff');
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
      log('✅ AMP sidebar window opened successfully:', ampWindowId);
  } catch (error) {
    logError('❌ Failed to open AMP window:', error);
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
      log('AMP window closed');
    } catch (error) {
      logError('Failed to close AMP window:', error);
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
    
    log(`🔄 AMP: Switched monitoring from tab ${previousTabId} to tab ${activeMonitoringTabId} (window ${activeMonitoringWindowId})`);
    
    // Notify all tabs about the monitoring change
    await notifyTabsAboutMonitoringChange(previousTabId, activeMonitoringTabId);
    
    // Update the extension icon to show which window is being monitored
    await updateMonitoringIndicator();
    
    // Update tab info for the new target
    await updateTabInfo(tab.id, tab.url);
    
    // Show notification to user
    await showMonitoringSwitchNotification(tab);
    
  } catch (error) {
    logError('Failed to switch monitoring target:', error);
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
        log(`🔴 Notified tab ${previousTabId} to stop monitoring`);
      } catch (error) {
        // Tab might be closed or not have content script
        log(`Tab ${previousTabId} not available for monitoring status update`);
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
        log(`🟢 Notified tab ${newTabId} to start monitoring`);
      } catch (error) {
        // Tab might not have content script yet
        log(`Tab ${newTabId} not ready for monitoring status update`);
      }
    }
  } catch (error) {
    logError('Failed to notify tabs about monitoring change:', error);
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
      
      log(`🟢 Updated monitoring indicator for ${provider}`);
    } else {
      // No active monitoring
      chrome.action.setTitle({ title: 'AMP - Auto Memory Persistence (No active monitoring)' });
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
    }
  } catch (error) {
    logError('Failed to update monitoring indicator:', error);
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
    
    log(`📢 Notification: Now monitoring ${provider} on ${hostname}`);
  } catch (error) {
    logError('Failed to show monitoring switch notification:', error);
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
    
    log(`💡 Hint: ${provider} on ${hostname} can be monitored`);
  } catch (error) {
    // Tab might not have content script yet, which is normal
    log(`Tab ${tab.id} not ready for monitoring hint`);
  }
}

// Listen for window closing
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === ampWindowId) {
    ampWindowId = null;
    ampWindowOpen = false;
    log('AMP window was closed by user');
  }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  const now = Date.now();
  
  // Debounce rapid clicks
  if (now - lastIconClickTime < ICON_CLICK_DEBOUNCE) {
    log('🔴 Extension icon click debounced');
    return;
  }
  lastIconClickTime = now;
  
  log('🔴 Extension icon clicked - switching monitoring target');
  
  // Switch monitoring to the current tab/window
  await switchMonitoringTarget(tab);
  
  // Open the AMP window if not already open
  if (!ampWindowOpen) {
    await openAmpWindow();
  }
});

async function initializeMemoryPool() {
  try {
    // Try to use the real MemoryPool class from utils.js
    if (typeof MemoryPool !== 'undefined') {
      log('✅ AMP Background: Using REAL MemoryPool class from utils.js');
      activeMemoryPool = new MemoryPool();
      
      // Load existing data from storage
      const loadSuccess = await activeMemoryPool.loadFromStorage();
      if (loadSuccess) {
        log('✅ AMP Background: Loaded existing memory data from storage');
      } else {
        log('ℹ️ AMP Background: No existing memory data found, starting fresh');
      }
      
      log('✅ AMP Background: Real MemoryPool initialized with:');
      log(`   - 5x1MB hot slots`);
      log(`   - S1-S9 progression system`);
      log(`   - Dual zipper (fat + thin)`);
      log(`   - Desktop overflow support`);
      
      return true;
    }
    
    // Fallback if MemoryPool class not available
    console.warn('⚠️ AMP Background: MemoryPool class not found, using fallback mode...');
    activeMemoryPool = createFallbackMemoryPool();
    
    log('AMP Background: Fallback memory pool initialized');
    return true;
  } catch (error) {
    logError('❌ AMP Background: Failed to initialize memory pool:', error);
    
    // Create fallback on error
    activeMemoryPool = createFallbackMemoryPool();
    return false;
  }
}

// Fallback memory pool for when MemoryPool class is not available
function createFallbackMemoryPool() {
  return {
    hotPool: new Map(),
    domMirror: new Map(),
    conversationIndex: new Map(),
    providerIndex: new Map(),
    topicIndex: new Map(),
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
      lastUpdated: Date.now()
    },
    
    getStats: function() {
      const chunks = Array.from(this.hotPool.values());
      const providers = [...new Set(chunks.map(c => c.ai_provider))];
      const topics = [...new Set(chunks.map(c => c.topic))];
      
      return {
        domChunks: chunks.filter(c => c.inDom).length,
        hotBufferChunks: chunks.filter(c => c.inHot && !c.inDom).length,
        archivedChunks: chunks.filter(c => c.slot === 9).length,
        totalChunks: chunks.length,
        hotMemorySize: chunks.reduce((sum, c) => sum + (c.size || 0), 0),
        domSize: chunks.filter(c => c.inDom).reduce((sum, c) => sum + (c.size || 0), 0),
        hotBufferSize: chunks.filter(c => c.inHot).reduce((sum, c) => sum + (c.size || 0), 0),
        archiveSize: chunks.filter(c => c.slot === 9).reduce((sum, c) => sum + (c.size || 0), 0),
        messageRate: 0,
        growthRate: 0,
        providers: providers,
        topics: topics,
        lastUpdated: Date.now(),
        slotStats: [
          { id: 1, currentSize: 0, maxSize: 1024*1024, chunkCount: 0, utilization: '0%' },
          { id: 2, currentSize: 0, maxSize: 1024*1024, chunkCount: 0, utilization: '0%' },
          { id: 3, currentSize: 0, maxSize: 1024*1024, chunkCount: 0, utilization: '0%' },
          { id: 4, currentSize: 0, maxSize: 1024*1024, chunkCount: 0, utilization: '0%' },
          { id: 5, currentSize: 0, maxSize: 1024*1024, chunkCount: 0, utilization: '0%' }
        ],
        overflowQueueLength: 0
      };
    },
    
    getLiveBytesCount: function() {
      const totalBytes = Array.from(this.hotPool.values()).reduce((sum, c) => sum + (c.size || 0), 0);
      const domMirrorBytes = Array.from(this.domMirror.values()).reduce((sum, c) => sum + (c.size || 0), 0);
      
      return {
        summaryIndexBytes: totalBytes,
        rawArchiveBytes: domMirrorBytes,
        totalBytes: totalBytes + domMirrorBytes,
        summaryIndexMB: (totalBytes / (1024 * 1024)).toFixed(2),
        rawArchiveMB: (domMirrorBytes / (1024 * 1024)).toFixed(2),
        totalMB: ((totalBytes + domMirrorBytes) / (1024 * 1024)).toFixed(2),
        timestamp: Date.now(),
        chunksPerSecond: 0,
        bytesPerSecond: 0
      };
    },
    
    getAll: function() {
      return Array.from(this.hotPool.values());
    },
    
    getAllChunks: function() {
      return Array.from(this.hotPool.values());
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
          size: text.length,
          slot: 1,
          inDom: true,
          inHot: true
        };
        
        this.hotPool.set(chunk.id, chunk);
        
        // Update conversation index
        const convChunks = this.conversationIndex.get(chunk.conversation_id) || [];
        convChunks.push(chunk.id);
        this.conversationIndex.set(chunk.conversation_id, convChunks);
        
        // Update provider index
        const providerConvs = this.providerIndex.get(chunk.ai_provider) || new Set();
        providerConvs.add(chunk.conversation_id);
        this.providerIndex.set(chunk.ai_provider, providerConvs);
        
        log(`AMP Background: Chunk added (fallback) - ${text.length} chars`);
        return chunk;
      } catch (error) {
        logError('AMP Background: Failed to add chunk:', error);
        return null;
      }
    },
    
    // Get conversation chunks by conversation ID
    getConversation: function(conversationId) {
      const chunkIds = this.conversationIndex.get(conversationId) || [];
      return chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
    },
    
    // Get cross-provider context
    getCrossProviderContext: function(query, maxResults = 2) {
      const results = [];
      const queryLower = (query || '').toLowerCase();
      
      for (const [convId, chunkIds] of this.conversationIndex) {
        const chunks = chunkIds.map(id => this.hotPool.get(id)).filter(Boolean);
        if (chunks.length === 0) continue;
        
        // Simple relevance scoring
        const matchingChunks = chunks.filter(chunk => {
          const text = (chunk.fullText || chunk.summary || '').toLowerCase();
          return queryLower === '' || text.includes(queryLower);
        });
        
        if (matchingChunks.length > 0) {
          results.push(...matchingChunks.slice(0, 1));
        }
        
        if (results.length >= maxResults) break;
      }
      
      return results.slice(0, maxResults);
    },
    
    getSmartContextForInjection: async function(query, conversationId, maxTokens) {
      const chunks = this.getConversation(conversationId);
      return chunks.map(chunk => chunk.fullText).join('\n\n').substring(0, maxTokens);
    },
    
    searchThinZipper: async function(query) {
      return Array.from(this.hotPool.values()).map(chunk => ({
        address: chunk.id,
        relevance: 0.8,
        summary: chunk.summary
      }));
    },
    
    retrieveFromFatZipper: async function(address) {
      const chunk = this.hotPool.get(address);
      return chunk ? { chunk, s1s9Data: {} } : null;
    },
    
    performWaterfallCascade: async function() {
      log('AMP Background: Waterfall cascade triggered (fallback)');
    },
    
    performReverseInjection: async function() {
      log('AMP Background: Reverse injection triggered (fallback)');
      return [];
    },
    
    retryOverflowQueue: async function() {
      log('AMP Background: Overflow queue retry (fallback)');
    },
    
    saveToStorage: async function() {
      // Save to chrome.storage.local
      try {
        const data = {
          hotPool: Object.fromEntries(this.hotPool),
          conversationIndex: Object.fromEntries(this.conversationIndex),
          providerIndex: Object.fromEntries(
            Array.from(this.providerIndex.entries()).map(([k, v]) => [k, Array.from(v)])
          )
        };
        await chrome.storage.local.set({ amp_fallback_data: data });
        return true;
      } catch (error) {
        logError('Failed to save fallback data:', error);
        return false;
      }
    },
    
    loadFromStorage: async function() {
      try {
        const result = await chrome.storage.local.get(['amp_fallback_data']);
        if (result.amp_fallback_data) {
          const data = result.amp_fallback_data;
          this.hotPool = new Map(Object.entries(data.hotPool || {}));
          this.conversationIndex = new Map(Object.entries(data.conversationIndex || {}));
          this.providerIndex = new Map(
            Object.entries(data.providerIndex || {}).map(([k, v]) => [k, new Set(v)])
          );
          return true;
        }
        return false;
      } catch (error) {
        logError('Failed to load fallback data:', error);
        return false;
      }
    }
  };
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
    log('🔄 AMP: Monitoring target closed, monitoring disabled');
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
      log(`AMP Background: Updated tab ${tabId} - ${provider} (${hostname})`);
    }
  } catch (error) {
    logError('Failed to update tab info:', error);
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
    logError('Error checking context carryover:', error);
    return false;
  }
}

// Show context carryover prompt
async function showContextCarryoverPrompt(tabId, provider, hostname) {
  try {
    // Check if tab exists and is accessible before sending message
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      log(`AMP Background: Tab ${tabId} not found or not accessible, skipping context carryover prompt`);
      return;
    }
    
    // Create a notification to the user
    await chrome.tabs.sendMessage(tabId, {
      action: 'showContextCarryoverPrompt',
      provider,
      hostname,
      timestamp: Date.now()
    });
    
    log(`AMP Background: Context carryover prompt sent to tab ${tabId}`);
  } catch (error) {
    // Don't log errors for tabs that don't exist - this is expected
    if (error.message.includes('Receiving end does not exist') || error.message.includes('Could not establish connection')) {
      log(`AMP Background: Tab ${tabId} not ready for messages, skipping context carryover prompt`);
    } else {
      logError('Failed to show context carryover prompt:', error);
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

// Idle detection - check every 30 seconds
setInterval(() => {
  const timeSinceActivity = Date.now() - lastActivityTime;
  const wasIdle = isExtensionIdle;
  isExtensionIdle = timeSinceActivity > PERF_CONFIG.IDLE_THRESHOLD;
  
  if (isExtensionIdle !== wasIdle) {
    if (isExtensionIdle) {
      log('📊 AMP: Entering idle mode - reducing background activity');
    } else {
      log('📊 AMP: Resuming active mode');
    }
  }
}, 30000);

// Record activity on any message
function recordActivity() {
  lastActivityTime = Date.now();
  if (isExtensionIdle) {
    isExtensionIdle = false;
    log('📊 AMP: Activity detected - resuming active mode');
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  recordActivity(); // Track activity
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    // Reduced logging - only log important actions
    if (!['ping', 'getMemoryStats', 'statsUpdate'].includes(message.action)) {
      log('AMP Background: Received message:', message.action);
    }
    switch (message.action) {
      case 'storeMemory':
        await handleStoreMemory(message, sender);
        sendResponse({ success: true });
        return true; // Keep channel open for async
        break;
        
      case 'getMemoryStats':
        log('🔧 Background: Received getMemoryStats request');
        handleGetMemoryStats().then(stats => {
          log('🔧 Background: Sending stats response:', stats);
          sendResponse({ success: true, stats });
        }).catch(error => {
          logError('🔧 Background: Error getting stats:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async
        break;
        
      case 'get_connection_status':
        getDesktopStatus().then(status => {
          sendResponse({ 
            desktopConnected: status ? status.connected : false,
            storageAvailable: status ? status.storageAvailable : false,
            stats: status ? status.stats : null
          });
        }).catch(error => {
          sendResponse({ desktopConnected: false, error: error.message });
        });
        return true;
        break;
        
      case 'pingDesktopApp':
        testDesktopConnection().then(connected => {
          sendResponse({ success: connected });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
        break;
        
      case 'setContextCarryover':
        (async () => {
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
            
            log(`AMP Background: Context carryover preference set for ${hostname}: ${carryover}`);
            
            // Update tab info with the preference
            if (activeTabs.has(tabId)) {
              activeTabs.set(tabId, {
                ...activeTabs.get(tabId),
                contextCarryover: carryover
              });
            }
            
            sendResponse({ success: true });
          } catch (error) {
            logError('Error setting context carryover preference:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true;
        break;
        
      case 'clearContextCarryoverPreference':
        (async () => {
          try {
            const hostname = new URL(sender.tab.url).hostname;
            
            // Remove user preference for this site
            const result = await chrome.storage.local.get(['amp_context_carryover_preferences']);
            const preferences = result.amp_context_carryover_preferences || {};
            delete preferences[hostname];
            
            await chrome.storage.local.set({
              amp_context_carryover_preferences: preferences
            });
            
            log(`AMP Background: Context carryover preference cleared for ${hostname}`);
            sendResponse({ success: true });
          } catch (error) {
            logError('Error clearing context carryover preference:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true;
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
        switchMonitoringTarget(sender.tab).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
        break;
        
      case 'getTabId':
        try {
          const tabId = sender.tab?.id;
          sendResponse({ success: true, tabId: tabId });
        } catch (error) {
          logError('Error getting tab ID:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'triggerCascade':
        try {
          log('💧 AMP Background: Memory cascade triggered - pushing data to desktop app via native messaging');
          
          // Perform waterfall cascade in memory pool
          if (activeMemoryPool && activeMemoryPool.performWaterfallCascade) {
            await activeMemoryPool.performWaterfallCascade();
          }
          
          // Send ALL current memory to desktop app via NATIVE MESSAGING (not HTTP)
          if (desktopConnected && nativePort) {
            const allChunks = activeMemoryPool ? activeMemoryPool.getAllChunks() : [];
            
            if (allChunks.length > 0) {
              try {
                // Use native messaging to send cascade data
                const response = await sendNativeMessage({
                  type: 'cascadeMemory',
                  chunks: allChunks,
                  timestamp: Date.now(),
                  action: 'cascade'
                });
                
                if (response && response.success) {
                  log(`💧 AMP: Cascaded ${allChunks.length} chunks to desktop app via native messaging`);
                  
                  // Clear browser memory after successful cascade to desktop
                  // This keeps browser memory minimal when desktop app is handling storage
                  if (activeMemoryPool) {
                    // Keep only the most recent 10 chunks in browser as hot cache
                    const chunksToKeep = allChunks
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 10);
                    
                    // Clear all slots
                    for (const slot of activeMemoryPool.slots) {
                      slot.chunks.clear();
                      slot.currentSize = 0;
                    }
                    activeMemoryPool.hotPool.clear();
                    
                    // Re-add only recent chunks
                    for (const chunk of chunksToKeep) {
                      await activeMemoryPool.addChunk(chunk);
                    }
                    
                    log(`💧 AMP: Browser memory cleared, kept ${chunksToKeep.length} recent chunks as cache`);
                  }
                  
                  sendResponse({ success: true, cascaded: allChunks.length });
                } else {
                  logError('💧 AMP: Desktop cascade failed:', response?.error);
                  sendResponse({ success: false, error: response?.error || 'Cascade failed' });
                }
              } catch (nativeError) {
                logError('💧 AMP: Native messaging error:', nativeError);
                sendResponse({ success: false, error: 'Native messaging failed' });
              }
            } else {
              sendResponse({ success: true, cascaded: 0, message: 'No data to cascade' });
            }
          } else {
            // No desktop app - just perform internal cascade
            log('💧 AMP: No desktop app connected, performing internal cascade only');
            sendResponse({ success: true, cascaded: 0, message: 'Internal cascade only (no desktop)' });
          }
        } catch (error) {
          logError('💧 AMP Background: Cascade error:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'triggerInject':
        // Alias for triggerReverseInjection
        try {
          log('⬆️ AMP Background: Inject (reverse injection) triggered');
          if (activeMemoryPool && activeMemoryPool.performReverseInjection) {
            const result = await activeMemoryPool.performReverseInjection('context', '', 5);
            sendResponse({ success: true, injected: result });
          } else {
            sendResponse({ success: false, error: 'Injection not available' });
          }
        } catch (error) {
          logError('AMP Background: Inject error:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'triggerReverseInjection':
        try {
          log('🔄 AMP Background: Reverse injection triggered:', message.triggerType);
          if (activeMemoryPool && activeMemoryPool.performReverseInjection) {
            const result = await activeMemoryPool.performReverseInjection(message.triggerType || 'scroll', '', 5);
            sendResponse({ success: true, injected: result });
          } else {
            console.warn('AMP Background: performReverseInjection not available');
            sendResponse({ success: false, error: 'Reverse injection not available' });
          }
        } catch (error) {
          logError('AMP Background: Reverse injection error:', error);
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
                type: chunk.topic || chunk.type || 'conversation',
                slot: chunk.slot || 1,
                s1s9Data: chunk.s1s9Data || null,
                fatAddress: chunk.fatAddress || null
              });
            });
          }
          
          // Also try to get data from desktop app via native messaging (cold storage)
          try {
            if (nativePort && desktopConnected) {
              const desktopResponse = await sendNativeMessage({ 
                type: 'getAllMemory',
                limit: 100 
              });
              
              if (desktopResponse && desktopResponse.success && desktopResponse.chunks) {
                // Add desktop chunks that aren't already in hot pool
                const hotIds = new Set(memoryData.map(c => c.id));
                desktopResponse.chunks.forEach((chunk, index) => {
                  if (!hotIds.has(chunk.id)) {
                    memoryData.push({
                      id: chunk.id || `desktop-${index}`,
                      content: chunk.content || chunk.fullText || '',
                      provider: chunk.ai_provider || chunk.provider || 'unknown',
                      timestamp: chunk.timestamp || Date.now(),
                      index: memoryData.length,
                      type: chunk.topic || chunk.type || 'conversation',
                      slot: 'cold',
                      source: 'desktop'
                    });
                  }
                });
              }
            }
          } catch (desktopError) {
            log('🔧 Background: Desktop app not available for cold storage query');
          }
          
          log(`🔧 Background: Returning ${memoryData.length} memory chunks to UI`);
          sendResponse({ success: true, data: memoryData });
        } catch (error) {
          logError('Error getting memory data:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'sendToDesktop':
        // MemoryPool is sending overflow data to desktop
        try {
          log('🔧 Background: Received sendToDesktop request from MemoryPool:', message.type);
          const response = await sendToDesktopApp(message);
          log('🔧 Background: Desktop response:', response);
          sendResponse(response || { success: false, error: 'No response from desktop' });
        } catch (error) {
          logError('🔧 Background: sendToDesktop failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      // ==================== LICENSE MANAGEMENT ====================
      case 'getLicenseState':
        try {
          if (globalThis.AMP_License) {
            const state = globalThis.AMP_License.getState();
            sendResponse({ success: true, ...state });
          } else {
            sendResponse({ success: false, error: 'License module not loaded' });
          }
        } catch (error) {
          logError('Error getting license state:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'activateLicense':
        try {
          if (globalThis.AMP_License) {
            const result = await globalThis.AMP_License.activate(message.licenseKey);
            if (result.success) {
              // Re-initialize features based on new license
              await initializeMemoryPool();
              startHealthMonitoring();
              await initializeMonitoringSystem();
              
              if (globalThis.AMP_License.hasFeature('nativeMessaging')) {
                initializeNativeMessaging();
              }
            }
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'License module not loaded' });
          }
        } catch (error) {
          logError('Error activating license:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'deactivateLicense':
        try {
          if (globalThis.AMP_License) {
            const result = await globalThis.AMP_License.deactivate();
            // Stop features
            stopAllIntervals();
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'License module not loaded' });
          }
        } catch (error) {
          logError('Error deactivating license:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'checkLicenseFeature':
        try {
          if (globalThis.AMP_License) {
            const hasFeature = globalThis.AMP_License.hasFeature(message.feature);
            sendResponse({ success: true, hasFeature });
          } else {
            sendResponse({ success: false, hasFeature: false });
          }
        } catch (error) {
          sendResponse({ success: false, hasFeature: false, error: error.message });
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
    logError('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleStoreMemory(message, sender) {
  try {
    log('AMP Background: handleStoreMemory called with:', { content: message.content?.substring(0, 100) + '...', provider: message.provider, messageType: message.messageType });
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
      log(`✅ AMP Background: REAL DATA stored and persisted - ${messageType} (${content.length} chars):`, chunk.id);
      
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
      logError('AMP Background: ❌ Failed to store memory chunk');
    }
    
  } catch (error) {
    logError('AMP Background: ❌ Critical error in handleStoreMemory:', error);
    
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

// Initialize analytics after class definition
try {
  ampAnalytics = new AMPAnalytics();
} catch (error) {
  console.warn('Failed to initialize AMP Analytics:', error);
}

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
    
    log(`🔄 AMP Background: Context injection requested for ${provider} (${conversationId})`);
    
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
      // Show approval popup to user via content script
      const approved = await showContextInjectionPopup(context, provider, sender.tab.id);
      
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
        
        log(`✅ AMP Background: Context injection approved and sent (${context.length} chars)`);
        sendResponse({ approved: true, contextLength: context.length });
      } else {
        log('❌ AMP Background: Context injection denied by user');
        sendResponse({ approved: false });
      }
    } else {
      log('❌ AMP Background: No relevant context found for injection');
      sendResponse({ approved: false, error: 'No context available' });
    }
    
  } catch (error) {
    logError('❌ AMP Background: Error handling context injection request:', error);
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

// Show context injection approval popup via content script
// NOTE: Service Workers cannot access DOM, so we must delegate to content script
async function showContextInjectionPopup(context, provider, tabId) {
  return new Promise((resolve) => {
    // Send message to content script to show the popup
    chrome.tabs.sendMessage(tabId, {
      action: 'showInjectionApproval',
      context: context.substring(0, 500), // Limit preview size
      provider: provider
    }, (response) => {
      if (chrome.runtime.lastError) {
        logError('Failed to show injection popup:', chrome.runtime.lastError.message);
        resolve(false);
        return;
      }
      resolve(response && response.approved);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      resolve(false);
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
  
  log(`🔄 AMP Background: Processing ${desktopRetryQueue.length} queued items for desktop`);
  
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
    
    log('✅ AMP Settings updated successfully');
    if (ampAnalytics && typeof ampAnalytics.trackEvent === 'function') {
      try {
        ampAnalytics.trackEvent('settings_updated', settings);
      } catch (error) {
        console.warn('AMP Analytics tracking failed:', error);
      }
    }
  } catch (error) {
    logError('❌ Failed to update AMP settings:', error);
    throw error;
  }
}

async function handleGetMemoryStats() {
  try {
    // Get REAL stats from the active memory pool (HOT MEMORY)
    let hotStats = {
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
      totalSize: 0,
      activeTabs: activeTabs.size
    };

    if (activeMemoryPool) {
      const stats = activeMemoryPool.getStats();
      const allChunks = activeMemoryPool.getAllChunks();
      
      // Get slot details for standalone mode display
      const slotDetails = stats.slotStats || activeMemoryPool.slots?.map(slot => ({
        id: slot.id,
        currentSize: slot.currentSize || 0,
        maxSize: slot.maxSize || (1 * 1024 * 1024),
        chunkCount: slot.chunks?.size || 0,
        utilization: slot.maxSize ? ((slot.currentSize / slot.maxSize) * 100).toFixed(1) + '%' : '0%',
        usedMB: ((slot.currentSize || 0) / (1024 * 1024)).toFixed(2),
        maxMB: ((slot.maxSize || (1 * 1024 * 1024)) / (1024 * 1024)).toFixed(2)
      })) || [];
      
      const totalSlotSize = slotDetails.reduce((sum, s) => sum + (s.maxSize || 0), 0);
      const totalSlotUsed = slotDetails.reduce((sum, s) => sum + (s.currentSize || 0), 0);
      
      // Get providers, topics, conversations from actual chunks
      const providers = new Set();
      const topics = new Set();
      const conversations = new Set();
      allChunks.forEach(chunk => {
        if (chunk.ai_provider) providers.add(chunk.ai_provider);
        if (chunk.topic) topics.add(chunk.topic);
        if (chunk.conversation_id) conversations.add(chunk.conversation_id);
      });

      hotStats = {
        totalChunks: allChunks.length,
        domChunks: stats.domChunks || 0,
        hotBufferChunks: stats.hotBufferChunks || 0,
        archivedChunks: stats.archivedChunks || 0,
        hotMemorySize: stats.hotMemorySize || 0,
        domSize: stats.domSize || stats.domMirrorSize || 0,
        hotBufferSize: stats.hotBufferSize || 0,
        archiveSize: stats.archiveSize || 0,
        messageRate: stats.messageRate || 0,
        growthRate: stats.growthRate || 0,
        providers: Array.from(providers),
        topics: Array.from(topics),
        conversations: Array.from(conversations),
        lastUpdated: Date.now(),
        totalSize: allChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0),
        activeTabs: activeTabs.size,
        // Slot-level details for standalone mode
        slotStats: slotDetails,
        totalSlotSize: totalSlotSize,
        totalSlotUsed: totalSlotUsed,
        totalSlotMB: (totalSlotSize / (1024 * 1024)).toFixed(2),
        usedSlotMB: (totalSlotUsed / (1024 * 1024)).toFixed(2),
        slotUtilization: totalSlotSize ? ((totalSlotUsed / totalSlotSize) * 100).toFixed(1) + '%' : '0%'
      };
    }

    // Get COLD STORAGE stats from native host
    let coldStats = {
      coldTotalChunks: 0,
      coldStorageSize: 0,
      coldOverflowCount: 0,
      coldAllMemoryCount: 0
    };

    try {
      log('🔧 Background: Querying cold storage stats from native host...');
      const coldResponse = await sendNativeMessage({ type: 'getMemoryStats' });
      if (coldResponse && coldResponse.success && coldResponse.stats) {
        coldStats = {
          coldTotalChunks: coldResponse.stats.totalChunks || 0,
          coldStorageSize: coldResponse.stats.totalSize || 0,
          coldOverflowCount: coldResponse.stats.overflowCount || 0,
          coldAllMemoryCount: coldResponse.stats.allMemoryCount || 0
        };
        log('🔧 Background: Received cold storage stats:', coldStats);
      } else {
        console.warn('🔧 Background: No cold storage stats received');
      }
    } catch (coldError) {
      console.warn('🔧 Background: Failed to get cold storage stats:', coldError.message);
    }

    // Merge HOT + COLD stats
    const mergedStats = {
      // Hot memory (extension)
      ...hotStats,

      // Cold storage (native host/SQLite)
      coldTotalChunks: coldStats.coldTotalChunks,
      coldStorageSize: coldStats.coldStorageSize,
      coldOverflowCount: coldStats.coldOverflowCount,
      coldAllMemoryCount: coldStats.coldAllMemoryCount,

      // Combined totals
      totalChunks: hotStats.totalChunks + coldStats.coldTotalChunks,
      totalStorageSize: hotStats.totalSize + coldStats.coldStorageSize,
      storageAvailable: true, // Native host is responding

      // Data flow indicators
      hotMemoryActive: !!activeMemoryPool,
      coldStorageActive: coldStats.coldTotalChunks > 0,
      dataFlowWorking: true
    };

    log(`🔧 Background: Merged stats - Hot: ${hotStats.totalChunks}, Cold: ${coldStats.coldTotalChunks}, Total: ${mergedStats.totalChunks}`);

    // Update the stats manager with merged data
    statsManager.updateStats(mergedStats);

    return mergedStats;
  } catch (error) {
    logError('AMP Background: Error getting memory stats:', error);
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
      error: error.message,
      coldTotalChunks: 0,
      coldStorageSize: 0,
      coldOverflowCount: 0,
      coldAllMemoryCount: 0,
      storageAvailable: false,
      hotMemoryActive: false,
      coldStorageActive: false,
      dataFlowWorking: false
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
    log('All memory cleared');
}

// Send all memory to desktop app
async function handleSendAllToGUI() {
  try {
    log('🔄 Sending all memory to desktop app...');
    
    // Get all memory chunks from the pool
    const allChunks = activeMemoryPool.getAllChunks();
    log(`📦 Found ${allChunks.length} chunks to send`);
    
    if (allChunks.length === 0) {
      log('📭 No memory chunks to send');
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
      log(`✅ Successfully sent ${response.storedCount}/${response.totalCount} chunks to desktop app`);
    } else {
      console.warn('⚠️ Failed to send memory to desktop app:', response);
    }
  } catch (error) {
    logError('❌ Error sending memory to desktop app:', error);
  }
}

// Handle overflow data from memory pool
async function handleSendToDesktop(message) {
  try {
    log('🔄 Sending message to desktop app...');
    
    const response = await sendToDesktopApp(message);
    
    if (response && response.success) {
      log('✅ Message sent to desktop app successfully');
    } else {
      console.warn('⚠️ Failed to send message to desktop app:', response);
    }
    
    return response;
  } catch (error) {
    logError('❌ Error sending message to desktop app:', error);
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
    if (!activeMemoryPool) {
      logError('updateStats: activeMemoryPool is null');
      return;
    }
    
    // Get stats from memory pool (includes slot details)
    const poolStats = activeMemoryPool.getStats();
    const memories = activeMemoryPool.getAllChunks();
    
    const providers = new Set();
    const topics = new Set();
    const conversations = new Set();
    let totalSize = 0;
    let totalChars = 0;
    
    memories.forEach(mem => {
      if (mem.ai_provider) providers.add(mem.ai_provider);
      if (mem.topic) topics.add(mem.topic);
      if (mem.conversation_id) conversations.add(mem.conversation_id);
      totalSize += mem.size || 0;
      totalChars += (mem.fullText?.length || mem.content?.length || 0);
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
    
    // Calculate slot-level details for standalone mode
    const slotDetails = poolStats.slotStats || activeMemoryPool.slots?.map(slot => ({
      id: slot.id,
      currentSize: slot.currentSize || 0,
      maxSize: slot.maxSize || (1 * 1024 * 1024), // Default 1MB
      chunkCount: slot.chunks?.size || 0,
      utilization: slot.maxSize ? ((slot.currentSize / slot.maxSize) * 100).toFixed(1) + '%' : '0%',
      usedMB: ((slot.currentSize || 0) / (1024 * 1024)).toFixed(2),
      maxMB: ((slot.maxSize || (1 * 1024 * 1024)) / (1024 * 1024)).toFixed(2)
    })) || [];
    
    const totalSlotSize = slotDetails.reduce((sum, s) => sum + (s.maxSize || 0), 0);
    const totalSlotUsed = slotDetails.reduce((sum, s) => sum + (s.currentSize || 0), 0);
    
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
      // Slot-level details for standalone mode
      slotStats: slotDetails,
      totalSlotSize: totalSlotSize,
      totalSlotUsed: totalSlotUsed,
      totalSlotMB: (totalSlotSize / (1024 * 1024)).toFixed(2),
      usedSlotMB: (totalSlotUsed / (1024 * 1024)).toFixed(2),
      slotUtilization: totalSlotSize ? ((totalSlotUsed / totalSlotSize) * 100).toFixed(1) + '%' : '0%',
      systemHealth: {
        errorCount: 0,
        lastError: null,
        uptime: Date.now() - (ampAnalytics?.startTime || Date.now())
      }
    };
    
    // Update the single source of truth
    statsManager.updateStats(newStats);
    
    // Also update the memory pool stats for backward compatibility
    if (activeMemoryPool) {
      activeMemoryPool.stats = newStats;
    }
    
    // Update connection status
    updateConnectionStatus(desktopConnected);
    
  } catch (error) {
    logError('Failed to update stats:', error);
    // Set basic stats if update fails
    const errorStats = {
      totalChunks: 0,
      hotMemorySize: 0,
      providers: [],
      topics: [],
      conversations: [],
      lastUpdated: Date.now(),
      error: error.message,
      slotStats: []
    };
    
    statsManager.updateStats(errorStats);
    if (activeMemoryPool) {
      activeMemoryPool.stats = errorStats;
    }
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
      log(`Failed to send memory update to tab ${tabId}`);
    }
  }
}

async function flushTabMemory(tabId) {
  try {
    log(`AMP Background: Flushing memory for tab ${tabId}`);
    
    // Get all hot memory for this tab
    const tabMemory = Array.from(activeMemoryPool.hotPool.values()).filter(chunk => chunk.tab_id === tabId.toString());
    
    if (tabMemory.length > 0) {
      // Check if AMP app is running and send memory (for future LLM adoption)
      try {
      const ampOnline = await checkAmpAppStatus();
      
      if (ampOnline) {
        await sendToAmpApp(tabMemory);
        log(`Sent ${tabMemory.length} chunks to AMP app`);
        }
      } catch (error) {
        // Silently handle AMP app connection issues - extension works independently
        log('AMP app integration skipped (extension mode)');
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
          log(`AMP Background: Would have archived chunk ${chunk.id} to slot 9`);
        }
      }
    }
    
    // Always save crash safety backup
    // This functionality is removed from memoryPool, so this block is effectively a no-op
    // For now, we'll just log that it would have been saved
    log(`AMP Background: Would have saved memory to storage`);
  } catch (error) {
    logError('Failed to flush tab memory:', error);
  }
}

async function checkAmpAppStatus() {
  const now = Date.now();
  
  // Check every 30 seconds
  if (now - ampAppStatus.lastCheck < 30000) {
    return ampAppStatus.online;
  }
  
  try {
    // Use native messaging instead of HTTP to check app status
    if (nativePort && desktopConnected) {
      ampAppStatus.online = true;
      ampAppStatus.lastCheck = now;
      return true;
    }
    
    ampAppStatus.online = false;
    ampAppStatus.lastCheck = now;
    return false;
  } catch (error) {
    // Silently handle errors - AMP app is optional
    ampAppStatus.online = false;
    ampAppStatus.lastCheck = now;
    log('AMP app not available (normal if not running locally)');
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
        setRingState('normal'); // Colored/connected state
        log('🟢 AMP Background: Connected');
      } else {
        setRingState('normal'); // Use colored normal ring even when disconnected
        log('🔴 AMP Background: Disconnected');
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
    
    log(`Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
  } catch (error) {
    logError('updateConnectionStatus failed:', error);
  }
}

// ============================================
// NATIVE MESSAGING IMPLEMENTATION
// ============================================

const NATIVE_HOST_NAME = 'com.ampiq.amp.native';
let nativePort = null;
let nativeMessageQueue = [];
let pendingResponses = new Map(); // id -> { resolve, reject, timeout }
let messageIdCounter = 0;

// Connect to native messaging host
function connectToNativeHost() {
  try {
    // Check if already connected
    if (nativePort) {
      // Verify port is still connected
      const error = chrome.runtime.lastError;
      if (error) {
        log('🔌 Port exists but has error, reconnecting...');
        nativePort = null;
      } else {
        log('🔌 Already connected to native messaging host');
        return true;
      }
    }

    log('🔌 Connecting to native messaging host:', NATIVE_HOST_NAME);

    // Check for any last error before attempting connection
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.warn('⚠️ Previous native messaging error:', lastError.message);
    }

    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    // Check if connection failed immediately
    const connectError = chrome.runtime.lastError;
    if (connectError) {
      logError('❌ Failed to connect to native host:', connectError.message);
      nativePort = null;
      updateConnectionStatus(false);
      return false;
    }

    // Handle successful connection
    nativePort.onMessage.addListener((message) => {
      log('📨 Native message received:', message.type, message);
      try {
        handleNativeMessage(message);
      } catch (error) {
        logError('❌ Error handling native message:', error);
      }
    });

    let disconnectHandled = false;
    nativePort.onDisconnect.addListener(() => {
      if (disconnectHandled) return; // Prevent duplicate handling
      disconnectHandled = true;
      
      const error = chrome.runtime.lastError;
      const errorMsg = error?.message || 'Unknown reason';
      
      // Only log once per disconnect to reduce spam
      if (!errorMsg.includes('host not found') && !errorMsg.includes('not registered')) {
        logError('❌ Native port disconnected:', errorMsg);
      }
      
      nativePort = null;
      updateConnectionStatus(false);

      // Reject all pending responses
      pendingResponses.forEach((pending, id) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Native port disconnected: ' + errorMsg));
      });
      pendingResponses.clear();

      // Don't retry if host is not registered - user needs to run setup script
      if (errorMsg.includes('host not found') || errorMsg.includes('not registered') || errorMsg.includes('Specified native messaging host not found')) {
        // Only log once, not on every retry
        if (!globalThis._nativeHostNotRegisteredLogged) {
          logError('❌ Native messaging host not registered. Run setup-native-host.ps1 to register it.');
          globalThis._nativeHostNotRegisteredLogged = true;
        }
        // Stop retrying - user needs to register the host first
        return;
      }
      
      // For other errors, retry after 5 seconds
      setTimeout(() => {
        if (!nativePort) {
          log('🔄 Attempting to reconnect to native host...');
          connectToNativeHost();
        }
      }, 5000);
    });
    
    // Wait a moment to see if disconnect fires immediately, then send ping
    setTimeout(() => {
      if (nativePort && !disconnectHandled) {
        // Send ping to verify connection
        sendNativeMessage({ type: 'ping' }).then(() => {
          log('✅ Native messaging connection established');
          updateConnectionStatus(true);
          
          // Flush queued messages
          while (nativeMessageQueue.length > 0) {
            const queuedMessage = nativeMessageQueue.shift();
            sendNativeMessage(queuedMessage);
          }
        }).catch((error) => {
          logError('❌ Native ping failed:', error);
          // Don't set disconnected here - let the disconnect handler do it
        });
      }
    }, 500);
    
    return true;
  } catch (error) {
    logError('❌ Failed to connect to native host:', error);
    nativePort = null;
    updateConnectionStatus(false);
    return false;
  }
}

// Handle incoming native messages
function handleNativeMessage(message) {
  // Check if this is a response to a pending request
  if (message.requestId && pendingResponses.has(message.requestId)) {
    const pending = pendingResponses.get(message.requestId);
    clearTimeout(pending.timeout);
    pendingResponses.delete(message.requestId);
    pending.resolve(message);
    return;
  }
  
  // Handle unsolicited messages from desktop
  switch (message.type) {
    case 'pong':
      updateConnectionStatus(true);
      break;
      
    case 'stats_update':
      // Desktop is sending us updated stats
      if (message.stats) {
        statsManager.updateStats(message.stats);
        log('📊 Stats updated from desktop:', message.stats);
      }
      break;
      
    case 'memory_stored':
      log('💾 Memory stored confirmation:', message.chunkId);
      break;
      
    case 'error':
      logError('❌ Native host error:', message.error);
      break;
      
    default:
      log('📨 Unhandled native message:', message.type);
  }
}

// Send message to native host with response handling
function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    if (!nativePort) {
      // Queue message and try to connect
      log('⏳ Native port not connected, queueing message:', message.type);
      nativeMessageQueue.push(message);
      connectToNativeHost();
      reject(new Error('Native port not connected'));
      return;
    }
    
    // Add request ID for response tracking
    const requestId = `req_${++messageIdCounter}_${Date.now()}`;
    const messageWithId = { ...message, requestId };
    
    // Set up timeout for response
    const timeout = setTimeout(() => {
      pendingResponses.delete(requestId);
      reject(new Error(`Native message timeout: ${message.type}`));
    }, 10000); // 10 second timeout
    
    pendingResponses.set(requestId, { resolve, reject, timeout });
    
    try {
      nativePort.postMessage(messageWithId);
      log('📤 Native message sent:', message.type);
    } catch (error) {
      clearTimeout(timeout);
      pendingResponses.delete(requestId);
      reject(error);
    }
  });
}

// Send to desktop app via native messaging
async function sendToDesktopApp(message) {
  try {
    log('📤 Sending to desktop via native messaging:', message.type);
    const response = await sendNativeMessage(message);
    log('📨 Desktop response:', response);
    updateConnectionStatus(true);
    return response;
  } catch (error) {
    logError('❌ Native messaging failed:', error);
    updateConnectionStatus(false);
    return null;
  }
}

// Test connection via native messaging
async function testDesktopConnection() {
  try {
    log('🔍 Testing native messaging connection...');
    
    if (!nativePort) {
      connectToNativeHost();
      // Wait longer for connection to establish (native host might need time to start)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check if port is still connected after wait
    if (!nativePort) {
      log('⚠️ Native port not available after connection attempt');
      updateConnectionStatus(false);
      return false;
    }
    
    // Check for immediate disconnect errors
    const error = chrome.runtime.lastError;
    if (error) {
      logError('❌ Native messaging error:', error.message);
      updateConnectionStatus(false);
      return false;
    }
    
    const response = await sendNativeMessage({ type: 'ping' });
    
    if (response && response.type === 'pong') {
      updateConnectionStatus(true);
      log('✅ Native messaging connection successful');
      return true;
    } else {
      console.warn('⚠️ Unexpected response from native host:', response);
      // Don't set disconnected here - might be a temporary issue
      return false;
    }
  } catch (error) {
    logError('❌ Native messaging test failed:', error);
    // Only set disconnected if it's a clear connection error
    if (error.message && (error.message.includes('not connected') || error.message.includes('disconnected'))) {
      updateConnectionStatus(false);
    }
    return false;
  }
}

// Get status via native messaging
async function getDesktopStatus() {
  try {
    const response = await sendNativeMessage({ type: 'status' });
    return response;
  } catch (error) {
    logError('Failed to get desktop status:', error);
    return null;
  }
}

// Initialize native messaging on startup
function initializeNativeMessaging() {
  log('🚀 Initializing native messaging...');
  connectToNativeHost();
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  log('AMP Extension installed/updated');
  
  // Initialize license first
  if (globalThis.AMP_License) {
    const licenseState = await globalThis.AMP_License.initialize();
    log('License state:', licenseState.isValid ? licenseState.plan : 'unlicensed');
    
    // Only initialize if licensed
    if (licenseState.isValid) {
      await initializeMemoryPool();
      startHealthMonitoring();
      await initializeMonitoringSystem();
      
      // Start periodic license checks
      globalThis.AMP_License.startPeriodicCheck();
      
      // Initialize native messaging connection (only for complete package)
      if (globalThis.AMP_License.hasFeature('nativeMessaging')) {
        setTimeout(() => {
          initializeNativeMessaging();
        }, 1000);
      }
    } else {
      log('Extension not licensed - features disabled');
    }
  } else {
    // Fallback if license module not loaded
    await initializeMemoryPool();
    startHealthMonitoring();
    await initializeMonitoringSystem();
    setTimeout(() => {
      initializeNativeMessaging();
    }, 1000);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  log('AMP Extension started');
  
  // Initialize license first
  if (globalThis.AMP_License) {
    const licenseState = await globalThis.AMP_License.initialize();
    log('License state:', licenseState.isValid ? licenseState.plan : 'unlicensed');
    
    // Only initialize if licensed
    if (licenseState.isValid) {
      await initializeMemoryPool();
      startHealthMonitoring();
      await initializeMonitoringSystem();
      
      // Start periodic license checks
      globalThis.AMP_License.startPeriodicCheck();
      
      // Test desktop app connection (only for complete package)
      if (globalThis.AMP_License.hasFeature('nativeMessaging')) {
        setTimeout(() => {
          testDesktopConnection();
        }, 1000);
      }
    } else {
      log('Extension not licensed - features disabled');
    }
  } else {
    // Fallback if license module not loaded
    await initializeMemoryPool();
    startHealthMonitoring();
    await initializeMonitoringSystem();
    setTimeout(() => {
      testDesktopConnection();
    }, 1000);
  }
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
      log(`✅ Sent ${memoryChunks.length} chunks to desktop app`);
    } else {
      console.warn('⚠️ Desktop app response indicates failure');
    }
  } catch (error) {
    logError('Failed to send memory to desktop app:', error);
  }
}

// Check desktop app status via native messaging (not HTTP)
async function checkDesktopStatus() {
  try {
    // Use native messaging to check if desktop app is connected
    if (nativePort && desktopConnected) {
      const response = await sendNativeMessage({ type: 'ping' });
      return response && response.type === 'pong';
    }
    return false;
  } catch (error) {
    log('Desktop app not available via native messaging:', error.message);
    return false;
  }
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Periodic maintenance - reduced frequency for lower CPU usage
const maintenanceInterval = setInterval(async () => {
  // Skip if idle
  if (isExtensionIdle) return;
  
  try {
    // Check AMP app status
    await checkAmpAppStatus();
    
    // Retry overflow queue if desktop is available
    if (activeMemoryPool && activeMemoryPool.retryOverflowQueue) {
      await activeMemoryPool.retryOverflowQueue();
    }
    
    const stats = activeMemoryPool.getStats();
    // Reduced logging - only log every other time
    if (Math.random() < 0.5) {
      log(`AMP Background: Rolling state - DOM: ${stats.domChunks}, Hot: ${stats.hotBufferChunks}`);
    }
  } catch (error) {
    logError('Periodic maintenance failed:', error);
  }
}, PERF_CONFIG.MAINTENANCE_INTERVAL); // Every 2 minutes (reduced from 1 min)
activeIntervalIds.push(maintenanceInterval);

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
        log(`🟢 AMP: Auto-initialized monitoring for ${provider} on ${activeTab.url}`);
      } else {
        log('AMP: No AI provider detected on active tab, monitoring disabled');
      }
    }
  } catch (error) {
    logError('AMP: Failed to initialize monitoring system:', error);
  }
}

// Initialize on script load
initializeMemoryPool().then(async () => {
  log('AMP Background: Memory pool initialized successfully');
  
  // Initialize monitoring system
  await initializeMonitoringSystem();
  
  // Connect to desktop app via native messaging after initialization
  setTimeout(() => {
    initializeNativeMessaging();
    testDesktopConnection().then(connected => {
      if (connected) {
        log('AMP Background: Native messaging connection to desktop app successful');
        // Send current memory data to desktop app
        sendCurrentMemoryToDesktop();
      } else {
        console.warn('AMP Background: Native messaging not available - desktop features disabled');
      }
    });
  }, 3000); // Wait 3 seconds before connecting to avoid race condition
  
  // Start periodic stats broadcasting to connected clients (reduced frequency)
  const broadcastInterval = setInterval(() => {
    // Skip if idle
    if (isExtensionIdle) return;
    
    try {
      if (!activeMemoryPool) return;
      
      // Get comprehensive stats including slot details
      updateStats(); // This updates statsManager
      const stats = statsManager.getStats();
      
      // Broadcast stats to all connected clients (popup, desktop UI, etc.)
      // Use chrome.runtime.sendMessage which broadcasts to all listeners
      chrome.runtime.sendMessage({
        type: 'statsUpdate',
        action: 'statsUpdate', // Support both formats
        stats: stats
      }).catch(() => {
        // Ignore errors when no clients are connected (popup closed)
      });
    } catch (error) {
      // Silently ignore - no need to warn every time
    }
  }, PERF_CONFIG.STATS_BROADCAST_INTERVAL); // Broadcast stats every 15 seconds (reduced from 10s)
  activeIntervalIds.push(broadcastInterval);
}).catch(error => {
  logError('AMP Background: Failed to initialize memory pool:', error);
});

// Send current memory data to desktop app - REAL DATA ONLY, NO TEST DATA
async function sendCurrentMemoryToDesktop() {
  try {
    if (!activeMemoryPool) {
      console.warn('AMP Background: Memory pool not available');
      return;
    }
    
    const allChunks = activeMemoryPool.getAll();
    if (allChunks.length === 0) {
      log('AMP Background: No memory chunks to send - waiting for real data capture');
      return; // Don't send anything if there's no real data
    }
    
    log(`AMP Background: Sending ${allChunks.length} REAL memory chunks to desktop app`);
    
    const response = await sendToDesktopApp({
      type: 'sendAllMemory',
      chunks: allChunks,
      timestamp: Date.now(),
      totalChunks: allChunks.length,
      totalSize: allChunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0)
    });
    
    if (response && response.success) {
      log(`✅ Successfully sent ${allChunks.length} REAL chunks to desktop app`);
    } else {
      console.warn('⚠️ Failed to send memory chunks to desktop app:', response);
    }
  } catch (error) {
    logError('❌ Error sending memory to desktop app:', error);
  }
}

// System health monitoring
let healthCheckInterval = null;
let memorySendInterval = null;

function startHealthMonitoring() {
  // Check system health every 60 seconds (reduced from 30s for lower CPU usage)
  healthCheckInterval = setInterval(async () => {
    // Skip non-critical checks if idle
    if (isExtensionIdle) {
      log('📊 Skipping health check - extension idle');
      return;
    }
    
    try {
      if (activeMemoryPool && activeMemoryPool.getSystemHealth) {
        const health = activeMemoryPool.getSystemHealth();
        
        // Log health status
        log('AMP Background: System health check:', {
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
      
      // Test desktop app connection every 30 seconds via native messaging
      if (desktopConnected && nativePort) {
        try {
          const response = await sendNativeMessage({ type: 'ping' });
          if (!response || response.type !== 'pong') {
            console.warn('AMP Background: Native messaging connection lost, attempting reconnect...');
            updateConnectionStatus(false);
            // Try to reconnect
            setTimeout(() => initializeNativeMessaging(), 2000);
          }
        } catch (error) {
          console.warn('AMP Background: Native messaging health check failed:', error);
          updateConnectionStatus(false);
          // Try to reconnect
          setTimeout(() => initializeNativeMessaging(), 2000);
        }
      }
    } catch (error) {
      logError('AMP Background: Health check failed:', error);
    }
  }, PERF_CONFIG.HEALTH_CHECK_INTERVAL); // 60 seconds (reduced from 30s)
  activeIntervalIds.push(healthCheckInterval);

  // Send memory data to desktop app every 10 seconds if connected (reduced from 3s)
  memorySendInterval = setInterval(async () => {
    // Skip if idle
    if (isExtensionIdle) return;
    
    try {
      if (desktopConnected && activeMemoryPool) {
        await sendCurrentMemoryToDesktop();
      }
    } catch (error) {
      logError('AMP Background: Memory send failed:', error);
    }
  }, PERF_CONFIG.MEMORY_SEND_INTERVAL); // 10 seconds (reduced from 3s)
  activeIntervalIds.push(memorySendInterval);
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

// Animation code moved to top of file for immediate start
