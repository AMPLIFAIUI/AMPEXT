// © 2025 AMPIQ All rights reserved.
// Content script for AMP extension
// Version: 4.0.0 - Production

// Production logging - set to false to disable all debug logs
const AMP_DEBUG = false;
const log = (...args) => AMP_DEBUG && console.log('[AMP Content]', ...args);
const logError = (...args) => console.error('[AMP Content]', ...args);

log('Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('AMP Content: Received message:', message);
  
  switch (message.action) {
    case 'setMonitoringStatus':
      setMonitoringStatus(message.isActive, message.tabId);
      sendResponse({ success: true });
      break;
      
    case 'getMonitoringStatus':
      sendResponse({ 
        isActive: isActiveMonitoringTab,
        tabId: currentTabId
      });
      break;
      
    case 'showMonitoringHint':
      showMonitoringHint(message.provider, message.hostname);
      sendResponse({ success: true });
      break;
      
    case 'showInjectionApproval':
      // Show injection approval popup in the page
      showInjectionApprovalPopup(message.context, message.provider, sendResponse);
      return true; // Keep channel open for async response
      
    case 'injectContext':
      // Handle context injection
      handleContextInjection(message.context, message.amount);
      sendResponse({ success: true });
      break;
      
    default:
      // Handle other messages
      break;
  }
  
  return true;
});

// Show injection approval popup in the page
function showInjectionApprovalPopup(context, provider, sendResponse) {
  // Remove existing popup if any
  const existingPopup = document.getElementById('amp-injection-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'amp-injection-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid #3498db;
    border-radius: 12px;
    padding: 24px;
    max-width: 450px;
    max-height: 350px;
    overflow-y: auto;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #fff;
  `;
  
  popup.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #3498db; font-size: 18px;">🔄 AMP Context Injection</h3>
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #bdc3c7;">
      <strong style="color: #fff;">${provider}</strong> appears to have lost context. 
      Inject previous conversation context?
    </p>
    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 12px; max-height: 120px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1);">
      <strong style="color: #3498db;">Preview:</strong><br>
      <span style="color: #bdc3c7;">${context.substring(0, 250)}${context.length > 250 ? '...' : ''}</span>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
      <button id="amp-inject-deny" style="padding: 10px 20px; border: 1px solid #bdc3c7; background: transparent; color: #bdc3c7; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">Cancel</button>
      <button id="amp-inject-approve" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #3498db, #2980b9); color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s;">Inject Context</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  let responded = false;
  
  const cleanup = (approved) => {
    if (responded) return;
    responded = true;
    popup.remove();
    sendResponse({ approved });
  };
  
  popup.querySelector('#amp-inject-approve').onclick = () => cleanup(true);
  popup.querySelector('#amp-inject-deny').onclick = () => cleanup(false);
  
  // Auto-close after 20 seconds
  setTimeout(() => cleanup(false), 20000);
}

function addDebugIndicator() {
  try {
    // Remove existing indicator if present
    const existingIndicator = document.getElementById('amp-debug-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'amp-debug-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(52, 152, 219, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
      font-family: monospace;
    `;
    indicator.textContent = 'AMP ACTIVE';
    
    document.body.appendChild(indicator);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
    
  } catch (error) {
    log('AMP: Could not add debug indicator:', error);
  }
}

// Set monitoring status and update UI
function setMonitoringStatus(isActive, tabId) {
  isActiveMonitoringTab = isActive;
  
  // Update or create monitoring indicator
  updateMonitoringIndicator();
  
  log(`AMP Content: Monitoring status set to ${isActive} for tab ${tabId}`);
  
  // Start or stop monitoring based on status
  if (isActive) {
    startMonitoring();
  } else {
    stopMonitoring();
  }
}

// Update monitoring indicator in the page
function updateMonitoringIndicator() {
  try {
    // Remove existing indicator
    if (monitoringIndicator && monitoringIndicator.parentNode) {
      monitoringIndicator.remove();
    }
    
    if (isActiveMonitoringTab) {
      // Create active monitoring indicator
      monitoringIndicator = document.createElement('div');
      monitoringIndicator.id = 'amp-monitoring-indicator';
      monitoringIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 255, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        font-family: monospace;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      monitoringIndicator.textContent = '🟢 AMP MONITORING';
      
      document.body.appendChild(monitoringIndicator);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (monitoringIndicator && monitoringIndicator.parentNode) {
          monitoringIndicator.remove();
        }
      }, 3000);
    }
  } catch (error) {
    log('AMP: Could not update monitoring indicator:', error);
  }
}

// Start monitoring for this tab
function startMonitoring() {
  log('AMP Content: Starting monitoring for this tab');
  // The existing monitoring functions will now work since isActiveMonitoringTab is true
}

// Stop monitoring for this tab
function stopMonitoring() {
  log('AMP Content: Stopping monitoring for this tab');
  // Clear any ongoing monitoring processes
}

