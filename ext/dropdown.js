// © 2025 AMPIQ All rights reserved.
// Popup script for AMP Memory Extension - Professional UI
// Version: 2.0.1 - Cache busted

let activityFeedHeight = 150;
let updateInterval;
let sessionStartTime = Date.now();

// Global variables for debouncing provider updates
let lastProviderUpdate = 0;
let lastProvider = 'Unknown';
let providerUpdateDebounce = 10000; // 10 seconds

document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
    setupEventListeners();
    setupPinning();
    setupActivityLog();
    setupResizableActivityFeed();
    setupPopupResize();
    startPeriodicUpdates();
    initializeIconAnimations();
    
    // Initialize monitoring status
    await updateMonitoringStatus();
    
    // Listen for connection status updates from background
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'connectionStatusUpdate') {
                updateConnectionIndicator(message.connected);
            }
        });
    }
});

// StatsManager: single source of truth for stats
class StatsManager {
    constructor() {
        this.stats = {
            domChunks: 0,
            hotBufferChunks: 0,
            archivedChunks: 0,
            totalChunks: 0,
            hotMemorySize: 0,
            lastUpdated: Date.now()
        };
        this.listeners = [];
    }
    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats, lastUpdated: Date.now() };
        this.notifyListeners();
    }
    addListener(callback) {
        this.listeners.push(callback);
    }
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.stats));
    }
}
const statsManager = new StatsManager();

// Helper function to safely update element text
function safeUpdateText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
        element.classList.remove('error');
    }
}

// Listen for stats updates and update UI
statsManager.addListener((stats) => {
    // Update all stat fields with live values or fallback to 0
    safeUpdateText('dom-count', stats.domChunks ?? 0);
    safeUpdateText('hot-count', stats.hotBufferChunks ?? 0);
    safeUpdateText('archive-count', stats.archivedChunks ?? 0);
    safeUpdateText('dom-bytes', formatBytes(stats.domSize ?? 0));
    safeUpdateText('hot-bytes', formatBytes(stats.hotBufferSize ?? 0));
    safeUpdateText('archive-bytes', formatBytes(stats.archiveSize ?? 0));
    safeUpdateText('total-bytes', formatBytes((stats.domSize ?? 0) + (stats.hotBufferSize ?? 0) + (stats.archiveSize ?? 0)));
    safeUpdateText('message-rate', stats.messageRate ?? 0);
    safeUpdateText('growth-rate', stats.growthRate ? `+${formatBytes(stats.growthRate)}/min` : '+0 B/min');
    // Session time is now updated by separate timer every second
});

// Update monitoring status
async function updateMonitoringStatus() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getMonitoringStatus'
        });
        
        if (response && response.isActive) {
            // Get tab info for the active monitoring tab
            const tab = await chrome.tabs.get(response.activeTabId);
            const provider = getAIProviderFromUrl(tab.url);
            const hostname = tab.url ? new URL(tab.url).hostname : 'Unknown';
            
            // Update monitoring status display
            safeUpdateText('active-provider', provider);
            safeUpdateText('active-site', hostname);
            safeUpdateText('monitoring-status', 'Active');
            
            // Update indicator
            const indicator = document.getElementById('monitoring-indicator');
            if (indicator) {
                indicator.className = 'indicator active';
                indicator.style.backgroundColor = '#2ecc71';
            }
            
            // Update status value styling
            const statusElement = document.getElementById('monitoring-status');
            if (statusElement) {
                statusElement.className = 'monitoring-value active';
            }
        } else {
            // No active monitoring
            safeUpdateText('active-provider', 'None');
            safeUpdateText('active-site', 'None');
            safeUpdateText('monitoring-status', 'Inactive');
            
            // Update indicator
            const indicator = document.getElementById('monitoring-indicator');
            if (indicator) {
                indicator.className = 'indicator inactive';
                indicator.style.backgroundColor = '#e74c3c';
            }
            
            // Update status value styling
            const statusElement = document.getElementById('monitoring-status');
            if (statusElement) {
                statusElement.className = 'monitoring-value inactive';
            }
        }
    } catch (error) {
        console.error('Failed to update monitoring status:', error);
        // Set to inactive state on error
        safeUpdateText('active-provider', 'Error');
        safeUpdateText('active-site', 'Error');
        safeUpdateText('monitoring-status', 'Error');
    }
}

