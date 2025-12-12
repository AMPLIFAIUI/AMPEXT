// © 2025 AMPIQ All rights reserved.
// Popup script for AMP Memory Extension - Professional UI
// Version: 4.0.0 - Production

// Production logging - set to false to disable debug logs
const AMP_DEBUG = false;
const log = (...args) => AMP_DEBUG && console.log('[AMP UI]', ...args);
const logError = (...args) => console.error('[AMP UI]', ...args);

let activityFeedHeight = 150;
let updateInterval;
let sessionStartTime = Date.now();

// Global variables for debouncing provider updates
let lastProviderUpdate = 0;
let lastProvider = 'Unknown';
let providerUpdateDebounce = 10000; // 10 seconds

document.addEventListener('DOMContentLoaded', async () => {
    // Check license status first
    const licenseState = await checkLicenseStatus();
    
    if (!licenseState.isValid) {
        // Show activation prompt
        showActivationPrompt();
        return;
    }
    
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
    
    // Update license status display
    updateLicenseStatusDisplay(licenseState);
    
    // Listen for connection status updates from background
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'connectionStatusUpdate') {
                updateConnectionIndicator(message.connected);
            }
            if (message.type === 'LICENSE_STATE_CHANGED') {
                updateLicenseStatusDisplay(message.state);
            }
        });
    }
});

// Check license status
async function checkLicenseStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getLicenseState' });
        return response || { isValid: false };
    } catch (error) {
        logError('Failed to check license:', error);
        return { isValid: false };
    }
}

