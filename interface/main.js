const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const express = require('express');
const api = require('./server/api');
const utils = require('./server/utils');
const SecureVault = require('./server/vault');
const processor = require('./server/processor');
const SecurityManager = require('./server/security');

let mainWindow;
let server;
let config;
let securityManager;
let secureVault;

// Initialize configuration with security
function initializeConfig() {
  try {
    config = utils.loadConfig();
    
    // Ensure security configuration exists
    if (!config.encryption) {
      config.encryption = {
        algorithm: 'aes-256-gcm',
        keyLength: 256,
        salt: require('crypto').randomBytes(32).toString('hex')
      };
    }
    
    console.log('Configuration loaded successfully with security settings');
  } catch (error) {
    console.error('Failed to load configuration:', error);
    config = {
      server: { port: 3456, host: '127.0.0.1' },
      encryption: { 
        algorithm: 'aes-256-gcm', 
        keyLength: 256, 
        salt: require('crypto').randomBytes(32).toString('hex') 
      },
      vault: { path: './amp_vault.db', hotSlots: 4, maxSlots: 9 }
    };
  }
}

// Initialize security and vault
async function initializeSecurity() {
  try {
    // Initialize security manager
    securityManager = new SecurityManager(config);
    await securityManager.initialize();
    
    // Initialize secure vault
    secureVault = new SecureVault(config);
    await secureVault.initialize();
    
    console.log('Security and vault initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize security:', error);
    dialog.showErrorBox('Security Error', `Failed to initialize security: ${error.message}`);
    return false;
  }
}

// Start the Express server with security middleware
function startServer() {
  try {
    const app = express();
    
    // Security middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Add security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
      next();
    });
    
    // Rate limiting
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    app.use(limiter);
    
    // API routes with security context
    app.use('/chunks', (req, res, next) => {
      req.securityManager = securityManager;
      req.secureVault = secureVault;
      next();
    }, api.chunks);
    
    app.use('/context', (req, res, next) => {
      req.securityManager = securityManager;
      req.secureVault = secureVault;
      next();
    }, api.context);
    
    // Security status endpoint
    app.get('/security/status', (req, res) => {
      try {
        const status = securityManager.getSecurityStatus();
        res.json({ success: true, status });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Vault statistics endpoint
    app.get('/vault/stats', async (req, res) => {
      try {
        const stats = await secureVault.getVaultStats();
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    server = app.listen(config.server.port, config.server.host, () => {
      console.log(`AMP server listening on ${config.server.host}:${config.server.port} with security enabled`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        dialog.showErrorBox('Port Error', `Port ${config.server.port} is already in use. Please close other applications using this port.`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    dialog.showErrorBox('Server Error', 'Failed to start the AMP server. Please check the configuration.');
  }
}

// Create the main window with security features
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/AMPSVG.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    // Security settings
    webSecurity: true,
    allowRunningInsecureContent: false
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Create application menu with security options
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-session');
          }
        },
        {
          label: 'Open Configuration',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });
            if (!result.canceled) {
              mainWindow.webContents.send('load-config', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Secure Data',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            try {
              const encryptedData = await secureVault.exportVaultData();
              const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `amp-export-${new Date().toISOString().split('T')[0]}.encrypted`,
                filters: [{ name: 'Encrypted Files', extensions: ['encrypted'] }]
              });
              
              if (!result.canceled) {
                require('fs').writeFileSync(result.filePath, JSON.stringify(encryptedData), { mode: 0o600 });
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Export Complete',
                  message: 'Data exported securely with encryption'
                });
              }
            } catch (error) {
              dialog.showErrorBox('Export Error', `Failed to export data: ${error.message}`);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Server',
      submenu: [
        {
          label: 'Restart Server',
          click: () => {
            if (server) {
              server.close(() => {
                startServer();
              });
            }
          }
        },
        {
          label: 'Server Status',
          click: () => {
            const status = server ? 'Running' : 'Stopped';
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Server Status',
              message: `AMP Server is ${status}`,
              detail: server ? `Listening on ${config.server.host}:${config.server.port}` : 'Server is not running'
            });
          }
        }
      ]
    },
    {
      label: 'Security',
      submenu: [
        {
          label: 'Security Status',
          click: async () => {
            try {
              const status = securityManager.getSecurityStatus();
              const vaultStats = await secureVault.getVaultStats();
              
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Security Status',
                message: 'Security Information',
                detail: `Algorithm: ${status.algorithm}\nKey Length: ${status.keyLength} bits\nInitialized: ${status.initialized}\nVault Slots: ${vaultStats.usedSlots}/${vaultStats.totalSlots}`
              });
            } catch (error) {
              dialog.showErrorBox('Security Error', `Failed to get security status: ${error.message}`);
            }
          }
        },
        {
          label: 'Rotate Encryption Key',
          click: async () => {
            try {
              const result = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'Key Rotation',
                message: 'Rotate Encryption Key?',
                detail: 'This will re-encrypt all data with a new key. This process may take some time.',
                buttons: ['Cancel', 'Rotate'],
                defaultId: 0
              });
              
              if (result.response === 1) {
                await securityManager.rotateKey();
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Key Rotation Complete',
                  message: 'Encryption key rotated successfully'
                });
              }
            } catch (error) {
              dialog.showErrorBox('Key Rotation Error', `Failed to rotate key: ${error.message}`);
            }
          }
        },
        {
          label: 'Clear All Memory Securely',
          click: async () => {
            try {
              const result = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'Clear Memory',
                message: 'Clear All Memory?',
                detail: 'This will securely erase all stored memory. This action cannot be undone.',
                buttons: ['Cancel', 'Clear'],
                defaultId: 0
              });
              
              if (result.response === 1) {
                await secureVault.clearAllMemory();
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Memory Cleared',
                  message: 'All memory cleared securely'
                });
              }
            } catch (error) {
              dialog.showErrorBox('Clear Error', `Failed to clear memory: ${error.message}`);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AMP Middleware',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AMP Middleware',
              message: 'AMP Middleware Desktop Application',
              detail: 'Version 1.0.0\nAI-powered memory and processing middleware\n\nSecurity Features:\n• AES-256-GCM encryption\n• Secure key management\n• Encrypted data storage\n• Integrity validation'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers with security
ipcMain.handle('get-server-status', () => {
  return {
    running: !!server,
    port: config.server.port,
    host: config.server.host
  };
});

ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('update-config', async (event, newConfig) => {
  try {
    config = { ...config, ...newConfig };
    // Here you would typically save the config to file with encryption
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-security-status', () => {
  try {
    return { success: true, status: securityManager.getSecurityStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-vault-stats', async () => {
  try {
    const stats = await secureVault.getVaultStats();
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(async () => {
  initializeConfig();
  
  // Initialize security before starting server
  const securityInitialized = await initializeSecurity();
  if (!securityInitialized) {
    app.quit();
    return;
  }
  
  startServer();
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  try {
    // Close vault securely
    if (secureVault) {
      await secureVault.close();
    }
    
    // Close server
    if (server) {
      server.close();
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Application Error', `An unhandled promise rejection occurred: ${reason}`);
}); 