// Helper function to get AI provider from URL (copied from background script)
function getAIProviderFromUrl(url) {
    if (!url) return 'unknown';
    
    if (url.includes('chatgpt.com') || url.includes('openai.com')) return 'ChatGPT';
    if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'Claude';
    if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'Gemini';
    if (url.includes('perplexity.ai')) return 'Perplexity';
    if (url.includes('poe.com')) return 'Poe';
    if (url.includes('character.ai')) return 'Character';
    if (url.includes('you.com')) return 'You';
    if (url.includes('blackbox.ai')) return 'Blackbox';
    
    return 'unknown';
}

// Helper to format bytes
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Initialize popup with enhanced functionality
async function initializePopup() {
    try {
        // Detect if we're in a popup or standalone window
        const isStandaloneWindow = window.location.pathname.includes('amp-ui.html');
        
        // Setup popup-specific features only for popup
        if (!isStandaloneWindow) {
            setupPinning();
            setupPopupResize();
        }
        
        // Setup resizable activity feed for both contexts
        setupResizableActivityFeed();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check current tab and provider
        await updateProviderStatus();
        
        // Get memory statistics
        await updateMemoryStats();
        
        // Check AMP server status
        await checkAmpServerStatus();
        
        // Initialize activity feed
        addActivityEntry('info', 'AMP Memory initialized');
        addActivityEntry('success', 'Memory pool loaded successfully');
        
        // Start periodic updates
        startPeriodicUpdates();
        
        // Enforce full height for popup
        setupPopupResize();
        
        console.log('AMP Popup initialized');
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        addActivityEntry('error', 'Initialization failed: ' + error.message);
    }
}

// Setup pinning functionality (simplified - just for visual feedback)
function setupPinning() {
    const pinBtn = document.getElementById('pinBtn');
    const ampIconContainer = document.getElementById('ampIconContainer');
    if (pinBtn) {
        pinBtn.addEventListener('click', () => {
            // Just show a notification that standalone window is available
            showNotification('Use "Open Window" button for persistent view', 'info');
            addActivityEntry('info', 'Pin button clicked - use Open Window for persistent view');
        });
    }
    // Remove pin state loading since we're not using it
}

