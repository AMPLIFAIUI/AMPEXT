// © 2025 AMPiQ - Extension GUI Renderer
// Handles UI interactions and native messaging

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the app
  initializeApp();

  // Listen for memory stats and errors from Electron main process
  if (window.electronAPI && window.electronAPI.onMemoryUpdate) {
    window.electronAPI.onMemoryUpdate((event, stats) => {
      if (stats && stats.error) {
        // Show error in UI and log
        console.error(stats.error);
        if (window.ampiqApp && typeof window.ampiqApp.addActivityEntry === 'function') {
          window.ampiqApp.addActivityEntry('❌ ' + stats.error);
        }
        // Optionally, display a banner or modal here
        return;
      }
      if (stats) {
        if (window.ampiqApp && typeof window.ampiqApp.updateMemoryStats === 'function') {
          window.ampiqApp.updateMemoryStats(stats);
        }
      }
    });
  }
});

class AMPiQRenderer {
  constructor() {
    this.currentPage = 'dashboard';
    this.isConnected = false;
    this.activityLog = [];
    this.nativePort = null;
  }

  initialize() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setupMemoryBrowserPage(); // Setup memory browser events on load
    this.startPeriodicUpdates();
    this.connectToExtension();
    this.addActivityEntry('🟢 AMPiQ Desktop initialized and ready');
    this.addActivityEntry('🔗 Waiting for Chrome extension connection...');
    
    // Add some real activity for testing
    setTimeout(() => {
      this.addActivityEntry('📊 Loading memory statistics...');
    }, 2000);
    
    setTimeout(() => {
      this.addActivityEntry('🔍 Scanning for active conversations...');
    }, 4000);
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
          <div class="header-actions">
            <button class="btn btn-primary" id="refresh-conversations">Refresh</button>
          </div>
        </div>
        
        <div class="conversations-list">
          <div id="conversation-entries" class="entry-list">
            <div class="empty-state">No conversations found</div>
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
            <option value="gemini.google.com">Gemini</option>
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
        </div>
      </div>

      <div class="memory-viewer-container">
        <div class="memory-viewer" id="memory-viewer">
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
    
    const frostButton = document.getElementById('frost-viewer');
    const unfrostButton = document.getElementById('unfrost-viewer');
    const refreshButton = document.getElementById('refresh-memory');
    const searchInput = document.getElementById('memory-search');
    const providerFilter = document.getElementById('provider-filter');
    
    // Frost/Unfrost functionality
    if (frostButton) {
      console.log('✅ Frost button found, attaching event listener');
      frostButton.addEventListener('click', () => {
        console.log('❄️ Frost button clicked');
        this.frostViewer();
      });
    } else {
      console.warn('⚠️ Frost button not found');
    }
    
    if (unfrostButton) {
      console.log('✅ Unfrost button found, attaching event listener');
      unfrostButton.addEventListener('click', () => {
        console.log('🔓 Unfrost button clicked');
        this.unfrostViewer();
      });
    } else {
      console.warn('⚠️ Unfrost button not found');
    }
    
    // Refresh memory data
    if (refreshButton) {
      console.log('✅ Refresh button found, attaching event listener');
      refreshButton.addEventListener('click', () => {
        console.log('🔄 Refresh button clicked');
        this.loadMemoryData();
      });
    } else {
      console.warn('⚠️ Refresh button not found');
    }
    
    // Search and filter functionality
    if (searchInput) {
      console.log('✅ Search input found, attaching event listener');
      searchInput.addEventListener('input', () => this.filterMemoryData());
    } else {
      console.warn('⚠️ Search input not found');
    }
    
    if (providerFilter) {
      console.log('✅ Provider filter found, attaching event listener');
      providerFilter.addEventListener('change', () => this.filterMemoryData());
    } else {
      console.warn('⚠️ Provider filter not found');
    }
    
    // Setup text selection and injection functionality
    this.setupTextSelectionFeatures();
    
    // Load initial data
    this.loadMemoryData();
    
