// AMP License Validation Module
// Version 4.0.0

// Production logging - uses global AMP_DEBUG if available (set by background.js)
const _AMP_DEBUG_LICENSE = (typeof AMP_DEBUG !== 'undefined') ? AMP_DEBUG : false;
const logLicense = (...args) => _AMP_DEBUG_LICENSE && console.log('[AMP License]', ...args);
const logLicenseError = (...args) => console.error('[AMP License]', ...args);

// API endpoint for license validation
const LICENSE_API_URL = 'https://amp-license-api.vercel.app';

// Developer/Owner license keys (bypass API validation)
const DEV_LICENSE_KEYS = [
  'AMP-DEV-OWNER-2025',
  'AMP-LIFETIME-OWNER',
  'AMPIQ-MASTER-KEY-001'
];

// License state
let licenseState = {
  isValid: false,
  licenseKey: null,
  plan: null,
  features: null,
  status: 'unlicensed',
  lastChecked: null,
  expiresAt: null
};

// Feature restrictions based on plan
const PLAN_FEATURES = {
  unlicensed: {
    extension: false,
    maxMemorySlots: 0,
    maxStorageBytes: 0,
    desktopApp: false,
    unlimitedStorage: false,
    nativeMessaging: false,
    contextInjection: false,
    prioritySupport: false
  },
  ext_monthly: {
    extension: true,
    maxMemorySlots: 5,
    maxStorageBytes: 5 * 1024 * 1024, // 5MB
    desktopApp: false,
    unlimitedStorage: false,
    nativeMessaging: false,
    contextInjection: false,
    prioritySupport: false
  },
  ext_lifetime: {
    extension: true,
    maxMemorySlots: 5,
    maxStorageBytes: 5 * 1024 * 1024, // 5MB
    desktopApp: false,
    unlimitedStorage: false,
    nativeMessaging: false,
    contextInjection: false,
    prioritySupport: false
  },
  complete_monthly: {
    extension: true,
    maxMemorySlots: 10,
    maxStorageBytes: Infinity,
    desktopApp: true,
    unlimitedStorage: true,
    nativeMessaging: true,
    contextInjection: true,
    prioritySupport: true
  },
  complete_lifetime: {
    extension: true,
    maxMemorySlots: 10,
    maxStorageBytes: Infinity,
    desktopApp: true,
    unlimitedStorage: true,
    nativeMessaging: true,
    contextInjection: true,
    prioritySupport: true
  }
};

// Initialize license state from storage
async function initializeLicense() {
  try {
    const stored = await chrome.storage.local.get(['amp_license_key', 'amp_license_state']);
    
    if (stored.amp_license_key) {
      licenseState.licenseKey = stored.amp_license_key;
      
      // Restore cached state if available and not too old
      if (stored.amp_license_state) {
        const cached = stored.amp_license_state;
        const cacheAge = Date.now() - (cached.lastChecked || 0);
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxCacheAge && cached.isValid) {
          licenseState = { ...licenseState, ...cached };
          logLicense('Restored cached license state:', licenseState.plan);
          
          // Validate in background
          validateLicenseAsync(stored.amp_license_key);
          return licenseState;
        }
      }
      
      // Validate immediately
      return await validateLicense(stored.amp_license_key);
    }
    
    logLicense('No license key found');
    return licenseState;
  } catch (error) {
    logLicenseError('Failed to initialize license:', error);
    return licenseState;
  }
}

