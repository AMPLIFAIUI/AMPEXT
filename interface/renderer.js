const { ipcRenderer } = require('electron');

// Global state
let currentConfig = {};
let memorySlots = [];

// DOM elements
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Dashboard
    serverStatusIndicator: document.getElementById('statusIndicator'),
    serverStatusText: document.getElementById('statusText'),
    serverStatusDetail: document.getElementById('serverStatusDetail'),
    serverPort: document.getElementById('serverPort'),
    serverPortDisplay: document.getElementById('serverPortDisplay'),
    serverHost: document.getElementById('serverHost'),
    serverHostDisplay: document.getElementById('serverHostDisplay'),
    hotSlots: document.getElementById('hotSlots'),
    hotSlotsDisplay: document.getElementById('hotSlotsDisplay'),
    totalSlots: document.getElementById('totalSlots'),
    usedSlots: document.getElementById('usedSlots'),
    activityLog: document.getElementById('activityLog'),
    
    // Actions
    restartServer: document.getElementById('restartServer'),
    clearMemory: document.getElementById('clearMemory'),
    exportData: document.getElementById('exportData'),
    
    // Memory
    memoryGrid: document.getElementById('memoryGrid'),
    addMemory: document.getElementById('addMemory'),
    
    // Processing
    inputText: document.getElementById('inputText'),
    outputText: document.getElementById('outputText'),
    summarizeBtn: document.getElementById('summarizeBtn'),
    embedBtn: document.getElementById('embedBtn'),
    storeBtn: document.getElementById('storeBtn'),
    
    // Settings
    saveConfig: document.getElementById('saveConfig'),
    
    // Modal
    memoryModal: document.getElementById('memoryModal'),
    memoryText: document.getElementById('memoryText'),
    memorySlot: document.getElementById('memorySlot'),
    closeModal: document.getElementById('closeModal'),
    cancelMemory: document.getElementById('cancelMemory'),
    saveMemory: document.getElementById('saveMemory')
};

// Initialize application
async function initializeApp() {
    try {
        // Load configuration
        currentConfig = await ipcRenderer.invoke('get-config');
        
        // Update UI with configuration
        updateSettingsUI();
        
        // Check server status
        await updateServerStatus();
        
        // Load memory slots
        await loadMemorySlots();
        
        // Add activity log entry
        addActivityLog('Application initialized');
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        addActivityLog('Failed to initialize application');
    }
}

// Navigation
function setupNavigation() {
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update navigation
    elements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
    
    // Update content
    elements.tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName) {
            content.classList.add('active');
        }
    });
}

// Server status
async function updateServerStatus() {
    try {
        const status = await ipcRenderer.invoke('get-server-status');
        
        elements.serverStatusIndicator.className = 'status-indicator ' + (status.running ? 'online' : 'offline');
        elements.serverStatusText.textContent = status.running ? 'Online' : 'Offline';
        elements.serverStatusDetail.textContent = status.running ? 'Running' : 'Stopped';
        elements.serverPort.textContent = status.port;
        elements.serverHost.textContent = status.host;
        
        return status;
    } catch (error) {
        console.error('Failed to get server status:', error);
        elements.serverStatusIndicator.className = 'status-indicator offline';
        elements.serverStatusText.textContent = 'Error';
        return { running: false };
    }
}

// Memory management
async function loadMemorySlots() {
    try {
        // This would typically fetch from the server
        // For now, we'll create some sample slots
        memorySlots = Array.from({ length: currentConfig.vault?.maxSlots || 9 }, (_, i) => ({
            id: i,
            content: i < 3 ? `Sample memory content for slot ${i + 1}` : null,
            timestamp: i < 3 ? new Date().toISOString() : null
        }));
        
        renderMemorySlots();
        updateMemoryStats();
    } catch (error) {
        console.error('Failed to load memory slots:', error);
        addActivityLog('Failed to load memory slots');
    }
}

function renderMemorySlots() {
    elements.memoryGrid.innerHTML = '';
    
    memorySlots.forEach((slot, index) => {
        const slotElement = document.createElement('div');
        slotElement.className = `memory-slot ${slot.content ? '' : 'empty'}`;
        
        if (slot.content) {
            slotElement.innerHTML = `
                <div class="memory-slot-header">
                    <span class="memory-slot-id">Slot ${index + 1}</span>
                    <div class="memory-slot-actions">
                        <button onclick="editMemory(${index})">Edit</button>
                        <button onclick="deleteMemory(${index})">Delete</button>
                    </div>
                </div>
                <div class="memory-slot-content">${slot.content}</div>
            `;
        } else {
            slotElement.innerHTML = `<span>Empty Slot ${index + 1}</span>`;
        }
        
        elements.memoryGrid.appendChild(slotElement);
    });
}

function updateMemoryStats() {
    const used = memorySlots.filter(slot => slot.content).length;
    const total = memorySlots.length;
    const hot = currentConfig.vault?.hotSlots || 4;
    
    elements.hotSlots.textContent = hot;
    elements.totalSlots.textContent = total;
    elements.usedSlots.textContent = used;
}

