// © 2025 AMPIQ All rights reserved.
// Content script for AMP extension

console.log('AMP: Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('AMP Content: Received message:', message);
  
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
      
    default:
      // Handle other messages
      break;
  }
  
  return true;
});

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
    console.log('AMP: Could not add debug indicator:', error);
  }
}

// Set monitoring status and update UI
function setMonitoringStatus(isActive, tabId) {
  isActiveMonitoringTab = isActive;
  
  // Update or create monitoring indicator
  updateMonitoringIndicator();
  
  console.log(`AMP Content: Monitoring status set to ${isActive} for tab ${tabId}`);
  
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
    console.log('AMP: Could not update monitoring indicator:', error);
  }
}

// Start monitoring for this tab
function startMonitoring() {
  console.log('AMP Content: Starting monitoring for this tab');
  // The existing monitoring functions will now work since isActiveMonitoringTab is true
}

// Stop monitoring for this tab
function stopMonitoring() {
  console.log('AMP Content: Stopping monitoring for this tab');
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
        console.error('Failed to request monitoring switch:', error);
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
    
    console.log(`💡 AMP Content: Showing monitoring hint for ${provider}`);
  } catch (error) {
    console.error('AMP Content: Failed to show monitoring hint:', error);
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
  
  // Initialize context injection system
  initializeContextInjection();
  
  console.log(`AMP: ${currentProvider} - ${currentConversationId}`);
  observeDOM();
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
        console.log('AMP Content: This tab is actively being monitored');
      } else {
        setMonitoringStatus(false, currentTabId);
        console.log('AMP Content: This tab is not being monitored');
      }
    }
  } catch (error) {
    console.error('AMP Content: Failed to check monitoring status:', error);
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
    console.error('AMP: Error requesting context injection:', error);
  }
}

function handleContextInjection(context, amount) {
  console.log(`🔄 AMP: Injecting context (${amount} chars)...`);
  
  // Find the main input area
  const inputSelectors = [
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="chat"]',
    'textarea[placeholder*="Chat"]',
    'div[contenteditable="true"]',
    'input[type="text"]'
  ];
  
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
    
    console.log('AMP: Context injected successfully');
  } else {
    console.error('AMP: Could not find input element for context injection');
  }
}

// Observe DOM changes
function observeDOM() {
  const observer = new MutationObserver(async (mutations) => {
    let foundNewMessages = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 20) {
              foundNewMessages = true;
            }
          }
        });
      }
    });
    
    if (foundNewMessages) {
      await processNewContent();
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// Process new content with S1-S9 progression
async function processNewContent() {
  // Only process content if this tab is actively being monitored
  if (!isActiveMonitoringTab) {
    return;
  }
  
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

// Extract conversation content
function extractConversationTurns() {
  const chunks = [];
  const messageSelectors = [
    '[data-message-author-role]',
    '.message',
    '.chat-message',
    'p'
  ];
  
  for (const selector of messageSelectors) {
    const messages = document.querySelectorAll(selector);
    
    messages.forEach(msg => {
      if (msg.hasAttribute('data-amp-processed')) return;
      
      const text = msg.textContent?.trim();
      if (!text || text.length < 15) return;
      
      chunks.push({ 
        text, 
        type: 'content' 
      });
      
      msg.setAttribute('data-amp-processed', 'true');
    });
    
    if (chunks.length > 0) break;
  }
  
  return chunks;
}

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

// Initialize session
async function initializeSession() {
  currentProvider = getAIProvider();
  currentTabId = await getTabId();
  currentTopic = window.getTopic ? window.getTopic() : 'conversation';
  currentConversationId = `conv_${currentProvider}_${currentTabId}_${Date.now()}`;
  
  console.log(`🌊 AMP Extension: ${currentProvider} - ${currentConversationId}`);
  
  // Add visible debug indicator
  addDebugIndicator();
  
  
  
  observeDOM();
}

function observeDOM() {
  console.log('AMP: Starting data collection');
  
  const observer = new MutationObserver(async (mutations) => {
    let foundNewMessages = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 20) {
              console.log('🆕 AMP: LIVE content detected:', text.substring(0, 100) + '...');
              foundNewMessages = true;
            }
          }
        });
      }
    });
    
    if (foundNewMessages) {
      await processNewContent();
    }
  });
  
  // Enhanced selectors for LIVE testing
  const chatSelectors = [
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
    '#chat-container',
    '.chat-messages',
    '.messages-container',
    '.message-container',
    'main'
  ];
  
  let observedCount = 0;
  
  // Observe ALL containers
  chatSelectors.forEach(selector => {
    const containers = document.querySelectorAll(selector);
    containers.forEach(container => {
      if (!container.hasAttribute('amp-observed')) {
      observer.observe(container, { 
        childList: true, 
        subtree: true,
        characterData: true 
      });
        container.setAttribute('amp-observed', 'true');
        observedCount++;
    }
    });
  });
  
  // Always observe body
    observer.observe(document.body, { childList: true, subtree: true });
  
  console.log(`📡 AMP: LIVE observing ${observedCount} containers + body`);
  
  // Immediate scan
  setTimeout(() => {
    console.log('AMP: Performing content scan');
    processNewContent();
  }, 1000);
  
  // Smart real-time collection (reduced frequency)
  setInterval(() => {
    console.log('🔄 AMP: Smart content scan...');
    processNewContent();
  }, 5000); // Reduced from 2 seconds to 5 seconds
}