// Setup activity log functionality
function setupActivityLog() {
    const activityLog = document.getElementById('activityLog');
    
    // Only setup if element exists
    if (!activityLog) {
        console.log('Activity log element not found, skipping setup');
        return;
    }
    
    // Add activity log functionality
    function addActivityLogEntry(msg) {
        if (!activityLog) return;
        const now = new Date();
        const time = now.toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${time}] ${msg}`;
        activityLog.insertBefore(entry, activityLog.firstChild);
        while (activityLog.children.length > 30) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }
    
    // Expose for use by other functions
    window.addActivityLogEntry = addActivityLogEntry;
}

// Setup resizable activity feed
function setupResizableActivityFeed() {
    const resizeHandle = document.getElementById('resizeHandle');
    const activityFeed = document.getElementById('activityFeed');
    
    // Only setup if both elements exist
    if (!resizeHandle || !activityFeed) {
        console.log('Resize elements not found, skipping setup');
        return;
    }
    
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = activityFeed.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(100, Math.min(400, startHeight + deltaY));
        activityFeed.style.height = newHeight + 'px';
        activityFeedHeight = newHeight;
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            // Save height preference
            chrome.storage.local.set({ 'amp_activity_feed_height': activityFeedHeight });
        }
    });
    
    // Load saved height
    chrome.storage.local.get(['amp_activity_feed_height'], (result) => {
        if (result.amp_activity_feed_height) {
            activityFeed.style.height = result.amp_activity_feed_height + 'px';
            activityFeedHeight = result.amp_activity_feed_height;
        }
    });
}

// Remove popup resizing and enforce full height
function setupPopupResize() {
    const resizeHandle = document.getElementById('popupResizeHandle');
    
    // Only setup if element exists
    if (!resizeHandle) {
        console.log('Popup resize handle not found, skipping setup');
        return;
    }
    
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = document.body.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(400, Math.min(800, startHeight + deltaY));
        
        document.body.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            
            // Save height preference
            const currentHeight = document.body.offsetHeight;
            chrome.storage.local.set({ 
                'amp_popup_height': currentHeight 
            });
            
            addActivityEntry('info', `Popup resized to height: ${currentHeight}px`);
        }
    });
    
    // Load saved height
    chrome.storage.local.get(['amp_popup_height'], (result) => {
        if (result.amp_popup_height) {
            document.body.style.height = result.amp_popup_height + 'px';
        }
    });
}

// Add entry to activity feed
function addActivityEntry(type, message) {
    const activityFeed = document.getElementById('activityFeed');
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `activity-entry ${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    
    activityFeed.appendChild(entry);
    
    // Auto-scroll to bottom
    activityFeed.scrollTop = activityFeed.scrollHeight;
    
    // Limit entries to prevent memory issues
    const entries = activityFeed.querySelectorAll('.activity-entry');
    if (entries.length > 50) {
        entries[0].remove();
    }
}

// Enhanced provider status update with debouncing
async function updateProviderStatus(force = false) {
    try {


        // Detect if we're in a popup or standalone window
        const isStandaloneWindow = window.location.pathname.includes('amp-ui.html');
        
        if (isStandaloneWindow) {
            // For standalone window, show a generic status
            safeUpdateText('current-provider', 'Standalone Mode');
            return;
        }
        
        // Check if enough time has passed since last update (unless forced)
        const now = Date.now();
        if (!force && now - lastProviderUpdate < providerUpdateDebounce) {
            // Don't update if not enough time has passed
            return;
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab.url;
        
        let provider = 'Unknown';
        if (url.includes('chat.openai.com')) {
            provider = 'ChatGPT';
        } else if (url.includes('claude.ai')) {
            provider = 'Claude';
        } else if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
            provider = 'Gemini';
        } else if (url.includes('blackbox.ai')) {
            provider = 'Blackbox';
        } else if (url.includes('perplexity.ai')) {
            provider = 'Perplexity';
        } else if (url.includes('poe.com')) {
            provider = 'Poe';
        } else if (url.includes('character.ai')) {
            provider = 'Character.ai';
        } else if (url.includes('you.com')) {
            provider = 'You.com';
        } else if (url.includes('127.0.0.1:5500/client/manual-feeder.html')) {
            provider = 'Manual Feeder (Local)';
        }
        
        // Only update if provider actually changed (or if forced)
        if (force || provider !== lastProvider) {
            safeUpdateText('current-provider', provider);
            addActivityEntry('info', `Provider detected: ${provider}`);
            lastProvider = provider;
            lastProviderUpdate = now;
            
            if (provider !== 'Unknown' && provider !== 'Error') {
                setIconState('active');
            } else {
                setIconState('idle');
            }
        }
    } catch (error) {
        const providerElement = document.getElementById('current-provider');
        if (providerElement) {
            providerElement.textContent = 'Error';
            providerElement.classList.add('error');
        }
        addActivityEntry('error', 'Provider detection failed: ' + (error && error.message ? error.message : error));
        showNotification('Provider detection failed', 'error');
        console.error('Failed to update provider status:', error);
    }
}

// Enhanced memory stats update with live data
async function updateMemoryStats() {
    try {
        console.log('🔧 Dropdown: Sending getMemoryStats request');
        chrome.runtime.sendMessage({ action: 'getMemoryStats' }, (response) => {
            console.log('🔧 Dropdown: Received response:', response);
            if (response && response.success && response.stats) {
                console.log('🔧 Dropdown: Updating stats with:', response.stats);
                updateMemoryStatsFromBroadcast(response.stats);
            } else {
                console.error('🔧 Dropdown: Failed to get memory stats:', response);
            }
        });
    } catch (error) {
        console.error('🔧 Dropdown: Failed to update memory stats:', error);
    }
}

// Enhanced server status check
// Function to update connection indicator
function updateConnectionIndicator(connected) {
    const desktopStatus = document.getElementById('desktop-status');
    if (desktopStatus) {
        if (connected) {
            desktopStatus.textContent = 'Connected';
            const indicator = desktopStatus.parentElement.querySelector('.indicator');
            if (indicator) {
                indicator.className = 'indicator online';
            }
        } else {
            desktopStatus.textContent = 'Disconnected';
            const indicator = desktopStatus.parentElement.querySelector('.indicator');
            if (indicator) {
                indicator.className = 'indicator offline';
            }
        }
    }
    
    // Also update the main status indicator in the header
    const mainStatus = document.getElementById('main-status');
    const mainIndicator = document.getElementById('main-indicator');
    if (mainStatus) {
        mainStatus.textContent = connected ? 'Connected' : 'Disconnected';
    }
    if (mainIndicator) {
        mainIndicator.className = `indicator ${connected ? 'online' : 'offline'}`;
    }
}

async function checkAmpServerStatus() {
    try {
        // Test HTTP connection to desktop app
        const response = await chrome.runtime.sendMessage({ action: 'pingDesktopApp' });
        
        updateConnectionIndicator(response && response.success);
        
        if (response && response.success) {
            addActivityEntry('success', 'Connected');
            return true; // Indicate success
        } else {
            addActivityEntry('warning', 'Disconnected');
            return false; // Indicate failure
        }
    } catch (error) {
        // HTTP connection not available - desktop app may not be running
        updateConnectionIndicator(false);
        addActivityEntry('info', 'Desktop app not available (start AMPiQ desktop app)');
        return false; // Indicate failure
    }
}

// Enhanced event listeners
function setupEventListeners() {
    // Helper function to safely add event listener
    function safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with id '${elementId}' not found, skipping event listener`);
        }
    }
    

    // Detect if we're in a popup or standalone window
    const isStandaloneWindow = window.location.pathname.includes('amp-ui.html');
    
    // Close button - handle differently for popup vs standalone
    // (No closeBtn in HTML, so skip this to avoid null errors)
    // const closeBtn = document.getElementById('closeBtn');
    // if (closeBtn) {
    //     closeBtn.addEventListener('click', () => {
    //         if (isStandaloneWindow) {
    //             // For standalone window, just close it
    //             window.close();
    //         } else {
    //             // For popup, close it
    //             window.close();
    //         }
    //     });
    // }

    // Main control buttons
    safeAddEventListener('refresh-btn', 'click', async () => {
        addActivityEntry('info', 'Manual refresh triggered');
        await updateMemoryStats();
        await updateProviderStatus(true); // Force update
        await checkAmpServerStatus();
        showNotification('🔄 Memory refreshed', 'success');
    });

    safeAddEventListener('cascade-btn', 'click', async () => {
        try {
            addActivityEntry('info', 'Memory cascade triggered');
            await chrome.runtime.sendMessage({ action: 'triggerCascade' });
            await updateMemoryStats();
            showNotification('💧 Memory cascade triggered', 'success');
            addActivityEntry('success', 'Memory cascade completed');
        } catch (error) {
            showNotification('❌ Cascade failed', 'error');
            addActivityEntry('error', 'Cascade failed: ' + error.message);
            console.error('Cascade error:', error);
        }
    });

    safeAddEventListener('inject-btn', 'click', async () => {
        try {
            addActivityEntry('info', 'Reverse injection triggered');
            await chrome.runtime.sendMessage({ action: 'triggerInject' });
            await updateMemoryStats();
            showNotification('⬆️ Reverse injection triggered', 'success');
            addActivityEntry('success', 'Reverse injection completed');
        } catch (error) {
            showNotification('❌ Injection failed', 'error');
            addActivityEntry('error', 'Injection failed: ' + error.message);
            console.error('Injection error:', error);
        }
    });

    safeAddEventListener('export-btn', 'click', async () => {
        try {
            addActivityEntry('info', 'Memory export started');
            const response = await chrome.runtime.sendMessage({ action: 'exportMemory' });
            if (response.success) {
                // Create download
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                await chrome.downloads.download({
                    url: url,
                    filename: `amp-memory-${new Date().toISOString().split('T')[0]}.json`
                });
                
                showNotification('💾 Memory exported', 'success');
                addActivityEntry('success', 'Memory exported successfully');
            }
        } catch (error) {
            showNotification('❌ Export failed', 'error');
            addActivityEntry('error', 'Export failed: ' + error.message);
            console.error('Export error:', error);
        }
    });

    // Quick action buttons
    const openWindowBtn = document.getElementById('open-window-btn');
    if (openWindowBtn) {
        openWindowBtn.addEventListener('click', async () => {
            // Only allow opening window from popup, not from standalone window
            if (isStandaloneWindow) {
                showNotification('ℹ️ Already in standalone window', 'info');
                addActivityEntry('info', 'Already in standalone window mode');
                return;
            }
            
            try {
                addActivityEntry('info', 'Opening standalone window...');
                showNotification('🔄 Opening window...', 'info');
                
                // Open amp-ui.html directly
                const ampUrl = chrome.runtime.getURL('amp-ui.html');
                const width = 600;
                const height = 800;
                const left = (screen.width - width) / 2;
                const top = (screen.height - height) / 2;
                
                const newWindow = window.open(
                    ampUrl,
                    'amp-standalone-window',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no,titlebar=no,directories=no,personalbar=no`
                );
                
                if (newWindow) {
                    showNotification('✅ Window opened!', 'success');
                    addActivityEntry('success', 'Standalone window opened successfully');
                    setTimeout(() => window.close(), 1000); // Close popup after short delay
                } else {
                    showNotification('❌ Window blocked by browser', 'error');
                    addActivityEntry('error', 'Failed to open window - popup blocked');
                }
            } catch (error) {
                showNotification('❌ Window open error', 'error');
                addActivityEntry('error', 'Window open error: ' + error.message);
                console.error('Open window error:', error);
            }
        });
    }

    safeAddEventListener('clear-btn', 'click', async () => {
        if (confirm('Clear all memory? This cannot be undone.')) {
            try {
                addActivityEntry('warning', 'Memory clear requested');
                await chrome.runtime.sendMessage({ action: 'clearMemory' });
                await updateMemoryStats();
                showNotification('🗑️ Memory cleared', 'success');
                addActivityEntry('success', 'Memory cleared successfully');
            } catch (error) {
                showNotification('❌ Clear failed', 'error');
                addActivityEntry('error', 'Memory clear failed: ' + error.message);
                console.error('Clear error:', error);
            }
        }
    });

    safeAddEventListener('stats-btn', 'click', async () => {
        try {
            addActivityEntry('info', 'Detailed stats requested');
            const response = await chrome.runtime.sendMessage({ action: 'getDetailedStats' });
            if (response.success) {
                showStatsModal(response.stats);
                addActivityEntry('success', 'Detailed stats displayed');
            }
        } catch (error) {
            showNotification('❌ Stats failed', 'error');
            addActivityEntry('error', 'Stats failed: ' + error.message);
            console.error('Stats error:', error);
        }
    });

    safeAddEventListener('send-all-btn', 'click', async () => {
        try {
            addActivityEntry('info', 'Sending all memory to desktop...');
            showNotification('🔄 Sending to desktop...', 'info');
            
            const response = await chrome.runtime.sendMessage({ action: 'sendAllToGUI' });
            
            if (response && response.success) {
                showNotification('✅ Sent to desktop!', 'success');
                addActivityEntry('success', 'All memory sent to desktop successfully');
            } else {
                showNotification('❌ Send failed', 'error');
                addActivityEntry('error', 'Failed to send memory to desktop');
                console.error('Send to desktop failed:', response);
            }
        } catch (error) {
            showNotification('❌ Send error', 'error');
            addActivityEntry('error', 'Send error: ' + error.message);
            console.error('Send to desktop error:', error);
        }
    });
}