// Validate license with API
async function validateLicense(licenseKey) {
  if (!licenseKey) {
    licenseState = {
      isValid: false,
      licenseKey: null,
      plan: null,
      features: PLAN_FEATURES.unlicensed,
      status: 'unlicensed',
      lastChecked: Date.now()
    };
    return licenseState;
  }
  
  // Check for developer/owner keys (bypass API)
  const normalizedKey = licenseKey.trim().toUpperCase();
  if (DEV_LICENSE_KEYS.includes(normalizedKey)) {
    logLicense('Developer/Owner key detected - granting full access');
    licenseState = {
      isValid: true,
      licenseKey: normalizedKey,
      plan: 'complete_lifetime',
      features: PLAN_FEATURES.complete_lifetime,
      status: 'active',
      lastChecked: Date.now(),
      expiresAt: null // Never expires
    };
    
    // Cache the state
    await chrome.storage.local.set({
      amp_license_key: normalizedKey,
      amp_license_state: licenseState
    });
    
    notifyLicenseChange();
    return licenseState;
  }
  
  try {
    logLicense('Validating license:', licenseKey.substring(0, 8) + '...');
    
    const response = await fetch(`${LICENSE_API_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licenseKey }),
    });
    
    const data = await response.json();
    
    if (data.valid) {
      licenseState = {
        isValid: true,
        licenseKey,
        plan: data.plan,
        features: PLAN_FEATURES[data.plan] || PLAN_FEATURES.unlicensed,
        status: data.status || 'active',
        lastChecked: Date.now(),
        expiresAt: data.expiresAt
      };
      
      // Cache the state
      await chrome.storage.local.set({
        amp_license_key: licenseKey,
        amp_license_state: licenseState
      });
      
      logLicense('License validated:', licenseState.plan);
    } else {
      licenseState = {
        isValid: false,
        licenseKey,
        plan: null,
        features: PLAN_FEATURES.unlicensed,
        status: data.error || 'invalid',
        lastChecked: Date.now()
      };
      
      // Clear cached state on invalid
      await chrome.storage.local.remove(['amp_license_state']);
      
      logLicense('License invalid:', data.error);
    }
    
    // Notify listeners
    notifyLicenseChange();
    
    return licenseState;
  } catch (error) {
    logLicenseError('License validation failed:', error);
    
    // Keep existing state on network error
    licenseState.lastChecked = Date.now();
    return licenseState;
  }
}

// Async validation (doesn't block)
function validateLicenseAsync(licenseKey) {
  validateLicense(licenseKey).catch(err => {
    logLicenseError('Async license validation failed:', err);
  });
}

// Activate license with key
async function activateLicense(licenseKey) {
  if (!licenseKey || licenseKey.trim().length === 0) {
    return { success: false, error: 'License key is required' };
  }
  
  const result = await validateLicense(licenseKey.trim().toUpperCase());
  
  if (result.isValid) {
    return { success: true, plan: result.plan, features: result.features };
  } else {
    return { success: false, error: result.status };
  }
}

// Deactivate license
async function deactivateLicense() {
  licenseState = {
    isValid: false,
    licenseKey: null,
    plan: null,
    features: PLAN_FEATURES.unlicensed,
    status: 'unlicensed',
    lastChecked: Date.now()
  };
  
  await chrome.storage.local.remove(['amp_license_key', 'amp_license_state']);
  notifyLicenseChange();
  
  return { success: true };
}

// Check if a feature is available
function hasFeature(featureName) {
  if (!licenseState.isValid || !licenseState.features) {
    return false;
  }
  return licenseState.features[featureName] === true;
}

// Get current license state
function getLicenseState() {
  return { ...licenseState };
}

// Check if extension is licensed
function isLicensed() {
  return licenseState.isValid && licenseState.features?.extension === true;
}

// Get max memory slots based on license
function getMaxMemorySlots() {
  return licenseState.features?.maxMemorySlots || 0;
}

// Get max storage bytes based on license
function getMaxStorageBytes() {
  return licenseState.features?.maxStorageBytes || 0;
}

// Notify listeners of license change
function notifyLicenseChange() {
  try {
    chrome.runtime.sendMessage({
      type: 'LICENSE_STATE_CHANGED',
      state: getLicenseState()
    }).catch(() => {
      // Ignore errors if no listeners
    });
  } catch (e) {
    // Ignore
  }
}

// Periodic license check (every 6 hours)
let licenseCheckInterval = null;

function startPeriodicLicenseCheck() {
  if (licenseCheckInterval) {
    clearInterval(licenseCheckInterval);
  }
  
  licenseCheckInterval = setInterval(() => {
    if (licenseState.licenseKey) {
      validateLicenseAsync(licenseState.licenseKey);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

function stopPeriodicLicenseCheck() {
  if (licenseCheckInterval) {
    clearInterval(licenseCheckInterval);
    licenseCheckInterval = null;
  }
}

// Export for use in background.js
if (typeof globalThis !== 'undefined') {
  globalThis.AMP_License = {
    initialize: initializeLicense,
    validate: validateLicense,
    activate: activateLicense,
    deactivate: deactivateLicense,
    hasFeature,
    getState: getLicenseState,
    isLicensed,
    getMaxMemorySlots,
    getMaxStorageBytes,
    startPeriodicCheck: startPeriodicLicenseCheck,
    stopPeriodicCheck: stopPeriodicLicenseCheck,
    PLAN_FEATURES
  };
}