// Show monitoring hint to user
function showMonitoringHint(provider, hostname) {
  try {
    // Remove existing hint if present
    const existingHint = document.getElementById('amp-monitoring-hint');
    if (existingHint) {
      existingHint.remove();
    }
    
    // Create hint element
    const hint = document.createElement('div');
    hint.id = 'amp-monitoring-hint';
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 123, 255, 0.95);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      transition: all 0.3s ease;
    `;
    
    hint.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">💡</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Click AMP icon to monitor this ${provider} conversation</div>
          <div style="font-size: 12px; opacity: 0.9;">${hostname}</div>
        </div>
      </div>
    `;
    
    // Add click handler to switch monitoring
    hint.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({
          action: 'requestMonitoringSwitch'
        });
        hint.remove();
      } catch (error) {
        logError('Failed to request monitoring switch:', error);
      }
    });
    
    // Add hover effects
    hint.addEventListener('mouseenter', () => {
      hint.style.transform = 'scale(1.02)';
      hint.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    });
    
    hint.addEventListener('mouseleave', () => {
      hint.style.transform = 'scale(1)';
      hint.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    
    document.body.appendChild(hint);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (hint.parentNode) {
        hint.style.opacity = '0';
        hint.style.transform = 'translateX(20px)';
        setTimeout(() => {
          if (hint.parentNode) {
            hint.remove();
          }
        }, 300);
      }
    }, 8000);
    
    log(`💡 AMP Content: Showing monitoring hint for ${provider}`);
  } catch (error) {
    logError('AMP Content: Failed to show monitoring hint:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    addDebugIndicator();
    initializeSession();
  });
} else {
  addDebugIndicator();
  initializeSession();
}

let currentProvider = '';
let currentTabId = '';
let currentTopic = '';
let currentConversationId = '';
let messageCount = 0;
let visibleNodes = [];
const MAX_VISIBLE_NODES = 50;

// Monitoring status
let isActiveMonitoringTab = false;
let monitoringIndicator = null;

// User-configurable provider mappings
const USER_PROVIDER_MAPPINGS = {
  // Users can add their own sites here
  // Format: 'domain.com': 'CustomProviderName'
  'mycustomsite.com': 'MyCustomSite',
  'anothersite.org': 'AnotherSite',
  // Add more as needed
};

function getAIProvider() {
  const url = window.location.href;
  
  // Check user-defined mappings first
  for (const [domain, provider] of Object.entries(USER_PROVIDER_MAPPINGS)) {
    if (url.includes(domain)) {
      return provider;
    }
  }
  
  // Built-in AI Chat Providers - using actual chat URLs
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'ChatGPT';
  if (url.includes('claude.ai')) return 'Claude';
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'Gemini';
  if (url.includes('poe.com')) return 'Poe';
  if (url.includes('perplexity.ai')) return 'Perplexity';
  if (url.includes('pi.ai')) return 'Pi';
  if (url.includes('blackbox.ai')) return 'Blackbox';
  if (url.includes('you.com/chat')) return 'YouChat';
  if (url.includes('phind.com')) return 'Phind';
  if (url.includes('writesonic.com/chat')) return 'Writesonic';
  if (url.includes('chat.bing.com')) return 'BingChat';
  if (url.includes('chat.forefront.ai')) return 'Forefront';
  if (url.includes('chat.lmsys.org')) return 'LMSYS';
  if (url.includes('chat.reka.ai')) return 'Reka';
  if (url.includes('chat.ora.ai')) return 'Ora';
  if (url.includes('chat.aichat.com')) return 'AIChat';
  if (url.includes('chat.socratic.org')) return 'Socratic';
  if (url.includes('chat.tome.app')) return 'Tome';
  if (url.includes('chat.anthropic.com')) return 'Anthropic';
  if (url.includes('chat.kagi.com')) return 'Kagi';
  if (url.includes('chat.zephyr.ai')) return 'Zephyr';
  if (url.includes('chat.alpaca.com')) return 'Alpaca';
  if (url.includes('cursor.com')) return 'Cursor';
  if (url.includes('github.com')) return 'GitHub';
  if (url.includes('stackoverflow.com')) return 'StackOverflow';
  if (url.includes('cueprompter.com')) return 'CuePrompter';
  
  // For any other website, use the hostname as provider
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.charAt(0).toUpperCase() + hostname.slice(1);
  } catch (error) {
    return 'Unknown';
  }
}

async function getTabId() {
  try {
    // Content scripts can't access chrome.tabs.query directly
    // Use a message to background script to get tab ID
    if (chrome && chrome.runtime) {
      const response = await chrome.runtime.sendMessage({
        action: 'getTabId'
      });
      return response?.tabId || Math.random().toString(36).substr(2, 9);
    } else {
      return Math.random().toString(36).substr(2, 9);
    }
  } catch (error) {
    console.warn('Could not get tab ID, using random ID:', error);
    return Math.random().toString(36).substr(2, 9);
  }
}

