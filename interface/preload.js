const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('ampAPI', {
    // Server management
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    
    // Security management
    getSecurityStatus: () => ipcRenderer.invoke('get-security-status'),
    getVaultStats: () => ipcRenderer.invoke('get-vault-stats'),
    
    // Memory operations
    storeMemory: (id, summary, embedding, slot) => 
        ipcRenderer.invoke('store-memory', { id, summary, embedding, slot }),
    retrieveMemory: (hotN, coldN) => 
        ipcRenderer.invoke('retrieve-memory', { hotN, coldN }),
    clearMemory: (slot) => ipcRenderer.invoke('clear-memory', slot),
    clearAllMemory: () => ipcRenderer.invoke('clear-all-memory'),
    
    // Text processing
    processText: (text, operation) => 
        ipcRenderer.invoke('process-text', { text, operation }),
    
    // Data export/import
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: (data) => ipcRenderer.invoke('import-data', data),
    
    // Event listeners
    on: (channel, callback) => {
        // Whitelist channels
        const validChannels = [
            'server-status-changed',
            'memory-updated',
            'security-alert',
            'error-occurred'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    
    removeListener: (channel, callback) => {
        const validChannels = [
            'server-status-changed',
            'memory-updated',
            'security-alert',
            'error-occurred'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    }
});

// Security utilities
contextBridge.exposeInMainWorld('securityUtils', {
    // Hash data
    hash: (data) => {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    },
    
    // Generate secure random string
    generateSecureString: (length = 32) => {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    },
    
    // Validate input
    validateInput: (input, type = 'string') => {
        if (type === 'string') {
            return typeof input === 'string' && input.length > 0 && input.length <= 10000;
        } else if (type === 'number') {
            return typeof input === 'number' && !isNaN(input) && isFinite(input);
        } else if (type === 'object') {
            return typeof input === 'object' && input !== null;
        }
        return false;
    },
    
    // Sanitize HTML
    sanitizeHTML: (html) => {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
});

// Console logging with security
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

// Override console methods to prevent sensitive data logging
contextBridge.exposeInMainWorld('secureConsole', {
    log: (...args) => {
        // Filter out sensitive data
        const filteredArgs = args.map(arg => {
            if (typeof arg === 'string' && (
                arg.includes('password') || 
                arg.includes('key') || 
                arg.includes('token') ||
                arg.includes('secret')
            )) {
                return '[REDACTED]';
            }
            return arg;
        });
        originalConsole.log(...filteredArgs);
    },
    
    error: (...args) => {
        const filteredArgs = args.map(arg => {
            if (typeof arg === 'string' && (
                arg.includes('password') || 
                arg.includes('key') || 
                arg.includes('token') ||
                arg.includes('secret')
            )) {
                return '[REDACTED]';
            }
            return arg;
        });
        originalConsole.error(...filteredArgs);
    },
    
    warn: originalConsole.warn,
    info: originalConsole.info
});

// Override global console
console.log = contextBridge.exposeInMainWorld('secureConsole').log;
console.error = contextBridge.exposeInMainWorld('secureConsole').error;

// Security event handlers
ipcRenderer.on('security-alert', (event, data) => {
    console.warn('Security Alert:', data.message);
    
    // Show user-friendly alert
    if (data.showAlert) {
        alert(`Security Alert: ${data.message}`);
    }
});

ipcRenderer.on('error-occurred', (event, data) => {
    console.error('Application Error:', data.message);
    
    // Log error securely
    const errorLog = {
        timestamp: new Date().toISOString(),
        message: data.message,
        type: data.type || 'error',
        userAgent: navigator.userAgent
    };
    
    // Send error log to main process
    ipcRenderer.invoke('log-error', errorLog);
});

// Prevent access to Node.js modules
delete window.require;
delete window.module;
delete window.exports;
delete window.global;

// Prevent access to Electron APIs
delete window.electron;
delete window.ipcRenderer;

// Security headers
document.addEventListener('DOMContentLoaded', () => {
    // Add security meta tags
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
    document.head.appendChild(meta);
    
    // Add other security headers
    const securityMeta = [
        { name: 'X-Content-Type-Options', content: 'nosniff' },
        { name: 'X-Frame-Options', content: 'DENY' },
        { name: 'X-XSS-Protection', content: '1; mode=block' }
    ];
    
    securityMeta.forEach(metaData => {
        const metaTag = document.createElement('meta');
        metaTag.httpEquiv = metaData.name;
        metaTag.content = metaData.content;
        document.head.appendChild(metaTag);
    });
});

// Prevent context menu on sensitive elements
document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.classList.contains('sensitive')) {
        event.preventDefault();
    }
});

// Prevent drag and drop of files
document.addEventListener('dragover', (event) => {
    event.preventDefault();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
});

// Prevent keyboard shortcuts that could be security risks
document.addEventListener('keydown', (event) => {
    // Prevent F12 (DevTools)
    if (event.key === 'F12') {
        event.preventDefault();
    }
    
    // Prevent Ctrl+Shift+I (DevTools)
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
    }
    
    // Prevent Ctrl+Shift+C (DevTools)
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
    }
    
    // Prevent Ctrl+U (View Source)
    if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
    }
});

console.log('Secure preload script loaded'); 