// Enhanced periodic updates
function startPeriodicUpdates() {
    let lastConnectionStatus = null;
    
    // Update session time every second like a clock
    const sessionTimer = setInterval(() => {
        const sessionTime = document.getElementById('session-time');
        if (sessionTime) {
            const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            sessionTime.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);
    
    // Update stats every 5 seconds instead of 1 second to reduce spam
    updateInterval = setInterval(async () => {
        try {
            // Get memory stats and update UI
            await updateMemoryStats();
            
            await updateProviderStatus();
            await updateMonitoringStatus();
            
            // Update desktop status less frequently and only log changes
            if (Math.random() < 0.1) { // 10% chance each update (every ~50 seconds)
                const currentStatus = await checkAmpServerStatus();
                if (currentStatus !== lastConnectionStatus) {
                    lastConnectionStatus = currentStatus;
                    if (currentStatus) {
                        addActivityEntry('success', 'Connected to desktop app');
                    } else {
                        addActivityEntry('warning', 'Disconnected from desktop app');
                    }
                }
            }
        } catch (error) {
            console.error('🔧 Dropdown: Periodic update error:', error);
        }  
    }, 5000); // Changed from 1000ms to 5000ms
    
    // Listen for stats updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'statsUpdate' && message.stats) {
            updateMemoryStatsFromBroadcast(message.stats);
        }
    });
}