// Initialize session
async function initializeSession() {
  currentProvider = getAIProvider();
  currentTabId = await getTabId();
  currentConversationId = `conv_${currentProvider}_${currentTabId}_${Date.now()}`;
  
  // Check if this tab is currently being monitored
  await checkMonitoringStatus();
  
  // Auto-enable monitoring for AI sites
  if (currentProvider !== 'Unknown' && !isActiveMonitoringTab) {
    // Auto-enable for known AI providers
    const aiProviders = ['ChatGPT', 'Claude', 'Gemini', 'Poe', 'Perplexity', 'Pi', 'Blackbox', 'YouChat', 'Phind', 'BingChat', 'Forefront', 'LMSYS', 'Reka', 'Ora', 'AIChat', 'Socratic', 'Tome', 'Anthropic', 'Kagi', 'Zephyr', 'Alpaca', 'Cursor'];
    if (aiProviders.includes(currentProvider)) {
      isActiveMonitoringTab = true;
      log(`🟢 AMP: Auto-enabled monitoring for ${currentProvider}`);
    }
  }
  
  // Initialize context injection system
  initializeContextInjection();
  
  // Initialize scroll listener for reverse injection
  initializeScrollListener();
  
  log(`AMP: ${currentProvider} - ${currentConversationId}`);
  observeDOM();
}

// Initialize scroll listener for reverse injection
function initializeScrollListener() {
  let lastScrollY = 0;
  let scrollTimeout = null;
  
  window.addEventListener('scroll', () => {
    // Debounce scroll events
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
      const currentScrollY = window.scrollY;
      
      // Detect reverse scroll (scrolling up significantly)
      if (currentScrollY < lastScrollY - 200) {
        log('🔄 AMP: Reverse scroll detected, triggering reverse injection');
        chrome.runtime.sendMessage({ 
          action: 'triggerReverseInjection',
          triggerType: 'scroll',
          scrollDelta: lastScrollY - currentScrollY
        }).catch(error => {
          console.warn('AMP: Failed to send reverse injection request:', error);
        });
      }
      
      lastScrollY = currentScrollY;
    }, 100); // Debounce for 100ms
  }, { passive: true });
  
  log('🔄 AMP: Scroll listener initialized for reverse injection');
}

// Check if this tab is currently being monitored
async function checkMonitoringStatus() {
  try {
    if (chrome && chrome.runtime) {
      const response = await chrome.runtime.sendMessage({
        action: 'getMonitoringStatus'
      });
      
      if (response && response.isActive) {
        setMonitoringStatus(true, currentTabId);
        log('AMP Content: This tab is actively being monitored');
      } else {
        setMonitoringStatus(false, currentTabId);
        log('AMP Content: This tab is not being monitored');
      }
    }
  } catch (error) {
    logError('AMP Content: Failed to check monitoring status:', error);
    // Default to not monitoring if we can't check
    setMonitoringStatus(false, currentTabId);
  }
}

// Context Injection System
let contextInjectionEnabled = false;
let lastInjectionTime = 0;
let injectionCooldown = 30000; // 30 seconds

function initializeContextInjection() {
  // Monitor for LLM context loss indicators
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkForContextLoss(node);
          }
        });
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Listen for context injection requests from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectContext') {
      handleContextInjection(message.context, message.amount);
    }
  });
}

function checkForContextLoss(element) {
  // Check for common context loss indicators
  const contextLossIndicators = [
    'I don\'t have access to previous messages',
    'I can\'t see the conversation history',
    'I don\'t have context from earlier',
    'I don\'t remember our previous conversation',
    'I don\'t have access to the chat history',
    'I can\'t see what we discussed before',
    'I don\'t have the context from our earlier conversation'
  ];
  
  const text = element.textContent || element.innerText || '';
  const hasContextLoss = contextLossIndicators.some(indicator => 
    text.toLowerCase().includes(indicator.toLowerCase())
  );
  
  if (hasContextLoss && Date.now() - lastInjectionTime > injectionCooldown) {
    requestContextInjection();
  }
}

async function requestContextInjection() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'requestContextInjection',
      provider: currentProvider,
      tabId: currentTabId,
      conversationId: currentConversationId
    });
    
    if (response.approved) {
      lastInjectionTime = Date.now();
    }
  } catch (error) {
    logError('AMP: Error requesting context injection:', error);
  }
}

function handleContextInjection(context, amount) {
  log(`🔄 AMP: Injecting context (${amount} chars)...`);
  
  // Find the main input area with provider-specific selectors
  const provider = getAIProvider();
  let inputSelectors = [];
  
  if (provider === 'ChatGPT') {
    inputSelectors = [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]'
    ];
  } else if (provider === 'Claude') {
    inputSelectors = [
      '.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="message"]'
    ];
  } else if (provider === 'Gemini') {
    inputSelectors = [
      'textarea[placeholder*="Enter a prompt"]',
      'textarea[aria-label*="prompt"]',
      'textarea[placeholder*="message"]'
    ];
  } else {
    // Generic fallback
    inputSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="chat"]',
      'textarea[placeholder*="Chat"]',
      '.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
      'input[type="text"]'
    ];
  }
  
  let inputElement = null;
  for (const selector of inputSelectors) {
    inputElement = document.querySelector(selector);
    if (inputElement) break;
  }
  
  if (inputElement) {
    // Inject context into input
    const currentValue = inputElement.value || inputElement.textContent || '';
    const injectionText = `[Previous context: ${context}]\n\n${currentValue}`;
    
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      inputElement.value = injectionText;
    } else {
      inputElement.textContent = injectionText;
    }
    
    // Trigger input event
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    log('AMP: Context injected successfully');
  } else {
    logError('AMP: Could not find input element for context injection');
  }
}

