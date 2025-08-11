/**
 * Service Worker Registration and Management Utilities
 * Handles service worker lifecycle, updates, and communication
 */

// Service worker configuration
const SW_CONFIG = {
  swUrl: '/sw.js',
  scope: '/',
  updateCheckInterval: 60000, // 1 minute
  skipWaiting: true
};

// Service worker state
let swRegistration = null;
let updateAvailable = false;
let isOnline = navigator.onLine;

/**
 * Register service worker with error handling and lifecycle management
 * @param {Object} config - Configuration options
 * @returns {Promise<ServiceWorkerRegistration|null>} Registration promise
 */
export async function registerSW(config = {}) {
  const finalConfig = { ...SW_CONFIG, ...config };
  
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    console.log('Registering service worker...');
    
    const registration = await navigator.serviceWorker.register(
      finalConfig.swUrl,
      { scope: finalConfig.scope }
    );
    
    swRegistration = registration;
    
    // Handle different service worker states
    if (registration.installing) {
      console.log('Service worker installing...');
      trackInstallProgress(registration.installing);
    } else if (registration.waiting) {
      console.log('Service worker installed and waiting...');
      handleWaitingSW(registration.waiting);
    } else if (registration.active) {
      console.log('Service worker active and running');
    }
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('Service worker update found');
      handleUpdateFound(registration);
    });
    
    // Start periodic update checks
    if (finalConfig.updateCheckInterval > 0) {
      startUpdateChecker(registration, finalConfig.updateCheckInterval);
    }
    
    // Setup message communication
    setupMessageChannel(registration);
    
    // Setup online/offline handling
    setupNetworkHandlers();
    
    return registration;
    
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 * @returns {Promise<boolean>} Success status
 */