// Text processing
async function processText(action) {
    const text = elements.inputText.value.trim();
    if (!text) {
        alert('Please enter some text to process');
        return;
    }
    
    try {
        elements.outputText.value = 'Processing...';
        
        let result;
        switch (action) {
            case 'summarize':
                result = await fetch(`http://${currentConfig.server.host}:${currentConfig.server.port}/chunks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                break;
            case 'embed':
                result = await fetch(`http://${currentConfig.server.host}:${currentConfig.server.port}/context`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                break;
            case 'store':
                // Store in memory
                const emptySlot = memorySlots.findIndex(slot => !slot.content);
                if (emptySlot !== -1) {
                    memorySlots[emptySlot] = {
                        id: emptySlot,
                        content: text,
                        timestamp: new Date().toISOString()
                    };
                    renderMemorySlots();
                    updateMemoryStats();
                    result = { success: true, message: `Stored in slot ${emptySlot + 1}` };
                } else {
                    result = { success: false, message: 'No empty slots available' };
                }
                break;
        }
        
        if (result && result.ok) {
            const data = await result.json();
            elements.outputText.value = JSON.stringify(data, null, 2);
        } else if (result && result.message) {
            elements.outputText.value = result.message;
        } else {
            elements.outputText.value = 'Processing completed';
        }
        
        addActivityLog(`${action} operation completed`);
    } catch (error) {
        console.error(`Failed to ${action} text:`, error);
        elements.outputText.value = `Error: ${error.message}`;
        addActivityLog(`Failed to ${action} text`);
    }
}

// Settings
function updateSettingsUI() {
    // Update settings form with current configuration
    const settingsElements = {
        'serverPort': currentConfig.server?.port,
        'serverHost': currentConfig.server?.host,
        'vaultPath': currentConfig.vault?.path,
        'hotSlots': currentConfig.vault?.hotSlots,
        'maxSlots': currentConfig.vault?.maxSlots
    };
    
    Object.entries(settingsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            element.value = value;
        }
    });
}

async function saveConfiguration() {
    try {
        const newConfig = {
            server: {
                port: parseInt(document.getElementById('serverPort').value),
                host: document.getElementById('serverHost').value
            },
            vault: {
                path: document.getElementById('vaultPath').value,
                hotSlots: parseInt(document.getElementById('hotSlots').value),
                maxSlots: parseInt(document.getElementById('maxSlots').value)
            }
        };
        
        const result = await ipcRenderer.invoke('update-config', newConfig);
        if (result.success) {
            currentConfig = { ...currentConfig, ...newConfig };
            addActivityLog('Configuration saved');
            alert('Configuration saved successfully');
        } else {
            alert(`Failed to save configuration: ${result.error}`);
        }
    } catch (error) {
        console.error('Failed to save configuration:', error);
        alert('Failed to save configuration');
    }
}

// Modal management
function setupModal() {
    elements.addMemory.addEventListener('click', () => {
        elements.memoryModal.classList.add('active');
    });
    
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelMemory.addEventListener('click', closeModal);
    
    elements.saveMemory.addEventListener('click', async () => {
        const content = elements.memoryText.value.trim();
        const slot = elements.memorySlot.value ? parseInt(elements.memorySlot.value) - 1 : null;
        
        if (!content) {
            alert('Please enter memory content');
            return;
        }
        
        try {
            const targetSlot = slot !== null ? slot : memorySlots.findIndex(s => !s.content);
            if (targetSlot !== -1 && targetSlot < memorySlots.length) {
                memorySlots[targetSlot] = {
                    id: targetSlot,
                    content,
                    timestamp: new Date().toISOString()
                };
                renderMemorySlots();
                updateMemoryStats();
                addActivityLog(`Memory added to slot ${targetSlot + 1}`);
                closeModal();
            } else {
                alert('No available slots');
            }
        } catch (error) {
            console.error('Failed to save memory:', error);
            alert('Failed to save memory');
        }
    });
}

function closeModal() {
    elements.memoryModal.classList.remove('active');
    elements.memoryText.value = '';
    elements.memorySlot.value = '';
}

// Activity logging
function addActivityLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    logEntry.className = 'activity-item';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    elements.activityLog.appendChild(logEntry);
    elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
}

// Event listeners
function setupEventListeners() {
    // Dashboard actions
    elements.restartServer.addEventListener('click', async () => {
        addActivityLog('Restarting server...');
        await updateServerStatus();
        addActivityLog('Server restarted');
    });
    
    elements.clearMemory.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all memory?')) {
            memorySlots = memorySlots.map(slot => ({ ...slot, content: null, timestamp: null }));
            renderMemorySlots();
            updateMemoryStats();
            addActivityLog('Memory cleared');
        }
    });
    
    elements.exportData.addEventListener('click', () => {
        const data = {
            config: currentConfig,
            memory: memorySlots,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amp-middleware-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        addActivityLog('Data exported');
    });
    
    // Processing actions
    elements.summarizeBtn.addEventListener('click', () => processText('summarize'));
    elements.embedBtn.addEventListener('click', () => processText('embed'));
    elements.storeBtn.addEventListener('click', () => processText('store'));
    
    // Settings
    elements.saveConfig.addEventListener('click', saveConfiguration);
    
    // Modal close on outside click
    elements.memoryModal.addEventListener('click', (e) => {
        if (e.target === elements.memoryModal) {
            closeModal();
        }
    });
}

// Memory slot actions
window.editMemory = function(index) {
    const slot = memorySlots[index];
    elements.memoryText.value = slot.content || '';
    elements.memorySlot.value = index + 1;
    elements.memoryModal.classList.add('active');
};

window.deleteMemory = function(index) {
    if (confirm('Are you sure you want to delete this memory?')) {
        memorySlots[index] = { ...memorySlots[index], content: null, timestamp: null };
        renderMemorySlots();
        updateMemoryStats();
        addActivityLog(`Memory deleted from slot ${index + 1}`);
    }
};

// Periodic updates
function startPeriodicUpdates() {
    // Update server status every 30 seconds
    setInterval(updateServerStatus, 30000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupModal();
    setupEventListeners();
    initializeApp();
    startPeriodicUpdates();
}); 