// PERFORMANCE: Debounced DOM observation to reduce CPU usage
let domObserverTimeout = null;
let pendingMutations = 0;
const DOM_OBSERVER_DEBOUNCE = 500; // Wait 500ms after last mutation before processing
const MAX_PENDING_MUTATIONS = 100; // Force process after this many mutations

// Observe DOM changes with debouncing for performance
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let foundNewMessages = false;
    
    // Quick check without heavy processing
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Only check immediate text, not deep traversal
            const text = node.textContent;
            if (text && text.length > 20) {
              foundNewMessages = true;
              break;
            }
          }
        }
        if (foundNewMessages) break;
      }
    }
    
    if (foundNewMessages) {
      pendingMutations++;
      
      // Debounce: wait for mutations to settle
      if (domObserverTimeout) {
        clearTimeout(domObserverTimeout);
      }
      
      // Force process if too many pending mutations
      if (pendingMutations >= MAX_PENDING_MUTATIONS) {
        pendingMutations = 0;
        processNewContent();
      } else {
        domObserverTimeout = setTimeout(() => {
          pendingMutations = 0;
          processNewContent();
        }, DOM_OBSERVER_DEBOUNCE);
      }
    }
  });
  
  // Optimized observer options - less aggressive
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: false, // Don't track text changes
    attributes: false     // Don't track attribute changes
  });
}

// Process new content with S1-S9 progression
async function processNewContent() {
  // Auto-enable monitoring for AI sites if not already enabled
  if (!isActiveMonitoringTab && currentProvider !== 'Unknown') {
    const aiProviders = ['ChatGPT', 'Claude', 'Gemini', 'Poe', 'Perplexity', 'Pi', 'Blackbox', 'YouChat', 'Phind', 'BingChat', 'Forefront', 'LMSYS', 'Reka', 'Ora', 'AIChat', 'Socratic', 'Tome', 'Anthropic', 'Kagi', 'Zephyr', 'Alpaca', 'Cursor'];
    if (aiProviders.includes(currentProvider)) {
      isActiveMonitoringTab = true;
      log(`🟢 AMP: Auto-enabled monitoring during content processing`);
    }
  }
  
  // Process content (monitoring gate removed for AI sites)
  // Users can still manually disable via icon click if needed
  
  const chunks = extractConversationTurns();
  
  for (const chunk of chunks) {
    if (chunk.text.trim().length < 20) continue;
    
    // Process through S1-S9 progression
    const s1s9Data = await processS1S9Progression(chunk.text, currentConversationId, {
      provider: currentProvider,
      tabId: currentTabId,
      messageType: chunk.type
    });
    
    // Send to background script with S1-S9 data
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'storeMemory',
        content: chunk.text,
        provider: currentProvider,
        tabId: currentTabId,
        conversationId: currentConversationId,
        messageType: chunk.type,
        s1s9Data: s1s9Data
      });
    }
  }
}

// S1-S9 Progression System
let s1s9Progression = new Map();
let currentSquares = new Map();

async function processS1S9Progression(text, conversationId, metadata) {
  const currentSquare = currentSquares.get(conversationId) || 0;
  const progression = s1s9Progression.get(conversationId) || {};
  
  // Determine which square to update
  const squareToUpdate = determineSquareToUpdate(text, currentSquare, progression);
  
  // Update the progression
  progression[`sq${squareToUpdate}`] = {
    content: text,
    timestamp: Date.now(),
    version: (progression[`sq${squareToUpdate}`]?.version || 0) + 1,
    type: getSquareType(squareToUpdate),
    metadata: metadata
  };
  
  // Update current square
  currentSquares.set(conversationId, squareToUpdate);
  s1s9Progression.set(conversationId, progression);
  
  // Generate S9 canonical summary if ready
  if (squareToUpdate >= 8 || shouldGenerateS9(progression)) {
    progression.sq9 = await generateCanonicalSummary(progression);
  }
  
  return progression;
}

function determineSquareToUpdate(text, currentSquare, progression) {
  if (currentSquare === 0) return 1; // S1: Raw capture
  
  if (currentSquare < 8) {
    const previousContent = progression[`sq${currentSquare}`]?.content || '';
    if (isSignificantChange(text, previousContent)) {
      return currentSquare + 1;
    }
  }
  
  return currentSquare;
}

function isSignificantChange(newText, oldText) {
  const similarity = calculateSimilarity(newText, oldText);
  return similarity < 0.8;
}

function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

function getSquareType(squareNumber) {
  switch (squareNumber) {
    case 1: return 'raw';
    case 9: return 'canonical';
    default: return 'edit';
  }
}

function shouldGenerateS9(progression) {
  const filledSquares = Object.keys(progression).filter(key => 
    key.startsWith('sq') && key !== 'sq9' && progression[key]?.content
  ).length;
  return filledSquares >= 3;
}

async function generateCanonicalSummary(progression) {
  const allContent = Object.keys(progression)
    .filter(key => key.startsWith('sq') && key !== 'sq9')
    .map(key => progression[key]?.content)
    .filter(content => content)
    .join(' ');
  
  const summary = quickSummary(allContent);
  const keywords = extractKeywords(allContent);
  const entities = extractEntities(allContent);
  
  return {
    canonical: summary,
    timestamp: Date.now(),
    version: 1,
    type: 'canonical',
    keywords: keywords,
    entities: entities,
    hash: generateHash(allContent)
  };
}