export async function unregisterSW() {
  if (!swRegistration) {
    return false;
  }
  
  try {
    const result = await swRegistration.unregister();
    swRegistration = null;
    console.log('Service worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Update service worker immediately
 * @returns {Promise<boolean>} Success status
 */
export async function updateSW() {
  if (!swRegistration) {
    console.warn('No service worker registration found');
    return false;
  }
  
  try {
    await swRegistration.update();
    
    if (swRegistration.waiting) {
      // Tell the waiting service worker to skip waiting
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Service worker update failed:', error);
    return false;
  }
}

/**
 * Get service worker status information
 * @returns {Object} Status information
 */
export function getSWStatus() {
  return {
    supported: 'serviceWorker' in navigator,
    registered: !!swRegistration,
    active: !!(swRegistration?.active),
    waiting: !!(swRegistration?.waiting),
    installing: !!(swRegistration?.installing),
    updateAvailable,
    isOnline,
    registration: swRegistration
  };
}

/**
 * Send message to service worker
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from service worker
 */
export function sendMessageToSW(message) {
  return new Promise((resolve, reject) => {
    if (!swRegistration?.active) {
      reject(new Error('No active service worker'));
      return;
    }
    
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    messageChannel.port1.onerror = (error) => {
      reject(error);
    };
    
    swRegistration.active.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Cache specific URLs using service worker
 * @param {Array<string>} urls - URLs to cache
 * @returns {Promise<void>}
 */
export async function cacheUrls(urls) {
  if (!swRegistration?.active) {
    console.warn('No active service worker to handle caching');
    return;
  }
  
  try {
    await sendMessageToSW({
      type: 'CACHE_URLS',
      payload: { urls }
    });
    console.log('URLs cached successfully:', urls);
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

/**
 * Clear service worker caches
 * @param {Array<string>} cacheNames - Cache names to clear
 * @returns {Promise<void>}
 */
export async function clearSWCache(cacheNames = []) {
  if (!swRegistration?.active) {
    console.warn('No active service worker to clear caches');
    return;
  }
  
  try {
    await sendMessageToSW({
      type: 'CLEAR_CACHE',
      payload: { cacheNames }
    });
    console.log('Caches cleared successfully:', cacheNames);
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Get cache status from service worker
 * @returns {Promise<Object>} Cache status
 */
export async function getCacheStatus() {
  if (!swRegistration?.active) {
    return {};
  }
  
  try {
    const response = await sendMessageToSW({ type: 'GET_CACHE_STATUS' });
    return response.payload;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return {};
  }
}

/**
 * Track service worker installation progress
 * @param {ServiceWorker} worker - Installing service worker
 */
function trackInstallProgress(worker) {
  worker.addEventListener('statechange', () => {
    console.log('Service worker state changed:', worker.state);
    
    switch (worker.state) {
      case 'installed':
        if (navigator.serviceWorker.controller) {
          console.log('New service worker installed, update available');
          updateAvailable = true;
          notifyUpdateAvailable();
        } else {
          console.log('Service worker installed for the first time');
        }
        break;
      case 'activated':
        console.log('Service worker activated');
        updateAvailable = false;
        break;
      case 'redundant':
        console.log('Service worker became redundant');
        break;
    }
  });
}

/**
 * Handle waiting service worker
 * @param {ServiceWorker} worker - Waiting service worker
 */
function handleWaitingSW(worker) {
  updateAvailable = true;
  notifyUpdateAvailable();
  
  worker.addEventListener('statechange', () => {
    if (worker.state === 'activated') {
      updateAvailable = false;
      window.location.reload();
    }
  });
}

/**
 * Handle update found event
 * @param {ServiceWorkerRegistration} registration - Service worker registration
 */
function handleUpdateFound(registration) {
  const newWorker = registration.installing;
  
  if (newWorker) {
    trackInstallProgress(newWorker);
  }
}

/**
 * Start periodic update checks
 * @param {ServiceWorkerRegistration} registration - Service worker registration
 * @param {number} interval - Check interval in milliseconds
 */
function startUpdateChecker(registration, interval) {
  setInterval(async () => {
    try {
      await registration.update();
    } catch (error) {
      console.error('Automatic update check failed:', error);
    }
  }, interval);
}

/**
 * Setup message channel for communication
 * @param {ServiceWorkerRegistration} registration - Service worker registration
 */
function setupMessageChannel(registration) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'navigate':
        if (payload.url) {
          window.location.href = payload.url;
        }
        break;
      default:
        console.log('Received message from service worker:', event.data);
    }
  });
}

/**
 * Setup online/offline event handlers
 */
function setupNetworkHandlers() {
  const updateOnlineStatus = () => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (wasOnline !== isOnline) {
      console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
      
      // Dispatch custom events
      window.dispatchEvent(new CustomEvent('networkstatuschange', {
        detail: { isOnline }
      }));
      
      if (isOnline) {
        window.dispatchEvent(new CustomEvent('online'));
      } else {
        window.dispatchEvent(new CustomEvent('offline'));
      }
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

/**
 * Notify about available update
 */
function notifyUpdateAvailable() {
  // Dispatch custom event for update notification
  window.dispatchEvent(new CustomEvent('swupdateavailable', {
    detail: { registration: swRegistration }
  }));
  
  // Show user-friendly notification
  if (window.showNotification) {
    window.showNotification({
      type: 'info',
      title: 'App Update Available',
      message: 'A new version is available. Refresh to update.',
      action: {
        text: 'Update Now',
        callback: () => updateSW()
      }
    });
  }
}

/**
 * Check if app is running as PWA
 * @returns {boolean} Is PWA
 */
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Prompt for PWA installation
 * @returns {Promise<boolean>} Installation result
 */
export async function promptPWAInstall() {
  if (!window.deferredPrompt) {
    console.log('PWA install prompt not available');
    return false;
  }
  
  try {
    window.deferredPrompt.prompt();
    const result = await window.deferredPrompt.userChoice;
    window.deferredPrompt = null;
    
    console.log('PWA install prompt result:', result.outcome);
    return result.outcome === 'accepted';
  } catch (error) {
    console.error('PWA install prompt failed:', error);
    return false;
  }
}

/**
 * React hook for service worker status
 * @returns {Object} Service worker status and utilities
 */
export function useSWStatus() {
  const [status, setStatus] = React.useState(getSWStatus);
  const [networkStatus, setNetworkStatus] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(getSWStatus());
    }, 1000);
    
    // Listen for network changes
    const handleNetworkChange = (event) => {
      setNetworkStatus(event.detail.isOnline);
    };
    
    // Listen for service worker updates
    const handleSWUpdate = () => {
      setStatus(getSWStatus());
    };
    
    window.addEventListener('networkstatuschange', handleNetworkChange);
    window.addEventListener('swupdateavailable', handleSWUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('networkstatuschange', handleNetworkChange);
      window.removeEventListener('swupdateavailable', handleSWUpdate);
    };
  }, []);
  
  return {
    ...status,
    isOnline: networkStatus,
    updateSW,
    unregisterSW,
    cacheUrls,
    clearCache: clearSWCache,
    getCacheStatus,
    isPWA: isPWA(),
    promptInstall: promptPWAInstall
  };
}

/**
 * Setup beforeinstallprompt event handler
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default install prompt
    event.preventDefault();
    
    // Store the event for later use
    window.deferredPrompt = event;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwainstallable'));
  });
}

export default {
  register: registerSW,
  unregister: unregisterSW,
  update: updateSW,
  getStatus: getSWStatus,
  sendMessage: sendMessageToSW,
  cacheUrls,
  clearCache: clearSWCache,
  getCacheStatus,
  isPWA,
  promptInstall: promptPWAInstall,
  useSWStatus
};