async function processNewContent() {
  // Only process content if this tab is actively being monitored
  if (!isActiveMonitoringTab) {
    return;
  }
  
  const chunks = extractConversationTurns();
  
  for (const chunk of chunks) {
    if (chunk.text.trim().length < 20) continue;
    
    messageCount++;
    
    // Create memory chunk
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
    
    // Create DOM node
    const node = createMemoryNode(memoryChunk, chunk.type);
    document.body.appendChild(node);
    visibleNodes.push(node);
    
    // Maintain visible node limit
    if (visibleNodes.length > MAX_VISIBLE_NODES) {
      const stale = visibleNodes.shift();
      stale.remove();
    }
    
    // Send to background script
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
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
    }
    
    console.log(`💧 Stored ${chunk.type} message (${chunk.text.length} chars)`);
  }
}

function extractConversationTurns() {
  const chunks = [];
  console.log('AMP: Extracting conversation data');
  
  // AGGRESSIVE DEBUGGING - Show ALL text content on the page
      const allTextElements = document.querySelectorAll('p, div, span, textarea, input, h1, h2, h3, h4, h5, h6, article, main, section');
    console.log(`AMP: Found ${allTextElements.length} potential text elements`);
  
  // Show first 10 elements with their text
  for (let i = 0; i < Math.min(10, allTextElements.length); i++) {
    const element = allTextElements[i];
    const text = element.textContent?.trim();
    if (text && text.length > 10) {
      console.log(`AMP: Element ${i}: ${element.tagName}.${element.className} = "${text.substring(0, 100)}..."`);
    }
  }
  
  // Get the current provider to determine which selectors to use
  const currentProvider = getAIProvider();
      console.log('AMP: Current provider detected:', currentProvider);
  
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
          console.log('AMP: Using CuePrompter-specific selectors');
  } else if (currentProvider === 'MyCustomSite') {
    messageSelectors = [
      // Add your custom selectors here
      '.my-content',
      '.custom-text',
      'textarea',
      '.input-area'
    ];
          console.log('AMP: Using MyCustomSite-specific selectors');
  } else if (currentProvider === 'AnotherSite') {
    messageSelectors = [
      // Add your custom selectors here
      '.content-area',
      '.text-content',
      'textarea',
      '.input-field'
    ];
    console.log('🔍 AMP: Using AnotherSite-specific selectors');
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
    console.log('🔍 AMP: Using generic content detection for:', currentProvider);
  }
  
  for (const selector of messageSelectors) {
    const messages = document.querySelectorAll(selector);
    console.log(`🔍 AMP: Found ${messages.length} elements with selector: ${selector}`);
    
    messages.forEach(msg => {
      if (msg.hasAttribute('data-amp-processed')) return;
      
      const text = msg.textContent?.trim();
      console.log(`🔍 AMP: Checking element with selector ${selector}:`, {
        text: text ? text.substring(0, 100) + '...' : 'EMPTY',
        length: text ? text.length : 0,
        tagName: msg.tagName,
        className: msg.className,
        id: msg.id
      });
      
      if (!text || text.length < 20) {
        console.log(`🔍 AMP: Skipping element - text too short or empty (${text ? text.length : 0} chars)`);
        return;
      }
      
      // Skip navigation, headers, footers, and other non-content elements
      if (msg.closest('nav, header, footer, aside, .nav, .header, .footer, .sidebar')) {
        console.log(`🔍 AMP: Skipping element - in navigation/footer area`);
        return;
      }
      
      // Skip very short or likely non-content text
      if (text.length < 20 || text.match(/^(©|Privacy|Terms|Cookie|Menu|Home|About|Contact)$/i)) {
        console.log(`🔍 AMP: Skipping element - likely non-content text: "${text}"`);
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
      console.log(`✅ AMP: Extracted ${type} content: ${text.substring(0, 50)}...`);
    });
    
    // Don't break - collect from ALL selectors for maximum data
  }
  
  // FALLBACK: If no chunks found, capture ANY meaningful text content
  if (chunks.length === 0) {
    console.log('🔍 AMP: No chunks found with selectors, using FALLBACK extraction...');
    
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
        console.log(`🔍 AMP: FALLBACK extracted: ${text.substring(0, 100)}...`);
        
        if (fallbackCount >= 5) return; // Limit fallback chunks
      }
    });
    
    console.log(`🔍 AMP: FALLBACK extracted ${fallbackCount} additional chunks`);
  }
  
  console.log(`📊 AMP: Total extracted ${chunks.length} conversation chunks`);
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
  console.log('🔧 AMP: Manual extraction triggered');
  const chunks = extractConversationTurns();
  console.log('🔧 AMP: Manual extraction result:', chunks);
  
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      console.log(`🔧 AMP: Chunk ${index + 1}:`, {
        type: chunk.type,
        text: chunk.text.substring(0, 200) + '...',
        length: chunk.text.length
      });
    });
  } else {
    console.log('🔧 AMP: No chunks extracted - page may not have content');
  }
  
  return chunks;
};