function quickSummary(text) {
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

function extractKeywords(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function extractEntities(text) {
  return {
    people: [],
    places: [],
    concepts: [],
    dates: []
  };
}

function generateHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// REMOVED: Simple extractConversationTurns - using comprehensive version below

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSession);
} else {
  initializeSession();
}

// Listen for context carryover prompts from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showContextCarryoverPrompt') {
    showContextCarryoverPrompt(message.provider, message.hostname);
  }
});

// Show context carryover prompt
function showContextCarryoverPrompt(provider, hostname) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    max-width: 300px;
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  notification.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: 600;">🔄 AMP Context Carryover</div>
    <div style="margin-bottom: 15px; font-size: 13px;">
      Carry over conversation context from previous AI sessions?
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="amp-carryover-yes" style="
        background: rgba(46, 204, 113, 0.8);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Yes</button>
      <button id="amp-carryover-no" style="
        background: rgba(231, 76, 60, 0.8);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">No</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Handle button clicks
  document.getElementById('amp-carryover-yes').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'setContextCarryover',
      tabId: currentTabId,
      carryover: true
    });
    notification.innerHTML = '<div style="text-align: center; color: #2ecc71;">✅ Context carryover enabled</div>';
    setTimeout(() => notification.remove(), 2000);
  });
  
  document.getElementById('amp-carryover-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'setContextCarryover',
      tabId: currentTabId,
      carryover: false
    });
    notification.innerHTML = '<div style="text-align: center; color: #e74c3c;">❌ Context carryover disabled</div>';
    setTimeout(() => notification.remove(), 2000);
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// REMOVED: Duplicate initializeSession() - using the one at line 329

// REMOVED: Duplicate observeDOM() - using the one at line 475



// REMOVED: Duplicate processNewContent() - using the one at line 504

