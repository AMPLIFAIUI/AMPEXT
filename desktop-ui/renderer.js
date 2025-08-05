// © 2025 AMPiQ - Extension GUI Renderer
// Handles UI interactions and native messaging

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the app
  initializeApp();
});

class AMPiQRenderer {
  constructor() {
    this.currentPage = 'dashboard';
    this.isConnected = false;
    this.activityLog = [];
    this.nativePort = null;
    this.wasConnected = false; // Track previous connection status
  }

  initialize() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setupMemoryBrowserPage(); // Setup memory browser events on load
    this.startPeriodicUpdates();
    
    // Don't set initial connection status - let main process send it
    // this.updateConnectionStatus(false);
    
    // Test if electronAPI is available
    console.log('🔧 Renderer: Testing electronAPI availability...');
    console.log('🔧 Renderer: window.electronAPI exists:', !!window.electronAPI);
    if (window.electronAPI) {
      console.log('🔧 Renderer: electronAPI methods:', Object.keys(window.electronAPI));
    }
    
    this.connectToExtension();
    this.addActivityEntry('🟢 AMPiQ Desktop initialized and ready');
    this.addActivityEntry('🔗 HTTP server active on port 3000');
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        this.navigateToPage(page);
      });
    });
  }

  navigateToPage(pageName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageName);
    });

    // Update page title
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
      pageTitle.textContent = this.getPageTitle(pageName);
    }

    // Show/hide pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
    } else {
      // Create page dynamically if it doesn't exist
      this.createPage(pageName);
    }

    this.currentPage = pageName;
  }

  getPageTitle(pageName) {
    const titles = {
      'dashboard': 'Dashboard',
      'cold-storage': 'Cold Storage',
      'conversations': 'Conversations',
      'search': 'Search',
      'memory-browser': 'Memory Browser',
      'settings': 'Settings'
    };
    return titles[pageName] || pageName;
  }

  createPage(pageName) {
    const contentArea = document.querySelector('.content-area');
    const page = document.createElement('div');
    page.id = `${pageName}-page`;
    page.className = 'page active';

    switch(pageName) {
      case 'cold-storage':
        page.innerHTML = this.createColdStoragePage();
        break;
      case 'conversations':
        page.innerHTML = this.createConversationsPage();
        break;
      case 'search':
        page.innerHTML = this.createSearchPage();
        break;
      case 'memory-browser':
        page.innerHTML = this.createMemoryBrowserPage();
        break;
      case 'settings':
        page.innerHTML = this.createSettingsPage();
        break;
    }

    contentArea.appendChild(page);
    this.setupPageEventListeners(pageName);
  }

  createColdStoragePage() {
    return `
      <div class="page-content">
        <div class="page-header">
          <h2>Cold Storage Management</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="refresh-storage">Refresh</button>
            <button class="btn btn-secondary" id="export-storage">Export</button>
          </div>
        </div>
        
        <div class="storage-stats">
          <div class="stat-card">
            <div class="stat-value" id="total-storage">0 MB</div>
            <div class="stat-label">Total Storage</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="chunk-count">0</div>
            <div class="stat-label">Stored Chunks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="compression-rate">0%</div>
            <div class="stat-label">Compression Rate</div>
          </div>
        </div>

        <div class="storage-list">
          <h3>Recent Entries</h3>
          <div id="storage-entries" class="entry-list">
            <div class="empty-state">No entries in cold storage</div>
          </div>
        </div>
      </div>
    `;
  }

  createConversationsPage() {
    return `
      <div class="page-content">
        <div class="page-header">
          <h2>Conversations</h2>
        </div>
        
        <div class="conversations-container">
          <div class="conversations-header">
            <button class="btn btn-primary" id="refresh-conversations">
              <i>🔄</i>
              <span>Refresh</span>
            </button>
          </div>
          <div class="conversations-list" id="conversation-entries">
            <div class="empty-state">
              <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">💬</div>
                <div style="font-size: 18px; margin-bottom: 10px;">No conversations found</div>
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.6);">Start chatting with AI providers to see conversations here</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createSearchPage() {
    return `
      <div class="page-content">
        <div class="page-header">
          <h2>Search Memory</h2>
        </div>
        
        <div class="search-container">
          <div class="search-box">
            <input type="text" id="search-input" placeholder="Search in memory..." class="search-input">
            <button class="btn btn-primary" id="search-button">Search</button>
          </div>
          
          <div class="search-filters">
            <label>
              <input type="checkbox" id="filter-hot"> Hot Memory
            </label>
            <label>
              <input type="checkbox" id="filter-cold"> Cold Storage
            </label>
            <label>
              <input type="checkbox" id="filter-conversations" checked> Conversations
            </label>
          </div>
        </div>
        
        <div class="search-results">
          <h3>Results</h3>
          <div id="search-results" class="entry-list">
            <div class="empty-state">Enter a search query to find memories</div>
          </div>
        </div>
      </div>
    `;
  }

  createMemoryBrowserPage() {
    return `
      <div class="memory-browser-header">
        <div class="search-controls">
          <input type="text" id="memory-search" placeholder="Search indexed conversations..." class="search-input">
          <select id="provider-filter" class="filter-select">
            <option value="">All Providers</option>
            <option value="chatgpt.com">ChatGPT</option>
            <option value="claude.ai">Claude</option>
          </select>
        </div>
        <div class="privacy-controls">
          <button class="btn btn-secondary" id="frost-viewer">
            <i>❄️</i>
            <span>Frost Viewer</span>
          </button>
          <button class="btn btn-primary" id="refresh-memory">
            <i>🔄</i>
            <span>Refresh</span>
          </button>
          <button class="btn btn-primary" id="send-all-visible">
            <i>📤</i>
            <span>Send All Visible</span>
          </button>
        </div>
      </div>

      <div class="memory-viewer-container">
        <div class="memory-viewer" id="memory-viewer">
          <div class="viewer-actions" id="viewer-actions">
            <button class="btn btn-small btn-secondary" id="inject-selected" style="display: none;">
              <i>💉</i>
              <span>Inject Selected</span>
            </button>
          </div>
                    <div class="empty-state">Loading indexed conversations...</div>
        </div>
        <div class="frost-overlay" id="frost-overlay">
          <div class="frost-message">
            <i>❄️</i>
            <span>Viewer Frosted for Privacy</span>
            <button class="btn btn-primary" id="unfrost-viewer">Unfrost</button>
          </div>
        </div>
      </div>
    `;
  }

  createSettingsPage() {
    return `
      <div class="page-content">
        <div class="page-header">
          <h2>Settings</h2>
        </div>
        
        <div class="settings-section">
          <h3>Storage Settings</h3>
          <div class="setting-item">
            <label>Maximum Storage Size (GB)</label>
            <input type="number" id="max-storage" value="10" min="1" max="100">
          </div>
          <div class="setting-item">
            <label>Auto-compress after (days)</label>
            <input type="number" id="compress-days" value="7" min="1" max="365">
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Extension Settings</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="auto-connect" checked>
              Auto-connect to extension
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="show-notifications">
              Show desktop notifications
            </label>
          </div>
        </div>
        
        <div class="settings-actions">
          <button class="btn btn-primary" id="save-settings">Save Settings</button>
          <button class="btn btn-secondary" id="reset-settings">Reset to Default</button>
        </div>
      </div>
    `;
  }

  setupPageEventListeners(pageName) {
    console.log(`🔧 Setting up event listeners for page: ${pageName}`);
    
    switch(pageName) {
      case 'search':
        this.setupSearchPage();
        break;
      case 'memory-browser':
        this.setupMemoryBrowserPage();
        break;
      case 'settings':
        this.setupSettingsPage();
        break;
      case 'conversations':
        this.setupConversationsPage();
        break;
      case 'cold-storage':
        this.setupColdStoragePage();
        break;
    }
  }

  setupSearchPage() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    
    if (searchButton && searchInput) {
      searchButton.addEventListener('click', () => this.performSearch());
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.performSearch();
      });
    }
  }

  setupMemoryBrowserPage() {
    console.log('🔧 Setting up memory browser page event listeners...');
    
    const searchInput = document.getElementById('memory-search');
    const searchButton = document.getElementById('search-button');
    const providerFilter = document.getElementById('provider-filter');
    const refreshButton = document.getElementById('refresh-memory');
    const sendAllVisibleButton = document.getElementById('send-all-visible');
    
    if (searchInput && searchButton) {
      searchButton.addEventListener('click', () => {
        this.performMemorySearch();
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performMemorySearch();
        }
      });
    }

    if (providerFilter) {
      providerFilter.addEventListener('change', () => this.filterMemoryData());
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.loadMemoryData());
    }

    if (sendAllVisibleButton) {
      sendAllVisibleButton.addEventListener('click', () => this.injectAllVisibleContent());
    }

    // Frost viewer button
    const frostViewerBtn = document.getElementById('frost-viewer');
    if (frostViewerBtn) {
      frostViewerBtn.addEventListener('click', () => {
        this.frostViewer();
      });
    }

    // Unfrost viewer button
    const unfrostViewerBtn = document.getElementById('unfrost-viewer');
    if (unfrostViewerBtn) {
      unfrostViewerBtn.addEventListener('click', () => {
        this.unfrostViewer();
      });
    }

    // Load memory data automatically when page is set up
    console.log('🔧 Loading memory data for live browser...');
    this.loadMemoryData();

    console.log('✅ Memory browser page setup complete');
  }

  performMemorySearch() {
    const searchInput = document.getElementById('memory-search');
    const query = searchInput.value.trim();
    
    if (!query) {
      this.showMemoryBrowserMessage('Please enter a search term');
      return;
    }
    
    if (!this.isConnected) {
      this.showMemoryBrowserMessage('Not connected to extension');
      return;
    }
    
    // Send search request to extension
    this.sendNativeMessage({
      action: 'searchMemory',
      query: query
    });
    
    this.addActivityEntry(`🔍 Searching for: "${query}"`);
  }

  displayMemoryBrowserResults(results) {
    const viewer = document.getElementById('fat-zipper-viewer');
    if (!viewer) return;
    
    if (!results || results.length === 0) {
      viewer.innerHTML = `
        <div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
          <div style="font-size: 18px; margin-bottom: 10px;">No Results Found</div>
          <div style="font-size: 14px;">Try different keywords or check your search terms</div>
        </div>
      `;
      return;
    }
    
    viewer.innerHTML = results.map(result => this.createConversationBubble(result)).join('');
    
    // Add click handlers for conversation bubbles
    this.setupConversationBubbleHandlers();
  }

  createConversationBubble(result) {
    const s1s9Data = result.s1s9Data || {};
    const squares = this.generateS1S9Grid(s1s9Data);
    
    return `
      <div class="conversation-bubble" data-fat-address="${result.address}">
        <div class="conversation-header">
          <div class="conversation-title">${this.getProviderName(result.provider || 'Unknown')}</div>
          <div class="conversation-meta">${this.getTimeAgo(result.timestamp)} • Relevance: ${result.relevance}</div>
        </div>
        <div class="conversation-preview">${result.canonical || result.fullContent?.substring(0, 200) || 'No preview available'}</div>
        <div class="s1s9-history">
          <div>S1-S9 Progression:</div>
          <div class="s1s9-grid">
            ${squares}
          </div>
        </div>
      </div>
    `;
  }

  generateS1S9Grid(s1s9Data) {
    let squares = '';
    for (let i = 1; i <= 9; i++) {
      const squareKey = `sq${i}`;
      const hasContent = s1s9Data[squareKey]?.content;
      const isS9 = i === 9;
      
      squares += `
        <div class="s1s9-square ${hasContent ? 'filled' : ''} ${isS9 ? 's9' : ''}" title="S${i}: ${hasContent ? 'Has content' : 'Empty'}">
          ${i}
        </div>
      `;
    }
    return squares;
  }

  setupConversationBubbleHandlers() {
    const bubbles = document.querySelectorAll('.conversation-bubble');
    bubbles.forEach(bubble => {
      bubble.addEventListener('click', () => {
        const fatAddress = bubble.getAttribute('data-fat-address');
        this.expandConversation(fatAddress);
      });
    });
  }

  expandConversation(fatAddress) {
    // Request full conversation data from extension
    this.sendNativeMessage({
      action: 'retrieveFromFatZipper',
      address: fatAddress
    });
    
    this.addActivityEntry(`📖 Expanding conversation: ${fatAddress}`);
  }

  displayFullConversation(fatBlock) {
    const viewer = document.getElementById('fat-zipper-viewer');
    if (!viewer || !fatBlock) return;
    
    const chunk = fatBlock.chunk;
    const s1s9Data = fatBlock.s1s9Data;
    
    viewer.innerHTML = `
      <div style="margin-bottom: 20px;">
        <button class="search-button" onclick="window.ampiqApp.backToSearchResults()">← Back to Search</button>
      </div>
      <div class="conversation-bubble">
        <div class="conversation-header">
          <div class="conversation-title">Full Conversation - ${this.getProviderName(chunk.ai_provider || 'Unknown')}</div>
          <div class="conversation-meta">${this.getTimeAgo(chunk.timestamp)} • ${chunk.messageType}</div>
        </div>
        <div class="conversation-preview" style="white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
          ${chunk.fullText || 'No content available'}
        </div>
        <div class="s1s9-history">
          <div>S1-S9 Full Progression:</div>
          ${this.createS1S9FullView(s1s9Data)}
        </div>
      </div>
    `;
  }

  createS1S9FullView(s1s9Data) {
    let html = '';
    for (let i = 1; i <= 9; i++) {
      const squareKey = `sq${i}`;
      const squareData = s1s9Data[squareKey];
      
      if (squareData?.content) {
        html += `
          <div style="margin: 10px 0; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
            <div style="font-weight: bold; color: #3498db; margin-bottom: 5px;">S${i} (${squareData.type})</div>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">${squareData.content}</div>
          </div>
        `;
      }
    }
    return html;
  }

  backToSearchResults() {
    // Restore previous search results
    const searchInput = document.getElementById('memory-search');
    if (searchInput && searchInput.value.trim()) {
      this.performMemorySearch();
    }
  }

  showMemoryBrowserMessage(message) {
    const viewer = document.getElementById('fat-zipper-viewer');
    if (viewer) {
      viewer.innerHTML = `
        <div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 40px;">
          <div style="font-size: 24px; margin-bottom: 10px;">ℹ️</div>
          <div style="font-size: 14px;">${message}</div>
        </div>
      `;
    }
  }

  performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

    // Search actual stored data
    if (this.isConnected && window.electronAPI) {
      // Send search request to main process
      window.electronAPI.sendSearchRequest(query).then(results => {
        if (results && results.length > 0) {
          this.displaySearchResults(results);
        } else {
          resultsDiv.innerHTML = '<div class="no-results">No results found for "' + query + '"</div>';
        }
      }).catch(error => {
        console.error('Search failed:', error);
        resultsDiv.innerHTML = '<div class="error">Search failed: ' + error.message + '</div>';
      });
    } else {
      resultsDiv.innerHTML = '<div class="error">Not connected to extension - cannot search</div>';
    }
  }

  displaySearchResults(results) {
    const resultsDiv = document.getElementById('search-results');
    let html = '';
    
    results.forEach(result => {
      const timeAgo = this.getTimeAgo(result.timestamp);
      const providerName = this.getProviderName(result.ai_provider || 'unknown');
      
      html += `
        <div class="search-result">
          <div class="result-header">
            <span class="result-source">${providerName}</span>
            <span class="result-time">${timeAgo}</span>
          </div>
          <div class="result-content">${this.truncateContent(result.content || result.fullText || '', 200)}</div>
        </div>
      `;
    });
    
    resultsDiv.innerHTML = html;
  }

  setupSettingsPage() {
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-settings');
    const exportButton = document.getElementById('export-settings');

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetSettings();
      });
    }

    if (exportButton) {
      exportButton.addEventListener('click', () => {
        this.exportSettings();
      });
    }

    // Load current settings
    this.loadSettings();
  }

  setupConversationsPage() {
    const refreshButton = document.getElementById('refresh-conversations');
    
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.addActivityEntry('🔄 Refreshing conversations...');
        // TODO: Implement conversation refresh logic
        this.addActivityEntry('💬 No conversations available yet');
      });
    }
  }

  setupColdStoragePage() {
    // TODO: Implement cold storage page functionality
    this.addActivityEntry('🧊 Cold storage page loaded');
  }

  sendNativeMessage(message) {
    // Use IPC communication instead of direct HTTP requests
    if (window.electronAPI && window.electronAPI.sendNativeMessage) {
      window.electronAPI.sendNativeMessage(message).catch(error => {
        console.error('IPC request failed:', error);
        this.addActivityEntry('❌ IPC request failed');
      });
    } else {
      console.error('No IPC connection available');
      this.addActivityEntry('❌ Cannot send message - no IPC connection available');
    }
  }

  async saveSettings() {
    const settings = {
      injection: {
        autoInject: document.getElementById('auto-inject').checked,
        threshold: parseFloat(document.getElementById('injection-threshold').value),
        maxSize: parseInt(document.getElementById('max-injection-size').value)
      },
      storage: {
        autoCleanup: document.getElementById('auto-cleanup').checked,
        cleanupDays: parseInt(document.getElementById('cleanup-days').value),
        maxSize: parseInt(document.getElementById('max-storage-size').value)
      },
      performance: {
        enableCaching: document.getElementById('enable-caching').checked,
        cacheDuration: parseInt(document.getElementById('cache-duration').value),
        optimizeMemory: document.getElementById('optimize-memory').checked
      },
      security: {
        encryptionLevel: document.getElementById('encryption-level').value,
        keyRotation: document.getElementById('key-rotation').checked,
        rotationInterval: parseInt(document.getElementById('rotation-interval').value)
      }
    };

    try {
      // Send settings to extension
      if (window.ampPort) {
        window.ampPort.postMessage({
          action: 'updateSettings',
          settings: settings
        });
      }

      // Save to local storage
      localStorage.setItem('amp-settings', JSON.stringify(settings));
      
      this.showNotification('Settings saved successfully!', 'success');
    this.addActivityEntry('⚙️ Settings saved successfully');
    } catch (error) {
      this.showNotification('Failed to save settings: ' + error.message, 'error');
    }
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Reset form values to defaults
      document.getElementById('auto-inject').checked = true;
      document.getElementById('injection-threshold').value = '0.5';
      document.getElementById('max-injection-size').value = '4000';
      document.getElementById('auto-cleanup').checked = true;
      document.getElementById('cleanup-days').value = '7';
      document.getElementById('max-storage-size').value = '100';
      document.getElementById('enable-caching').checked = true;
      document.getElementById('cache-duration').value = '5';
      document.getElementById('optimize-memory').checked = true;
      document.getElementById('encryption-level').value = 'aes-256';
      document.getElementById('key-rotation').checked = true;
      document.getElementById('rotation-interval').value = '24';

      this.showNotification('Settings reset to defaults!', 'success');
    }
  }

  exportSettings() {
    const settings = localStorage.getItem('amp-settings');
    if (settings) {
      const blob = new Blob([settings], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amp-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('Settings exported successfully!', 'success');
    } else {
      this.showNotification('No settings to export!', 'error');
    }
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('amp-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        
        // Apply settings to form
        if (settings.injection) {
          document.getElementById('auto-inject').checked = settings.injection.autoInject;
          document.getElementById('injection-threshold').value = settings.injection.threshold;
          document.getElementById('max-injection-size').value = settings.injection.maxSize;
        }
        
        if (settings.storage) {
          document.getElementById('auto-cleanup').checked = settings.storage.autoCleanup;
          document.getElementById('cleanup-days').value = settings.storage.cleanupDays;
          document.getElementById('max-storage-size').value = settings.storage.maxSize;
        }
        
        if (settings.performance) {
          document.getElementById('enable-caching').checked = settings.performance.enableCaching;
          document.getElementById('cache-duration').value = settings.performance.cacheDuration;
          document.getElementById('optimize-memory').checked = settings.performance.optimizeMemory;
        }
        
        if (settings.security) {
          document.getElementById('encryption-level').value = settings.security.encryptionLevel;
          document.getElementById('key-rotation').checked = settings.security.keyRotation;
          document.getElementById('rotation-interval').value = settings.security.rotationInterval;
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Memory Browser Methods

  frostViewer() {
    console.log('❄️ frostViewer() called');
    const frostOverlay = document.getElementById('frost-overlay');
    console.log('Frost overlay element:', frostOverlay);
    
    if (frostOverlay) {
      frostOverlay.classList.add('active');
      console.log('✅ Frost overlay activated');
      this.addActivityEntry('❄️ Memory viewer frosted for privacy');
    } else {
      console.error('❌ Frost overlay element not found!');
      this.addActivityEntry('❌ Could not frost viewer - overlay not found');
    }
  }

  unfrostViewer() {
    console.log('🔓 unfrostViewer() called');
    const frostOverlay = document.getElementById('frost-overlay');
    console.log('Frost overlay element:', frostOverlay);
    
    if (frostOverlay) {
      frostOverlay.classList.remove('active');
      console.log('✅ Frost overlay deactivated');
      this.addActivityEntry('🔓 Memory viewer unfrosted');
    } else {
      console.error('❌ Frost overlay element not found!');
      this.addActivityEntry('❌ Could not unfrost viewer - overlay not found');
    }
  }

  async loadMemoryData() {
    // Get memory data directly from main process via IPC
    if (window.electronAPI && window.electronAPI.getMemoryData) {
      console.log('📡 Requesting memory data from main process...');
      try {
        const memoryData = await window.electronAPI.getMemoryData();
        console.log(`📊 Received ${memoryData.length} memory chunks from main process`);
        this.displayMemoryData(memoryData);
        
        // Store the data for live updates
        this.currentMemoryData = memoryData;
      } catch (error) {
        console.error('❌ Failed to get memory data:', error);
        this.addActivityEntry('❌ Failed to load memory data');
      }
    } else {
      console.log('⚠️ IPC connection not available, cannot load real data');
      this.addActivityEntry('⚠️ IPC connection not available');
    }
  }

  displayMemoryData(memoryData) {
    const memoryViewer = document.getElementById('memory-viewer');
    if (!memoryViewer) return;

    console.log(`📊 Displaying memory index: ${memoryData ? memoryData.length : 0} entries`);

    if (!memoryData || memoryData.length === 0) {
      console.log('⚠️ No memory data to display');
      memoryViewer.innerHTML = '<div class="empty-state">No indexed conversations found</div>';
      return;
    }

    // Create simple scrollable memory index
    const html = memoryData.map(chunk => this.createMemoryIndexEntry(chunk)).join('');
    memoryViewer.innerHTML = html;

    // Setup action buttons
    this.setupMemoryIndexActions();
    
    console.log(`✅ Successfully displayed ${memoryData.length} memory index entries`);
  }

  createMemoryEntryHTML(entry) {
    const providerClass = this.getProviderClass(entry.provider);
    const timeAgo = this.getTimeAgo(entry.timestamp);
    
    return `
      <div class="memory-entry" data-id="${entry.id}">
        <div class="memory-header">
          <div class="memory-provider ${providerClass}">
            <i>${this.getProviderIcon(entry.provider)}</i>
            <span>${this.getProviderName(entry.provider)}</span>
          </div>
          <div class="memory-time">${timeAgo}</div>
        </div>
        <div class="memory-content" data-content="${entry.id}">
          ${this.truncateContent(entry.content, 200)}
        </div>
        <div class="memory-actions">
          <button class="btn btn-small btn-secondary copy-btn" data-id="${entry.id}">
            <i>📋</i> Copy
          </button>
          <button class="btn btn-small btn-primary inject-btn" data-id="${entry.id}">
            <i>💉</i> Inject
          </button>
        </div>
      </div>
    `;
  }

  setupMemoryEntryActions() {
    // Copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = e.target.closest('.copy-btn').getAttribute('data-id');
        this.copyMemoryContent(entryId);
      });
    });

    // Inject functionality
    document.querySelectorAll('.inject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = e.target.closest('.inject-btn').getAttribute('data-id');
        this.injectMemoryContent(entryId);
      });
    });
  }

  copyMemoryContent(entryId) {
    // Get the full content from memory data
    const content = this.getMemoryContentById(entryId);
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        this.addActivityEntry('📋 Memory content copied to clipboard');
      });
    }
  }

  injectMemoryContent(entryId) {
    const content = this.getMemoryContentById(entryId);
    if (content) {
      // Send injection request to native host
      if (this.nativePort) {
        this.nativePort.postMessage({
          type: 'inject_memory',
          content: content,
          entryId: entryId
        });
      }
      this.addActivityEntry('💉 Memory content injected into current conversation');
    }
  }

  filterMemoryData() {
    const searchTerm = document.getElementById('memory-search')?.value.toLowerCase();
    const providerFilter = document.getElementById('provider-filter')?.value;
    
    // Re-filter existing data or reload with filters
    this.loadMemoryData();
  }

  // Text selection and injection features
  setupTextSelectionFeatures() {
    // Track text selection across the memory viewer
    this.selectedText = '';
    this.selectionRange = null;
    
    document.addEventListener('mouseup', () => this.handleTextSelection());
    document.addEventListener('keyup', () => this.handleTextSelection());
    
    // Setup action buttons
    const injectSelectedBtn = document.getElementById('inject-selected');
    const injectAllBtn = document.getElementById('inject-all-visible');
    
    if (injectSelectedBtn) {
      injectSelectedBtn.addEventListener('click', () => this.injectSelectedText());
    }
    
    if (injectAllBtn) {
      injectAllBtn.addEventListener('click', () => this.injectAllVisibleContent());
    }
  }

  handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Check if selection is within memory viewer
    const memoryViewer = document.getElementById('memory-viewer');
    if (!memoryViewer || !selection.rangeCount) {
      this.hideSelectionActions();
      return;
    }
    
    const range = selection.getRangeAt(0);
    const isInMemoryViewer = memoryViewer.contains(range.commonAncestorContainer);
    
    if (selectedText && isInMemoryViewer && selectedText.length > 10) {
      this.selectedText = selectedText;
      this.selectionRange = range;
      this.showSelectionActions();
      this.highlightSelection(range);
      this.addActivityEntry(`📝 Selected text: ${selectedText.substring(0, 50)}...`);
    } else {
      this.hideSelectionActions();
      this.clearHighlights();
    }
  }

  showSelectionActions() {
    const viewerActions = document.getElementById('viewer-actions');
    const injectSelectedBtn = document.getElementById('inject-selected');
    
    if (viewerActions) {
      viewerActions.classList.add('has-selection');
    }
    
    if (injectSelectedBtn) {
      injectSelectedBtn.style.display = 'inline-flex';
      injectSelectedBtn.innerHTML = `<i>💉</i><span>Inject Selected (${this.selectedText.length} chars)</span>`;
    }
  }

  hideSelectionActions() {
    const viewerActions = document.getElementById('viewer-actions');
    const injectSelectedBtn = document.getElementById('inject-selected');
    
    if (viewerActions) {
      viewerActions.classList.remove('has-selection');
    }
    
    if (injectSelectedBtn) {
      injectSelectedBtn.style.display = 'none';
    }
    
    this.selectedText = '';
    this.selectionRange = null;
  }

  highlightSelection(range) {
    // Clear previous highlights
    this.clearHighlights();
    
    try {
      // Create highlight span
      const highlight = document.createElement('span');
      highlight.className = 'highlighted-text';
      highlight.setAttribute('data-amp-highlight', 'true');
      
      // Wrap the selection
      range.surroundContents(highlight);
    } catch (error) {
      // Fallback: add highlight class to parent element
      console.warn('Could not highlight selection:', error);
    }
  }

  clearHighlights() {
    // Remove all existing highlights
    const highlights = document.querySelectorAll('[data-amp-highlight="true"]');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
      parent.removeChild(highlight);
      parent.normalize();
    });
  }

  injectSelectedText() {
    if (!this.selectedText) {
      this.addActivityEntry('❌ No text selected for injection');
      return;
    }

    // Send selected text to native host for injection
    if (this.nativePort) {
      this.nativePort.postMessage({
        type: 'inject_memory',
        content: this.selectedText,
        source: 'text_selection',
        length: this.selectedText.length
      });
      this.addActivityEntry(`💉 Injecting selected text (${this.selectedText.length} characters)`);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(this.selectedText).then(() => {
        this.addActivityEntry('📋 Selected text copied to clipboard (native messaging unavailable)');
      });
    }
    
    this.hideSelectionActions();
    this.clearHighlights();
  }

  injectAllVisibleContent() {
    const memoryViewer = document.getElementById('memory-viewer');
    if (!memoryViewer) {
      this.addActivityEntry('❌ No content visible in memory viewer');
      return;
    }

    // Extract all visible text content
    const allContent = this.extractAllVisibleContent(memoryViewer);
    
    if (!allContent || allContent.length < 10) {
      this.addActivityEntry('❌ No substantial content to inject');
      return;
    }

    // Send all visible content to native host
    if (this.nativePort) {
      this.nativePort.postMessage({
        type: 'inject_memory',
        content: allContent,
        source: 'all_visible',
        length: allContent.length
      });
      this.addActivityEntry(`📤 Injecting all visible content (${allContent.length} characters)`);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(allContent).then(() => {
        this.addActivityEntry('📋 All visible content copied to clipboard (native messaging unavailable)');
      });
    }
  }

  extractAllVisibleContent(container) {
    let content = '';
    const entries = container.querySelectorAll('.memory-entry');
    
    entries.forEach((entry, index) => {
      const provider = entry.querySelector('.memory-provider span')?.textContent || 'Unknown';
      const time = entry.querySelector('.memory-time')?.textContent || 'Unknown time';
      const memoryContent = entry.querySelector('.memory-content')?.textContent || '';
      
      content += `=== ${provider} (${time}) ===\n`;
      content += memoryContent.trim() + '\n\n';
    });
    
    return content.trim();
  }

  // Utility methods
  getProviderClass(provider) {
    const classes = {
      'chatgpt.com': 'provider-chatgpt',
      'claude.ai': 'provider-claude', 
      'gemini.google.com': 'provider-gemini'
    };
    return classes[provider] || 'provider-unknown';
  }

  getProviderIcon(provider) {
    const icons = {
      'chatgpt.com': '🤖',
      'claude.ai': '🧠',
      'gemini.google.com': '💎'
    };
    return icons[provider] || '❓';
  }

  getProviderName(provider) {
    const names = {
      'chatgpt.com': 'ChatGPT',
      'claude.ai': 'Claude',
      'gemini.google.com': 'Gemini'
    };
    return names[provider] || 'Unknown';
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  truncateContent(content, maxLength) {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  getMemoryContentById(entryId) {
    // Get content from stored memory data
    if (this.currentMemoryData && Array.isArray(this.currentMemoryData)) {
      const entry = this.currentMemoryData.find(item => item.id === entryId);
      return entry ? entry.content : '';
    }
    return '';
  }

  createMemoryIndexEntry(chunk) {
    const providerClass = this.getProviderClass(chunk.ai_provider);
    const timeAgo = this.getTimeAgo(chunk.timestamp);
    const contentPreview = this.truncateContent(chunk.content, 150);
    
    return `
      <div class="memory-index-entry" data-id="${chunk.id}">
        <div class="entry-header">
          <div class="entry-provider ${providerClass}">
            <i>${this.getProviderIcon(chunk.ai_provider)}</i>
            <span>${this.getProviderName(chunk.ai_provider)}</span>
          </div>
          <div class="entry-time">${timeAgo}</div>
        </div>
        <div class="entry-content">
          ${contentPreview}
        </div>
        <div class="entry-actions">
          <button class="btn btn-small btn-secondary copy-btn" data-id="${chunk.id}" title="Copy to clipboard">
            <i>📋</i> Copy
          </button>
          <button class="btn btn-small btn-primary inject-btn" data-id="${chunk.id}" title="Inject into conversation">
            <i>💉</i> Inject
          </button>
          <button class="btn btn-small btn-info expand-btn" data-id="${chunk.id}" title="View full content">
            <i>👁️</i> View
          </button>
        </div>
      </div>
    `;
  }

  setupMemoryIndexActions() {
    // Copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = e.target.closest('.copy-btn').getAttribute('data-id');
        this.copyMemoryContent(entryId);
      });
    });

    // Inject functionality
    document.querySelectorAll('.inject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = e.target.closest('.inject-btn').getAttribute('data-id');
        this.injectMemoryContent(entryId);
      });
    });

    // Expand functionality
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = e.target.closest('.expand-btn').getAttribute('data-id');
        this.expandMemoryContent(entryId);
      });
    });
  }

  expandMemoryContent(entryId) {
    const content = this.getMemoryContentById(entryId);
    if (content) {
      // Show full content in a modal or expand the entry
      this.showMemoryModal(content, entryId);
    }
  }

  showMemoryModal(content, entryId) {
    // Create a simple modal to show full content
    const modal = document.createElement('div');
    modal.className = 'memory-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Memory Content</h3>
          <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="modal-body">
          <pre style="white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${content}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
          <button class="btn btn-primary" onclick="window.ampiqApp.injectMemoryContent('${entryId}')">Inject</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  setupEventListeners() {
    // Clear activity button
    const clearActivity = document.getElementById('clear-activity');
    if (clearActivity) {
      clearActivity.addEventListener('click', () => {
        const activityEntries = document.getElementById('activity-entries');
        activityEntries.innerHTML = '';
        this.activityLog = [];
      });
    }


  }

  connectToExtension() {
    // Desktop app runs HTTP server - extensions connect via HTTP
    this.addActivityEntry('🔄 Waiting for Chrome extension connection...');
    
    // Event listener is now set up in initializeApp() to avoid race conditions
    console.log('🔧 Renderer: connectToExtension called - events handled by global listener');
  }

  handleNativeMessage(message) {
    console.log('🔧 Handling HTTP message:', message.type, message);
    
    switch(message.type) {
      case 'pong':
        // Set connected for any pong response
        this.isConnected = true;
        this.wasConnected = true;
        this.updateConnectionStatus(true);
        this.addActivityEntry('✅ Connected to Chrome extension');
        this.addActivityEntry('📡 HTTP connection established');
        break;
        
      case 'status_response':
        // Don't change connection status for status responses
        // Only log if there's an actual change or issue
        if (message.overflowCount > 0) {
          this.addActivityEntry(`📈 Storage status: ${message.overflowCount} overflow files`);
        }
        break;
      case 'memory_update':
        this.updateMemoryStats(message.data);
        this.addActivityEntry(`📊 Memory stats updated: ${message.data.totalChunks || 0} chunks`);
        break;
      case 'overflow_saved':
        this.addActivityEntry(`💾 Overflow chunk saved: ${message.chunkId || 'unknown'}`);
        break;

      case 'memory_data_response':
        if (message.data && Array.isArray(message.data)) {
          this.displayMemoryData(message.data);
          this.addActivityEntry(`📖 Loaded ${message.data.length} memory entries`);
        } else {
          this.addActivityEntry('⚠️ No memory data received');
          this.displayMemoryData([]);
        }
        break;
      case 'searchMemory':
        if (message.success && message.results) {
          this.displayMemoryBrowserResults(message.results);
          this.addActivityEntry(`✅ Found ${message.results.length} results`);
        } else {
          this.showMemoryBrowserMessage('Search failed: ' + (message.error || 'Unknown error'));
          this.addActivityEntry('❌ Search failed');
        }
        break;
        
      case 'getMemoryStats':
        // Handle memory stats response from native host
        if (message.success && message.stats) {
          console.log('🔧 REAL Memory stats received:', message.stats);
          this.updateMemoryStats(message.stats);
          
          // Show REAL numbers in activity feed
          const stats = message.stats;
          if (stats.totalChunks > 0) {
            this.addActivityEntry(`📈 REAL DATA: ${stats.totalChunks} chunks, ${stats.hotMemorySize} bytes`);
            if (stats.providers && stats.providers.length > 0) {
              this.addActivityEntry(`🏷️ Providers: ${stats.providers.join(', ')}`);
            }
            if (stats.topics && stats.topics.length > 0) {
              this.addActivityEntry(`📝 Topics: ${stats.topics.join(', ')}`);
            }
          } else {
            this.addActivityEntry('⚠️ No memory data found - system may not be capturing content');
          }
        } else if (message.error) {
          console.warn('Failed to get memory stats:', message.error);
          this.addActivityEntry(`❌ Stats error: ${message.error}`);
        }
        break;
      case 'search_results':
        if (message.results && message.results.length > 0) {
          this.displayMemoryBrowserResults(message.results);
          this.addActivityEntry(`✅ Found ${message.results.length} search results`);
        } else {
          this.showMemoryBrowserMessage('No search results found');
        }
        break;
      case 'retrieveFromFatZipper':
        if (message.success && message.fatBlock) {
          this.displayFullConversation(message.fatBlock);
          this.addActivityEntry('✅ Full conversation loaded');
        } else {
          this.showMemoryBrowserMessage('Failed to load conversation: ' + (message.error || 'Unknown error'));
          this.addActivityEntry('❌ Failed to load conversation');
        }
        break;
      case 'injection_success':
        this.addActivityEntry(`💉 Successfully injected memory content`);
        break;
      case 'injection_error':
        this.addActivityEntry(`❌ Failed to inject memory content: ${message.error}`);
        break;
      case 'all_memory_saved':
        this.addActivityEntry(`💾 All memory saved: ${message.chunkCount || 0} chunks`);
        break;
        
      case 'error':
        this.addActivityEntry(`❌ Error: ${message.error || 'Unknown error'}`);
        break;
        
      default:
        // Only log unknown messages if they seem important
        if (message.type && !message.type.includes('status')) {
          console.log('📨 Unhandled message type:', message.type, message);
          this.addActivityEntry(`📨 Received: ${message.type}`);
        }
    }
  }

  updateConnectionStatus(connected) {
    // Update the status indicator dot
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
      statusDot.style.background = connected ? '#2ecc71' : '#e74c3c';
      statusDot.style.animation = connected ? 'pulse 2s infinite' : 'none';
    }
    
    // Update the status text
    const statusText = document.querySelector('.status-indicator span');
    if (statusText) {
      statusText.textContent = connected ? 'Connected' : 'Disconnected';
      statusText.style.color = connected ? '#2ecc71' : '#e74c3c';
    }
    
    // Update the internal connection state
    this.isConnected = connected;
    console.log(`🔗 Connection status updated: ${connected ? 'Connected' : 'Disconnected'}`);
    
    // Add activity entry for connection changes
    if (connected && !this.wasConnected) {
      this.addActivityEntry('✅ Connected');
      this.wasConnected = true;
    } else if (!connected && this.wasConnected) {
      this.addActivityEntry('❌ Disconnected');
      this.wasConnected = false;
    }
  }

  updateMemoryStats(stats) {
    try {
      console.log('🔧 Updating UI with REAL stats:', stats);
      
      // Update stats based on current page
      const elements = {};
      
      if (this.currentPage === 'dashboard') {
        // Dashboard page elements
        elements['cold-storage-size'] = stats.totalSize ? `${(stats.totalSize / 1024).toFixed(2)} KB` : '0 KB';
        elements['total-chunks'] = stats.totalChunks || 0;
      } else if (this.currentPage === 'cold-storage') {
        // Cold Storage page elements
        elements['total-storage'] = stats.totalSize ? `${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB` : '0 MB';
        elements['chunk-count'] = stats.totalChunks || 0;
        elements['compression-rate'] = '70%'; // Fixed for now
      }

      Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          if (typeof value === 'number') {
            element.textContent = value.toLocaleString();
          } else {
            element.textContent = value;
          }
          console.log(`🔧 Updated ${id}: ${value}`);
        }
      });

      // Update storage progress if available
      if (stats.usedStorage && stats.maxStorage) {
        const progress = (stats.usedStorage / stats.maxStorage) * 100;
        const progressBar = document.getElementById('storage-progress');
        const progressText = document.getElementById('storage-usage-text');
        
        if (progressBar) {
          progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (progressText) {
          progressText.textContent = `${stats.usedStorage} MB / ${stats.maxStorage} GB`;
        }
      }
      
      // Update memory browser if on that page
      if (this.currentPage === 'memory-browser') {
        this.loadMemoryData();
      }
      
    } catch (error) {
      console.error('Failed to update memory stats:', error);
    }
  }

  addActivityEntry(message) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    const activityEntries = document.getElementById('activity-entries');
    if (activityEntries) {
      const entry = document.createElement('div');
      entry.className = 'activity-entry';
      entry.innerHTML = `
        <div class="activity-time">${time}</div>
        <div class="activity-message">${message}</div>
      `;
      
      activityEntries.insertBefore(entry, activityEntries.firstChild);
      
      // Keep only last 50 entries
      while (activityEntries.children.length > 50) {
        activityEntries.removeChild(activityEntries.lastChild);
      }
    }
    
    this.activityLog.unshift({ time, message });
    
    // Log to console for debugging
    console.log(`[${time}] ${message}`);
  }

  startPeriodicUpdates() {
    // Renderer only receives - no sending
    // All communication goes through main process
  }
  
  cleanup() {
    // Clear all intervals
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
  }
}

// Initialize the app
function initializeApp() {
  const app = new AMPiQRenderer();
  app.initialize();
  
  // Expose the app instance globally so event listeners can access it
  window.ampiqApp = app;

  // Listen for memory stats and errors from Electron main process
  if (window.electronAPI && window.electronAPI.onMemoryUpdate) {
    window.electronAPI.onMemoryUpdate((event, data) => {
      console.log('🔧 Renderer: Received memory update from main process:', data);
      console.log('🔧 Renderer: Data type:', typeof data);
      console.log('🔧 Renderer: Has stats?', !!data.stats);
      console.log('🔧 Renderer: Stats content:', data.stats);
      
      if (data && data.error) {
        // Show error in UI and log
        console.error(data.error);
        if (window.ampiqApp && typeof window.ampiqApp.addActivityEntry === 'function') {
          window.ampiqApp.addActivityEntry('❌ ' + data.error);
        }
        return;
      }
      
      // Update connection status if provided
      if (data && typeof data.connected === 'boolean') {
        console.log('🔧 Renderer: Updating connection status to:', data.connected);
        if (window.ampiqApp && typeof window.ampiqApp.updateConnectionStatus === 'function') {
          window.ampiqApp.updateConnectionStatus(data.connected);
        }
      }
      
      // Update stats if provided
      if (data && data.stats) {
        if (window.ampiqApp && typeof window.ampiqApp.updateMemoryStats === 'function') {
          window.ampiqApp.updateMemoryStats(data.stats);
        }
      }
    });
  }

  // Collapsible side panel logic
  const sidePanel = document.getElementById('sidePanel');
  if (sidePanel) {
    let collapseBtn = sidePanel.querySelector('.collapse-btn');
    if (!collapseBtn) {
      collapseBtn = document.createElement('button');
      collapseBtn.textContent = '⏴';
      collapseBtn.className = 'collapse-btn';
      sidePanel.prepend(collapseBtn);
    }
    let collapsed = false;
    collapseBtn.onclick = function() {
      collapsed = !collapsed;
      if (collapsed) {
        sidePanel.style.width = '36px';
        sidePanel.classList.add('collapsed');
        collapseBtn.textContent = '⏵';
        // Hide all child elements except button
        Array.from(sidePanel.children).forEach(child => {
          if (child !== collapseBtn) child.style.display = 'none';
        });
      } else {
        sidePanel.style.width = '260px';
        sidePanel.classList.remove('collapsed');
        collapseBtn.textContent = '⏴';
        Array.from(sidePanel.children).forEach(child => {
          child.style.display = '';
        });
      }
    };
  }

  // Ensure activity feed container is scrollable
  const activityFeed = document.getElementById('activityFeed');
  if (activityFeed) {
    activityFeed.style.maxHeight = '320px';
    activityFeed.style.overflowY = 'auto';
  }
}

    // Clear all data
// Only display real data from native host/extension
function renderMemoryBrowser(memoryData, connected) {
  const browser = document.getElementById('memoryBrowser');
  browser.innerHTML = '';
  if (!connected) {
    browser.innerHTML = '<div class="empty-state">Disconnected. No data available.</div>';
    return;
  }
  if (!memoryData || memoryData.length === 0) {
    browser.innerHTML = '<div class="empty-state">No memory data found.</div>';
    return;
  }
  memoryData.forEach(conv => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.innerHTML = `
      <div class="memory-provider">${conv.provider || ''}</div>
      <div class="memory-topic">${conv.topic || ''}</div>
      <div class="memory-content">${conv.content ? conv.content.substring(0, 200) : ''}</div>
      <div class="memory-meta">${conv.chunkCount || 0} chunks</div>
    `;
    browser.appendChild(card);
  });
}
// Memory browser rendering is handled by the main onMemoryUpdate listener in initializeApp()