// Debug indicator removed - not needed for production



// Optimized DOM monitoring for dual zipper system
function startOptimizedMonitoring() {
  console.log('🚀 AMP: Starting optimized dual zipper monitoring...');
  
  let scanTimeout = null;
  
  // Debounced scanning to prevent performance issues
  function debouncedScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
          console.log('📝 AMP: Change detected - scanning for S1 capture...');
          scanForS1Capture();
        }
      } catch (error) {
        console.log('AMP: Error during debounced scan:', error.message);
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
      console.log('AMP: Error in initial scan:', error.message);
    }
  }, 2000);
}

// S1 capture scanning for dual zipper system
function scanForS1Capture() {
  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      console.log('AMP: Extension context invalid, skipping scan');
      return;
    }
    
    console.log('🔍 AMP: Scanning for S1 capture...');
    
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
      console.log(`✅ AMP: Captured ${capturedCount} S1 content pieces`);
    }
  } catch (error) {
    console.error('AMP: Error in S1 scan:', error);
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
    
    console.log(`📝 AMP: Capturing S1 ${messageType}: ${text.substring(0, 40)}...`);
    
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
        console.log('AMP: Error sending S1 to background:', error.message);
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
    console.log('🚀 AMP: DOMContentLoaded - Initializing content script...');
    console.log('🔍 AMP: Current URL:', window.location.href);
    console.log('🔍 AMP: Document title:', document.title);
    console.log('🔍 AMP: Document ready state:', document.readyState);
    initializeSession();
    startOptimizedMonitoring();
    
    // PRODUCTION CONTENT MONITORING - Real-time extraction
    setTimeout(() => {
      console.log('🚀 AMP: Starting PRODUCTION content monitoring...');
      startProductionMonitoring();
    }, 1000);
  });
} else {
  console.log('🚀 AMP: DOM already ready - Initializing content script...');
  console.log('🔍 AMP: Current URL:', window.location.href);
  console.log('🔍 AMP: Document title:', document.title);
  console.log('🔍 AMP: Document ready state:', document.readyState);
  initializeSession();
  startOptimizedMonitoring();
  
        // Start real content monitoring
  setTimeout(() => {
    startProductionMonitoring();
    // Force initial extraction
    setTimeout(() => {
      console.log('AMP: Force initial extraction');
      processProductionContent();
      
      // Test with a simple message to verify the system works
      setTimeout(() => {
        console.log('AMP: Sending test message to verify system');
        chrome.runtime.sendMessage({
          action: 'storeMemory',
          content: 'This is a test message to verify the AMP system is working. If you see this in the stats, the system is functioning correctly.',
          summary: 'Test message for system verification',
          provider: currentProvider,
          tabId: currentTabId,
          topic: 'System Test',
          conversationId: currentConversationId,
          messageId: 'test-' + Date.now(),
          messageType: 'test'
        }).then(response => {
          console.log('AMP: Test message response:', response);
        }).catch(error => {
          console.error('AMP: Test message failed:', error);
        });
      }, 3000);
    }, 2000);
  }, 1000);
}

// PRODUCTION CONTENT EXTRACTION - Real-time DOM monitoring
function startProductionMonitoring() {
  console.log('AMP: Starting production content monitoring');
  
  // Real-time DOM monitoring with MutationObserver
  const observer = new MutationObserver(async (mutations) => {
    let hasNewContent = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 20) {
              console.log('AMP: New content detected:', text.substring(0, 100) + '...');
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
  
  console.log('AMP: Production monitoring active');
}

// PRODUCTION content processing
async function processProductionContent() {
  console.log('AMP: Processing production content...');
  const chunks = extractProductionContent();
  console.log('AMP: Extracted chunks:', chunks.length);
  
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
        console.log('AMP: Sending chunk to background:', chunk.text.substring(0, 100) + '...');
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
        
        console.log(`AMP: Stored ${chunk.type} message (${chunk.text.length} chars) - Response:`, response);
      } catch (error) {
        console.error('AMP: Failed to store production content:', error);
      }
    } else {
      console.error('AMP: Chrome runtime not available');
    }
  }
}

// PRODUCTION content extraction
function extractProductionContent() {
  const chunks = [];
  const processedElements = new Set();
  
  // Get ALL elements with text content
  const allElements = document.querySelectorAll('*');
  console.log(`AMP: Scanning ${allElements.length} total elements for content`);
  
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
      
      console.log(`AMP: Extracted ${type} content (${text.length} chars): ${text.substring(0, 100)}...`);
    }
  });
  
  console.log(`AMP: Total extracted ${chunks.length} content chunks`);
  return chunks;
}