function extractConversationTurns() {
  const chunks = [];
  
  // Get the current provider to determine which selectors to use
  const currentProvider = getAIProvider();
  
  // Use provider-specific selectors OR generic content detection
  let messageSelectors = [];
  
  if (currentProvider === 'ChatGPT') {
    messageSelectors = [
      '[data-message-author-role]',
      '.group.w-full.text-gray-800',
      '.prose.w-full',
      '.markdown',
      '.whitespace-pre-wrap'
    ];
  } else if (currentProvider === 'Claude') {
    messageSelectors = [
      '.message',
      '.claude-message',
      '[data-testid*="message"]',
      '.prose',
      '.markdown'
    ];
  } else if (currentProvider === 'Gemini') {
    messageSelectors = [
      '.model-response-text',
      '.user-query',
      '.response-container',
      '[data-ved]',
      '.conversation-turn'
    ];
  } else if (currentProvider === 'Poe') {
    messageSelectors = [
      '.message',
      '.bot-message',
      '.user-message',
      '.message-content'
    ];
  } else if (currentProvider === 'Perplexity') {
    messageSelectors = [
      '.message',
      '.ai-message',
      '.user-message',
      '.response'
    ];
  } else if (currentProvider === 'Pi') {
    messageSelectors = [
      '.message',
      '.pi-message',
      '.user-message'
    ];
  } else if (currentProvider === 'Blackbox') {
    messageSelectors = [
      '.message',
      '.chat-message',
      '.response'
    ];
  } else if (currentProvider === 'YouChat') {
    messageSelectors = [
      '.message',
      '.chat-message',
      '.response'
    ];
  } else if (currentProvider === 'Phind') {
    messageSelectors = [
      '.message',
      '.ai-response',
      '.user-message'
    ];
  } else if (currentProvider === 'BingChat') {
    messageSelectors = [
      '.message',
      '.response',
      '.user-message'
    ];
  } else if (currentProvider === 'CuePrompter') {
    messageSelectors = [
      '#script-content',
      '.teleprompter-text',
      '.script-text',
      'textarea',
      '.prompter-content',
      '.text-content'
    ];
          log('AMP: Using CuePrompter-specific selectors');
  } else if (currentProvider === 'MyCustomSite') {
    messageSelectors = [
      // Add your custom selectors here
      '.my-content',
      '.custom-text',
      'textarea',
      '.input-area'
    ];
          log('AMP: Using MyCustomSite-specific selectors');
  } else if (currentProvider === 'AnotherSite') {
    messageSelectors = [
      // Add your custom selectors here
      '.content-area',
      '.text-content',
      'textarea',
      '.input-field'
    ];
    log('🔍 AMP: Using AnotherSite-specific selectors');
  } else {
    // Generic content detection for ANY website
    messageSelectors = [
      // Look for meaningful content on any website
      'article p',
      'main p',
      '.content p',
      '.post p',
      '.article p',
      '.entry p',
      '.text p',
      '.body p',
      'p', // Any paragraph
      'article div',
      'main div',
      '.content div',
      '.post div',
      '.article div',
      '.entry div',
      '.text div',
      '.body div',
      'textarea', // For input areas
      '.input',
      '.text-input'
    ];
    log('🔍 AMP: Using generic content detection for:', currentProvider);
  }
  
  for (const selector of messageSelectors) {
    const messages = document.querySelectorAll(selector);
    log(`🔍 AMP: Found ${messages.length} elements with selector: ${selector}`);
    
    messages.forEach(msg => {
      if (msg.hasAttribute('data-amp-processed')) return;
      
      const text = msg.textContent?.trim();
      log(`🔍 AMP: Checking element with selector ${selector}:`, {
        text: text ? text.substring(0, 100) + '...' : 'EMPTY',
        length: text ? text.length : 0,
        tagName: msg.tagName,
        className: msg.className,
        id: msg.id
      });
      
      if (!text || text.length < 20) {
        log(`🔍 AMP: Skipping element - text too short or empty (${text ? text.length : 0} chars)`);
        return;
      }
      
      // Skip navigation, headers, footers, and other non-content elements
      if (msg.closest('nav, header, footer, aside, .nav, .header, .footer, .sidebar')) {
        log(`🔍 AMP: Skipping element - in navigation/footer area`);
        return;
      }
      
      // Skip very short or likely non-content text
      if (text.length < 20 || text.match(/^(©|Privacy|Terms|Cookie|Menu|Home|About|Contact)$/i)) {
        log(`🔍 AMP: Skipping element - likely non-content text: "${text}"`);
        return;
      }
      
      // Enhanced type detection
      let type = 'content'; // Default to generic content
      const roleAttr = msg.getAttribute('data-message-author-role');
      
      if (roleAttr === 'user') {
        type = 'user';
      } else if (roleAttr === 'assistant') {
        type = 'assistant';
      } else if (msg.querySelector('[data-message-author-role="user"]')) {
        type = 'user';
      } else if (msg.querySelector('[data-message-author-role="assistant"]')) {
        type = 'assistant';
      } else {
        // Heuristic detection based on content patterns for AI platforms
        const lowerText = text.toLowerCase();
        if (lowerText.includes('i am') || lowerText.includes('can you') || lowerText.includes('please')) {
          type = 'user';
        } else if (text.length > 100 || lowerText.includes('certainly') || lowerText.includes('here is')) {
          type = 'assistant';
        }
        // For non-AI platforms, keep as 'content'
      }
      
      chunks.push({ text, type });
      msg.setAttribute('data-amp-processed', 'true');
      log(`✅ AMP: Extracted ${type} content: ${text.substring(0, 50)}...`);
    });
    
    // Don't break - collect from ALL selectors for maximum data
  }
  
  // FALLBACK: If no chunks found, capture ANY meaningful text content
  if (chunks.length === 0) {
    log('🔍 AMP: No chunks found with selectors, using FALLBACK extraction...');
    
    const fallbackElements = document.querySelectorAll('p, div, span, textarea, article, main, section');
    let fallbackCount = 0;
    
    fallbackElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text && text.length > 50 && !element.hasAttribute('data-amp-processed')) {
        // Skip navigation and common non-content elements
        if (element.closest('nav, header, footer, aside, .nav, .header, .footer, .sidebar')) return;
        if (text.match(/^(©|Privacy|Terms|Cookie|Menu|Home|About|Contact|Login|Sign|Register)$/i)) return;
        
        chunks.push({ 
          text: text.substring(0, 1000), // Limit length
          type: 'content' 
        });
        element.setAttribute('data-amp-processed', 'true');
        fallbackCount++;
        log(`🔍 AMP: FALLBACK extracted: ${text.substring(0, 100)}...`);
        
        if (fallbackCount >= 5) return; // Limit fallback chunks
      }
    });
    
    log(`🔍 AMP: FALLBACK extracted ${fallbackCount} additional chunks`);
  }
  
  log(`📊 AMP: Total extracted ${chunks.length} conversation chunks`);
  return chunks;
}

function createMemoryNode(memoryChunk, messageType) {
  const node = document.createElement('div');
  node.className = 'amp-memory-node';
  node.style.display = 'none';
  
  // Add waterfall level styling
  if (memoryChunk.inDom) {
    node.classList.add('amp-dom-level');
  } else if (memoryChunk.inHot) {
    node.classList.add('amp-hot-level');
  } else if (memoryChunk.slot === 9) {
    node.classList.add('amp-archived-level');
  }
  
  const memoryData = {
    id: memoryChunk.id,
    conversation_id: memoryChunk.conversation_id,
    ai_provider: memoryChunk.ai_provider,
    tab_id: memoryChunk.tab_id,
    topic: memoryChunk.topic,
    timestamp: memoryChunk.timestamp,
    slot: memoryChunk.slot,
    message_type: messageType,
    summary: memoryChunk.summary,
    size: memoryChunk.size,
    waterfall_level: memoryChunk.inDom ? 'dom' : memoryChunk.inHot ? 'hot' : 'archived'
  };
  
  node.setAttribute('data-amp-memory', JSON.stringify(memoryData));
  node.setAttribute('data-amp-content', memoryChunk.fullText);
  
  return node;
}