    console.log('✅ Memory browser page setup complete');
  }

  performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

    // Simulate search
    setTimeout(() => {
      resultsDiv.innerHTML = `
        <div class="search-result">
          <div class="result-header">
            <span class="result-source">ChatGPT</span>
            <span class="result-time">2 hours ago</span>
          </div>
          <div class="result-content">Example result containing "${query}"...</div>
        </div>
      `;
    }, 500);
  }

  setupSettingsPage() {
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveSettings());
    }
  }

  saveSettings() {
    this.addActivityEntry('⚙️ Settings saved successfully');
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

  loadMemoryData() {
    const memoryViewer = document.getElementById('memory-viewer');
    if (!memoryViewer) return;

    console.log('🔄 Loading memory data...');
    memoryViewer.innerHTML = '<div class="loading">Loading indexed conversations...</div>';

    // Request memory data from native host
    if (this.nativePort) {
      console.log('📡 Requesting memory data from native host...');
      this.nativePort.postMessage({ 
        type: 'get_memory_data',
        request: 'all_conversations'
      });
    } else {
      console.log('⚠️ Native port not available, using sample data');
      // Simulate data for development
      setTimeout(() => {
        const sampleData = this.getSampleMemoryData();
        console.log(`📊 Displaying ${sampleData.length} sample memory entries`);
        this.displayMemoryData(sampleData);
      }, 1000);
    }
  }

  displayMemoryData(memoryData) {
    const memoryViewer = document.getElementById('memory-viewer');
    if (!memoryViewer) return;

    console.log(`📊 Displaying memory data: ${memoryData ? memoryData.length : 0} entries`);

    if (!memoryData || memoryData.length === 0) {
      console.log('⚠️ No memory data to display');
      memoryViewer.innerHTML = '<div class="empty-state">No indexed conversations found</div>';
      return;
    }

    const html = memoryData.map(entry => this.createMemoryEntryHTML(entry)).join('');
    memoryViewer.innerHTML = html;

    // Setup action buttons for each entry
    this.setupMemoryEntryActions();
    
    console.log(`✅ Successfully displayed ${memoryData.length} memory entries`);
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
    // This would get the actual content from memory storage
    // For now, return sample data
    return this.getSampleMemoryData().find(entry => entry.id === entryId)?.content;
  }

  getSampleMemoryData() {
    return [
      {
        id: '1',
        provider: 'chatgpt.com',
        timestamp: Date.now() - 3600000, // 1 hour ago
        content: 'Discussion about machine learning algorithms and neural network architectures. The conversation covered various approaches to deep learning including convolutional networks, recurrent networks, and transformer models.'
      },
      {
        id: '2', 
        provider: 'claude.ai',
        timestamp: Date.now() - 7200000, // 2 hours ago
        content: 'Analysis of programming concepts including object-oriented design, functional programming paradigms, and software architecture patterns. We explored SOLID principles and design patterns.'
      },
      {
        id: '3',
        provider: 'gemini.google.com', 
        timestamp: Date.now() - 10800000, // 3 hours ago
        content: 'Data analysis techniques and statistical methods for processing large datasets. Covered topics like data cleaning, feature engineering, and predictive modeling approaches.'
      }
    ];
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
    // In Electron, we don't have chrome.runtime
    // Instead, we'll use IPC to communicate with the main process
    // which will handle native messaging

    this.addActivityEntry('🔄 Connecting to Chrome extension via native messaging...');

    // Request connection from main process
    if (window.electronAPI && window.electronAPI.connectNative) {
      try {
        this.nativePort = window.electronAPI.connectNative('com.ampiq.amp.native');

        this.nativePort.onMessage.addListener((message) => {
          this.handleNativeMessage(message);
        });

        this.nativePort.onDisconnect.addListener(() => {
          this.isConnected = false;
          this.updateConnectionStatus(false);
          this.addActivityEntry('❌ Disconnected from extension');
        });

        // Send initial ping
        this.nativePort.postMessage({ type: 'ping' });
      } catch (error) {
        console.error('Failed to connect to native host:', error);
        this.updateConnectionStatus(false);
        this.addActivityEntry('❌ Failed to establish native messaging connection');
      }
    } else {
      // No fallback: Only show disconnected if native messaging is not available
      this.isConnected = false;
      this.updateConnectionStatus(false);
      this.addActivityEntry('❌ Native messaging unavailable - cannot connect to extension');
    }
  }

  handleNativeMessage(message) {
    switch(message.type) {
      case 'pong':
        // Only set connected if we get a real pong from the extension
        this.isConnected = true;
        this.updateConnectionStatus(true);
        this.addActivityEntry('✅ Connected to Chrome extension');
        this.addActivityEntry('📡 Native messaging established');
        break;
      case 'memory_update':
        this.updateMemoryStats(message.data);
        this.addActivityEntry(`📊 Memory stats updated: ${message.data.totalChunks || 0} chunks`);
        break;
      case 'overflow_saved':
        this.addActivityEntry(`💾 Overflow chunk saved: ${message.chunkId}`);
        break;
      case 'status_response':
        this.addActivityEntry(`📈 Storage status: ${message.overflowCount || 0} overflow files`);
        break;
      case 'memory_data_response':
        this.displayMemoryData(message.data);
        this.addActivityEntry(`📖 Loaded ${message.data.length} memory entries`);
        break;
      case 'injection_success':
        this.addActivityEntry(`💉 Successfully injected memory content`);
        break;
      case 'injection_error':
        this.addActivityEntry(`❌ Failed to inject memory content: ${message.error}`);
        break;
      default:
        this.addActivityEntry(`📨 Received: ${message.type}`);
    }
  }

  updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-indicator span');
    
    if (statusDot) {
      statusDot.style.background = connected ? '#2ecc71' : '#e74c3c';
    }
    
    if (statusText) {
      statusText.textContent = connected ? 'Connected to Extension' : 'Disconnected';
    }
  }

  updateMemoryStats(stats) {
    // Update dashboard stats
    const elements = {
      'cold-storage-size': stats.coldStorageSize || '0 MB',
      'total-chunks': stats.totalChunks || 0,
      'total-conversations': stats.conversations || 0,
      'compression-ratio': stats.compressionRatio || '0%'
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    // Update storage progress
    const progress = (stats.usedStorage / stats.maxStorage) * 100;
    const progressBar = document.getElementById('storage-progress');
    const progressText = document.getElementById('storage-usage-text');
    
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${stats.usedStorage} MB / ${stats.maxStorage} GB`;
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
    // Update stats every 10 seconds
    setInterval(() => {
      if (this.isConnected && this.nativePort) {
        this.nativePort.postMessage({ type: 'status' });
        this.addActivityEntry('🔄 Checking storage status...');
      } else {
        this.addActivityEntry('⚠️ Native messaging not connected');
      }
    }, 10000);
    
    // Add periodic health checks
    setInterval(() => {
      this.addActivityEntry('💓 System health check');
    }, 30000);
  }
}

// Initialize the app
function initializeApp() {
  const app = new AMPiQRenderer();
  initialize() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setupMemoryBrowserPage(); // Setup memory browser events on load
    this.startPeriodicUpdates();
    // Automatically connect to native messaging host on startup
    setTimeout(() => {
      this.connectToExtension();
    }, 100);
    this.addActivityEntry('\ud83d\udfe2 AMPiQ Desktop initialized and ready');
    this.addActivityEntry('\ud83d\udd17 Waiting for Chrome extension connection...');
    // Add some real activity for testing
    setTimeout(() => {
      this.addActivityEntry('\ud83d\udcca Loading memory statistics...');
    }, 2000);
    setTimeout(() => {
      this.addActivityEntry('\ud83d\udd0d Scanning for active conversations...');
    }, 4000);
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

// Remove all hardcoded/mock/demo data
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
// Listen for real data from main process
window.electronAPI.onMemoryUpdate((event, data) => {
  const connected = !!data && !data.error;
  renderMemoryBrowser(data.memoryData || [], connected);
});