// Function to update stats from background broadcast
function updateMemoryStatsFromBroadcast(stats) {
    statsManager.updateStats(stats);
    try {
        console.log('🔧 Dropdown: Updating stats from broadcast:', stats);
        
        // Update all stat fields with live values or fallback to 0
        safeUpdateText('dom-count', stats.domChunks ?? 0);
        safeUpdateText('hot-count', stats.hotBufferChunks ?? 0);
        safeUpdateText('archive-count', stats.archivedChunks ?? 0);
        safeUpdateText('dom-bytes', formatBytes(stats.domSize ?? 0));
        safeUpdateText('hot-bytes', formatBytes(stats.hotBufferSize ?? 0));
        safeUpdateText('archive-bytes', formatBytes(stats.archiveSize ?? 0));
        safeUpdateText('total-bytes', formatBytes((stats.domSize ?? 0) + (stats.hotBufferSize ?? 0) + (stats.archiveSize ?? 0)));
        safeUpdateText('message-rate', stats.messageRate ?? 0);
        safeUpdateText('growth-rate', stats.growthRate ? `+${formatBytes(stats.growthRate)}/min` : '+0 B/min');
        
        // Session time is now updated by separate timer every second
        
        // Update processing status and icon state
        const processingStatus = document.getElementById('processing-status');
        const totalBytes = (stats.domSize ?? 0) + (stats.hotBufferSize ?? 0) + (stats.archiveSize ?? 0);
        if (processingStatus) {
            if (totalBytes > 0) {
                processingStatus.textContent = 'Active';
                processingStatus.classList.remove('error');
            }
        }
    } catch (error) {
        console.error('🔧 Dropdown: Failed to update stats from broadcast:', error);
    }
}