// Manual trigger function for debugging
window.ampManualExtract = function() {
  log('🔧 AMP: Manual extraction triggered');
  const chunks = extractConversationTurns();
  log('🔧 AMP: Manual extraction result:', chunks);
  
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      log(`🔧 AMP: Chunk ${index + 1}:`, {
        type: chunk.type,
        text: chunk.text.substring(0, 200) + '...',
        length: chunk.text.length
      });
    });
  } else {
    log('🔧 AMP: No chunks extracted - page may not have content');
  }
  
  return chunks;
};

// Debug indicator removed - not needed for production



// Optimized DOM monitoring for dual zipper system
function startOptimizedMonitoring() {
  log('🚀 AMP: Starting optimized dual zipper monitoring...');
  
  let scanTimeout = null;
  
  // Debounced scanning to prevent performance issues
  function debouncedScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
          log('📝 AMP: Change detected - scanning for S1 capture...');
          scanForS1Capture();
        }
      } catch (error) {
        log('AMP: Error during debounced scan:', error.message);
      }
    }, 1000); // Debounce for 1 second
  }
  
  // Monitor for conversation-relevant changes only
  const observer = new MutationObserver((mutations) => {
    let hasRelevantChanges = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Only trigger for potentially conversation-related elements
            const text = node.textContent?.trim();
            if (text && text.length > 20 && 
                (text.includes('?') || text.includes('.') || text.includes('!'))) {
              hasRelevantChanges = true;
            }
          }
        });
      }
    });
    
    if (hasRelevantChanges) {
      debouncedScan();
    }
  });
  
  // Observe with more specific targeting
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // Don't monitor attribute changes
    characterData: false // Don't monitor text changes
  });
  
  // Initial scan after page loads
  setTimeout(() => {
    try {
      if (chrome && chrome.runtime && chrome.runtime.id) {
        scanForS1Capture();
      }
    } catch (error) {
      log('AMP: Error in initial scan:', error.message);
    }
  }, 2000);
}

// S1 capture scanning for dual zipper system
function scanForS1Capture() {
  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      log('AMP: Extension context invalid, skipping scan');
      return;
    }
    
    log('🔍 AMP: Scanning for S1 capture...');
    
    // Use targeted selectors for conversation content
    const conversationSelectors = [
      // ChatGPT specific
      '[data-message-author-role]',
      '.group.w-full',
      '.text-base',
      // Claude specific
      '.message',
      '[data-testid*="message"]',
      // Gemini specific
      '.model-response-text',
      '.response-container',
      // Generic conversation areas
      '[role="main"] p',
      '.conversation p',
      '.chat-messages p',
      '[class*="message"] p'
    ];
    
    let capturedCount = 0;
    
    conversationSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
          if (processElementForS1(element)) {
            capturedCount++;
          }
        });
      } catch (error) {
        console.warn('AMP: Scan error for selector:', selector, error);
      }
    });
    
    if (capturedCount > 0) {
      log(`✅ AMP: Captured ${capturedCount} S1 content pieces`);
    }
  } catch (error) {
    logError('AMP: Error in S1 scan:', error);
  }
}

function processElementForS1(element) {
  if (!element || element.hasAttribute('data-amp-s1-captured')) return false;
  
  const text = element.textContent?.trim();
  if (!text || text.length < 20) return false;
  
  // Skip unwanted content
  if (element.closest('nav, header, footer, script, style, noscript')) return false;
  if (text.includes('©') || text.includes('Privacy Policy')) return false;
  
  // Quick conversation detection
  const isConversation = 
    text.length > 30 && 
    (text.includes('?') || text.includes('.') || text.includes('!'));
  
  if (isConversation) {
    const messageType = determineMessageType(text, element);
    
    log(`📝 AMP: Capturing S1 ${messageType}: ${text.substring(0, 40)}...`);
    
    // Send to background script for S1-S9 processing
    if (chrome && chrome.runtime && chrome.runtime.id) {
      try {
        chrome.runtime.sendMessage({
          action: 'storeMemory',
          content: text,
          summary: text.length > 200 ? text.substring(0, 200) + '...' : text,
          provider: currentProvider,
          tabId: currentTabId,
          topic: currentTopic,
          conversationId: currentConversationId,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageType: messageType
        });
      } catch (error) {
        log('AMP: Error sending S1 to background:', error.message);
      }
    }
    
    element.setAttribute('data-amp-s1-captured', 'true');
    return true;
  }
  
  return false;
}

// Grid system removed - will be implemented as part of dual zipper architecture

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSession();
    startOptimizedMonitoring();
    setTimeout(() => {
      startProductionMonitoring();
    }, 1000);
  });
} else {
  initializeSession();
  startOptimizedMonitoring();
  
  // Start content monitoring
  setTimeout(() => {
    startProductionMonitoring();
    setTimeout(() => {
      processProductionContent();
    }, 2000);
  }, 1000);
}