// Show activation prompt for unlicensed users
function showActivationPrompt() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 30px;
            text-align: center;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            color: #fff;
        ">
            <svg width="80" height="80" viewBox="0 0 32 32" style="margin-bottom: 20px;">
                <rect x="7.31" y="-15.13" width="30.63" height="30.63" rx="15.32" fill="#030303" transform="rotate(44.53)"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="m 14.617,17.437 c 0.431,0.017 0.869,0.037 1.314,0.057 l 0.481,0.022 c 0.341,0.016 0.686,0.032 1.033,0.046 l 0.142,0.006 c 4.484,0.173 9.453,0.025 13.206,-3.775 l -2.128,-2.102 c -0.757,0.766 -1.58,1.34 -2.468,1.767 L 18.415,5.771 C 18.831,4.879 19.395,4.048 20.151,3.282 L 18.023,1.18 C 14.27,4.98 14.184,9.951 14.413,14.432 9.929,14.259 4.96,14.407 1.206,18.208 l 2.129,2.102 c 0.756,-0.766 1.58,-1.34 2.467,-1.767 l 7.783,7.686 c -0.416,0.893 -0.98,1.723 -1.737,2.49 l 2.129,2.102 c 2.93,-2.968 3.625,-6.649 3.68,-10.253 -0.438,-0.017 -0.861,-0.037 -1.266,-0.056 l -0.599,-0.028 c -0.39,-0.018 -0.768,-0.034 -1.132,-0.048 -0.01,0.864 -0.056,1.695 -0.161,2.492 L 9.093,17.588 C 10.771,17.345 12.606,17.359 14.582,17.436 Z m 2.884,-8.363 5.406,5.339 c -1.678,0.242 -3.513,0.228 -5.489,0.152 -0.101,-1.975 -0.138,-3.81 0.083,-5.491 z" fill="#3498db"/>
            </svg>
            <h2 style="margin-bottom: 10px; color: #3498db;">AMP - Auto Memory Persistence</h2>
            <p style="margin-bottom: 25px; color: #bdc3c7; line-height: 1.5;">
                Please activate your license to use AMP.
            </p>
            <input type="text" id="licenseKeyInput" placeholder="Enter your license key" style="
                width: 100%;
                max-width: 300px;
                padding: 12px 15px;
                border: 2px solid #3498db;
                border-radius: 8px;
                background: rgba(255,255,255,0.1);
                color: #fff;
                font-size: 14px;
                text-align: center;
                margin-bottom: 15px;
            "/>
            <button id="activateBtn" style="
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 20px;
                transition: transform 0.2s, box-shadow 0.2s;
            ">Activate License</button>
            <p id="activationError" style="color: #e74c3c; display: none; margin-bottom: 15px;"></p>
            <a href="https://amp.infinityfreeapp.com/#pricing" target="_blank" style="
                color: #3498db;
                text-decoration: none;
                font-size: 13px;
            ">Don't have a license? Get one here →</a>
        </div>
    `;
    
    const activateBtn = document.getElementById('activateBtn');
    const licenseInput = document.getElementById('licenseKeyInput');
    const errorEl = document.getElementById('activationError');
    
    activateBtn.addEventListener('click', async () => {
        const key = licenseInput.value.trim();
        if (!key) {
            errorEl.textContent = 'Please enter a license key';
            errorEl.style.display = 'block';
            return;
        }
        
        activateBtn.textContent = 'Activating...';
        activateBtn.disabled = true;
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'activateLicense',
                licenseKey: key
            });
            
            if (response.success) {
                // Reload the popup to show the full UI
                window.location.reload();
            } else {
                errorEl.textContent = response.error || 'Invalid license key';
                errorEl.style.display = 'block';
                activateBtn.textContent = 'Activate License';
                activateBtn.disabled = false;
            }
        } catch (error) {
            errorEl.textContent = 'Activation failed. Please try again.';
            errorEl.style.display = 'block';
            activateBtn.textContent = 'Activate License';
            activateBtn.disabled = false;
        }
    });
    
    // Allow Enter key to submit
    licenseInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            activateBtn.click();
        }
    });
}

// Update license status display in footer
function updateLicenseStatusDisplay(state) {
    const footer = document.querySelector('.footer');
    if (footer && state.isValid) {
        const planName = state.plan?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Licensed';
        footer.innerHTML = `© 2025 AMPIQ - AMP v4.0.0 | <span style="color: #2ecc71;">${planName}</span>`;
    }
}

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
    
    // Update slot details for standalone mode
    updateSlotDisplay(stats);
    
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
        logError('Failed to update monitoring status:', error);
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
        
        log('AMP Popup initialized');
    } catch (error) {
        logError('Failed to initialize popup:', error);
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
        log('Activity log element not found, skipping setup');
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
        log('Resize elements not found, skipping setup');
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
        log('Popup resize handle not found, skipping setup');
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
        if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
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
        logError('Failed to update provider status:', error);
    }
}

// Enhanced memory stats update with live data
async function updateMemoryStats() {
    try {
        log('🔧 Dropdown: Sending getMemoryStats request');
        chrome.runtime.sendMessage({ action: 'getMemoryStats' }, (response) => {
            log('🔧 Dropdown: Received response:', response);
            if (response && response.success && response.stats) {
                log('🔧 Dropdown: Updating stats with:', response.stats);
                updateMemoryStatsFromBroadcast(response.stats);
            } else {
                logError('🔧 Dropdown: Failed to get memory stats:', response);
            }
        });
    } catch (error) {
        logError('🔧 Dropdown: Failed to update memory stats:', error);
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
            log(`Element with id '${elementId}' not found, skipping event listener`);
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
            logError('Cascade error:', error);
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
            logError('Injection error:', error);
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
            logError('Export error:', error);
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
                logError('Open window error:', error);
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
                logError('Clear error:', error);
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
            logError('Stats error:', error);
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
                logError('Send to desktop failed:', response);
            }
        } catch (error) {
            showNotification('❌ Send error', 'error');
            addActivityEntry('error', 'Send error: ' + error.message);
            logError('Send to desktop error:', error);
        }
    });
}

// PERFORMANCE: Reduced update frequencies
const DROPDOWN_PERF = {
    SESSION_TIMER_INTERVAL: 1000,  // Keep at 1s for accurate clock
    STATS_UPDATE_INTERVAL: 10000,  // 10s instead of 5s
    CONNECTION_CHECK_CHANCE: 0.05  // 5% chance = ~every 200 seconds
};

// Enhanced periodic updates with performance optimization
function startPeriodicUpdates() {
    let lastConnectionStatus = null;
    let isPopupVisible = true;
    
    // Detect when popup loses focus to reduce updates
    document.addEventListener('visibilitychange', () => {
        isPopupVisible = !document.hidden;
    });
    
    // Update session time every second like a clock
    const sessionTimer = setInterval(() => {
        if (!isPopupVisible) return; // Skip if popup not visible
        
        const sessionTime = document.getElementById('session-time');
        if (sessionTime) {
            const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            sessionTime.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }, DROPDOWN_PERF.SESSION_TIMER_INTERVAL);
    
    // Update stats every 10 seconds (reduced from 5s)
    updateInterval = setInterval(async () => {
        if (!isPopupVisible) return; // Skip if popup not visible
        
        try {
            // Get memory stats and update UI
            await updateMemoryStats();
            
            await updateProviderStatus();
            await updateMonitoringStatus();
            
            // Update desktop status very infrequently
            if (Math.random() < DROPDOWN_PERF.CONNECTION_CHECK_CHANCE) {
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
            // Silently ignore errors to reduce console spam
        }  
    }, DROPDOWN_PERF.STATS_UPDATE_INTERVAL); // 10 seconds
    
    // Listen for stats updates from background script (single unified listener)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle both message.action and message.type formats
        if ((message.action === 'statsUpdate' || message.type === 'statsUpdate') && message.stats) {
            log('🔧 Dropdown: Received statsUpdate:', message.stats);
            updateMemoryStatsFromBroadcast(message.stats);
        }
    });
}

// Function to update stats from background broadcast
function updateMemoryStatsFromBroadcast(stats) {
    statsManager.updateStats(stats);
    try {
        log('🔧 Dropdown: Updating stats from broadcast:', stats);
        
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
        
        // Update slot details for standalone mode
        updateSlotDisplay(stats);
        
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
        logError('🔧 Dropdown: Failed to update stats from broadcast:', error);
    }
}

// Update slot display for standalone mode
function updateSlotDisplay(stats) {
    const slotsContainer = document.getElementById('hot-pool-slots');
    const slotsGrid = document.getElementById('slots-grid');
    const slotTotal = document.getElementById('slot-total');
    const slotUtilization = document.getElementById('slot-utilization');
    
    if (!slotsContainer || !slotsGrid) return;
    
    // Show slots section if we have slot stats (standalone mode)
    if (stats.slotStats && stats.slotStats.length > 0) {
        slotsContainer.style.display = 'block';
        
        // Update summary
        if (slotTotal) {
            const usedMB = parseFloat(stats.usedSlotMB || stats.totalSlotUsed ? (stats.totalSlotUsed / (1024 * 1024)).toFixed(2) : '0');
            const maxMB = parseFloat(stats.totalSlotMB || stats.totalSlotSize ? (stats.totalSlotSize / (1024 * 1024)).toFixed(2) : '5');
            slotTotal.textContent = `${usedMB} MB / ${maxMB} MB`;
        }
        if (slotUtilization) {
            slotUtilization.textContent = stats.slotUtilization || '0%';
        }
        
        // Clear and populate slots
        slotsGrid.innerHTML = '';
        stats.slotStats.forEach((slot, index) => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'slot-item';
            slotDiv.style.cssText = `
                padding: 8px;
                background: rgba(0, 212, 170, 0.05);
                border: 1px solid rgba(0, 212, 170, 0.2);
                border-radius: 6px;
                text-align: center;
            `;
            
            const utilization = parseFloat(slot.utilization) || 0;
            const barColor = utilization > 80 ? '#e74c3c' : utilization > 50 ? '#f39c12' : '#2ecc71';
            
            slotDiv.innerHTML = `
                <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: #00d4aa;">Slot ${slot.id}</div>
                <div style="font-size: 10px; color: #bdc3c7; margin-bottom: 6px;">
                    ${slot.usedMB} MB / ${slot.maxMB} MB
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 6px; overflow: hidden; margin-bottom: 4px;">
                    <div style="background: ${barColor}; height: 100%; width: ${utilization}%; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 9px; color: #95a5a6;">
                    ${slot.chunkCount} chunks · ${slot.utilization}
                </div>
            `;
            
            slotsGrid.appendChild(slotDiv);
        });
    } else {
        slotsContainer.style.display = 'none';
    }
}

// Enhanced notification system
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn('Notification container not found');
        return;
    }
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