// Enhanced notification system
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Enhanced stats modal
function showStatsModal(stats) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1px solid #3498db;
        border-radius: 10px;
        padding: 20px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        color: white;
        font-family: 'Segoe UI', sans-serif;
    `;
    
    content.innerHTML = `
        <h2 style="color: #3498db; margin-bottom: 15px;">Detailed Memory Statistics</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <h3 style="color: #2ecc71; margin-bottom: 10px;">Memory Layers</h3>
                <p><strong>DOM Chunks:</strong> ${stats.domChunks || 0}</p>
                <p><strong>Hot Buffer Chunks:</strong> ${stats.hotBufferChunks || 0}</p>
                <p><strong>Archived Chunks:</strong> ${stats.archivedChunks || 0}</p>
                <p><strong>Total Chunks:</strong> ${stats.totalChunks || 0}</p>
            </div>
            <div>
                <h3 style="color: #f39c12; margin-bottom: 10px;">Memory Usage</h3>
                <p><strong>Hot Memory Size:</strong> ${formatBytes(stats.hotMemorySize || 0)}</p>
                <p><strong>DOM Mirror Size:</strong> ${formatBytes(stats.domMirrorSize || 0)}</p>
                <p><strong>Providers:</strong> ${(stats.providers || []).join(', ') || 'None'}</p>
                <p><strong>Topics:</strong> ${(stats.topics || []).length || 0}</p>
            </div>
        </div>
        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                style="margin-top: 15px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Close
        </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Icon animation control functions
function initializeIconAnimations() {
    const icon = document.getElementById('ampIcon');
    if (icon) {
        setIconState('idle');
    }
}

// Set icon state function
function setIconState(state) {
    const icon = document.getElementById('ampIcon');
    if (!icon) return;
    if (state === 'active') {
        icon.className = 'amp-icon active';
        icon.title = 'AMP is active';
    } else if (state === 'idle') {
        icon.className = 'amp-icon idle';
        icon.title = 'AMP is idle';
    } else if (state === 'error') {
        icon.className = 'amp-icon error';
        icon.title = 'AMP error';
    }
}

// Cleanup on popup close
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Initialize the popup when the script loads
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
});