// PRODUCTION CONTENT EXTRACTION - Real-time DOM monitoring
function startProductionMonitoring() {
  log('AMP: Starting production content monitoring');
  
  // Real-time DOM monitoring with MutationObserver
  const observer = new MutationObserver(async (mutations) => {
    let hasNewContent = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 20) {
              log('AMP: New content detected:', text.substring(0, 100) + '...');
              hasNewContent = true;
            }
          }
        });
      }
    });
    
    if (hasNewContent) {
      await processProductionContent();
    }
  });
  
  // Monitor all conversation containers
  const selectors = [
    // ChatGPT
    '[data-message-author-role]',
    '.group.w-full',
    '[data-testid^="conversation"]',
    // Claude
    '.message',
    '[data-testid*="message"]',
    // Gemini
    '.model-response-text',
    '.response-container',
    // Generic
    '[role="main"]',
    '.conversation',
    '.chat-messages',
    '.messages-container',
    'main'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!element.hasAttribute('amp-monitored')) {
        observer.observe(element, { childList: true, subtree: true });
        element.setAttribute('amp-monitored', 'true');
      }
    });
  });
  
  // Also monitor body for any content changes
  observer.observe(document.body, { childList: true, subtree: true });
  
  log('AMP: Production monitoring active');
}

// PRODUCTION content processing
async function processProductionContent() {
  log('AMP: Processing production content...');
  const chunks = extractProductionContent();
  log('AMP: Extracted chunks:', chunks.length);
  
  for (const chunk of chunks) {
    if (chunk.text.trim().length < 20) continue;
    
    messageCount++;
    
    // Create production memory chunk
    const memoryChunk = {
      id: `msg_${Date.now()}_${messageCount}`,
      conversation_id: currentConversationId,
      fullText: chunk.text,
      summary: chunk.text.length > 200 ? chunk.text.substring(0, 200) + '...' : chunk.text,
      ai_provider: currentProvider,
      tab_id: currentTabId,
      topic: currentTopic,
      timestamp: Date.now(),
      slot: 1,
      message_type: chunk.type,
      message_index: messageCount,
      size: chunk.text.length,
      inDom: true,
      inHot: true,
      sessionActive: true
    };
    
    // Send to background script for storage
    if (chrome && chrome.runtime) {
      try {
        log('AMP: Sending chunk to background:', chunk.text.substring(0, 100) + '...');
        const response = await chrome.runtime.sendMessage({
          action: 'storeMemory',
          content: chunk.text,
          summary: memoryChunk.summary,
          provider: currentProvider,
          tabId: currentTabId,
          topic: currentTopic,
          conversationId: currentConversationId,
          messageId: memoryChunk.id,
          messageType: chunk.type,
        });
        
        log(`AMP: Stored ${chunk.type} message (${chunk.text.length} chars) - Response:`, response);
      } catch (error) {
        logError('AMP: Failed to store production content:', error);
      }
    } else {
      logError('AMP: Chrome runtime not available');
    }
  }
}

// PRODUCTION content extraction
function extractProductionContent() {
  const chunks = [];
  const processedElements = new Set();
  
  // Get ALL elements with text content
  const allElements = document.querySelectorAll('*');
  log(`AMP: Scanning ${allElements.length} total elements for content`);
  
  allElements.forEach(element => {
    // Skip already processed elements
    if (processedElements.has(element)) return;
    
    // Get text content
    const text = element.textContent?.trim();
    if (!text || text.length < 10) return;
    
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
    
    // Skip navigation, headers, footers
    if (element.closest('nav, header, footer, aside, .nav, .header, .footer, .sidebar')) return;
    
    // Skip common UI junk
    if (text.match(/^(©|Privacy|Terms|Cookie|Menu|Home|About|Contact|Login|Sign|Register|Background|Text size|px|Loading|Loading\.\.\.|Please wait)$/i)) return;
    
    // Skip very short or very long text (likely not content)
    if (text.length < 10 || text.length > 10000) return;
    
    // Skip elements that are just numbers or symbols
    if (text.match(/^[\d\s\-_\.]+$/)) return;
    
    // Skip elements that are just CSS properties
    if (text.match(/^(color|background|font|margin|padding|border|width|height|display|position):/i)) return;
    
    // Determine message type based on element attributes and content
    let type = 'content';
    
    // Check for user/assistant indicators
    if (element.getAttribute('data-message-author-role') === 'user' || 
        element.textContent?.includes('User:') || 
        element.textContent?.includes('You:') ||
        element.closest('[data-role="user"]')) {
      type = 'user';
    } else if (element.getAttribute('data-message-author-role') === 'assistant' || 
               element.textContent?.includes('Assistant:') || 
               element.textContent?.includes('AI:') ||
               element.closest('[data-role="assistant"]')) {
      type = 'assistant';
    }
    
    // Check if this element contains meaningful content
    const hasRealContent = text.split(' ').length > 3 && 
                          text.length > 20 && 
                          !text.match(/^[A-Z\s]+$/) && // Not all caps
                          text.includes(' ') && // Has spaces (not just one word)
                          !text.match(/^\d+$/); // Not just numbers
    
    if (hasRealContent) {
      chunks.push({ 
        text: text.substring(0, 2000), // Limit length
        type: type 
      });
      
      // Mark this element and its children as processed
      processedElements.add(element);
      element.querySelectorAll('*').forEach(child => processedElements.add(child));
      
      log(`AMP: Extracted ${type} content (${text.length} chars): ${text.substring(0, 100)}...`);
    }
  });
  
  log(`AMP: Total extracted ${chunks.length} content chunks`);
  return chunks;
}





