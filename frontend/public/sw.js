/**
 * Service Worker for CQL Code Clinic
 * Provides advanced caching, offline support, and performance optimization
 */

const CACHE_NAME = 'cql-clinic-v1.0.0';
const DYNAMIC_CACHE = 'cql-clinic-dynamic-v1.0.0';
const API_CACHE = 'cql-clinic-api-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add core CSS and JS files that will be generated
  // These will be updated by the build process
];

// API routes that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/exercises',
  '/api/content',
  '/api/progress',
  '/api/tutorials'
];

// Routes that should never be cached
const NO_CACHE_ROUTES = [
  '/api/auth',
  '/api/login',
  '/api/logout',
  '/api/analytics/events',
  '/api/performance'
];

// Cache strategies by route type
const CACHE_STRATEGIES = {
  static: 'cache-first',
  api: 'network-first',
  dynamic: 'stale-while-revalidate'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }
  
  // Determine caching strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Never cache sensitive routes
  if (NO_CACHE_ROUTES.some(route => url.pathname.startsWith(route))) {
    return fetch(request);
  }
  
  // Use network-first for cacheable API routes
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        
        // Only cache GET requests with successful responses
        if (request.method === 'GET') {
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } else {
        throw new Error(`Network response not ok: ${networkResponse.status}`);
      }
    } catch (error) {
      console.log('Network failed for API request, trying cache:', error);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline page for failed API requests
      return createOfflineResponse(request);
    }
  }
  
  // Default to network for other API requests
  return fetch(request);
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch static asset:', error);
    
    // Return fallback for critical assets
    return createFallbackResponse(request);
  }
}

/**
 * Handle dynamic requests with stale-while-revalidate strategy
 */
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in the background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('Network failed for dynamic request:', error);
    return null;
  });
  
  // Return cached version immediately if available, otherwise wait for network
  if (cachedResponse) {
    fetchPromise.catch(() => {}); // Prevent unhandled promise rejection
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  return networkResponse || createOfflineResponse(request);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Create offline response for failed requests
 */
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Offline - please check your internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  // Return offline HTML page
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CQL Code Clinic - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: #f8f9fa; 
        }
        .offline-message {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        .retry-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 20px;
        }
        .retry-btn:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="offline-message">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button class="retry-btn" onclick="location.reload()">Retry</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html'
      }
    }
  );
}

/**
 * Create fallback response for failed static assets
 */
function createFallbackResponse(request) {
  const url = new URL(request.url);
  
  // Return transparent pixel for images
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
    return new Response(
      new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]),
      {
        headers: {
          'Content-Type': 'image/png'
        }
      }
    );
  }
  
  // Return empty response for other assets
  return new Response('', {
    status: 404,
    statusText: 'Not Found'
  });
}

/**
 * Background sync for failed requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

/**
 * Handle background sync
 */
async function handleBackgroundSync() {
  try {
    // Retry failed API requests stored in IndexedDB
    const failedRequests = await getFailedRequests();
    
    for (const request of failedRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          await removeFailedRequest(request.id);
          console.log('Background sync successful for:', request.url);
        }
      } catch (error) {
        console.log('Background sync failed for:', request.url, error);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'cql-clinic-notification',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Focus existing client if available
      if (clients.length > 0) {
        clients[0].focus();
        if (data.url) {
          clients[0].postMessage({
            type: 'navigate',
            url: data.url
          });
        }
      } else {
        // Open new client
        return self.clients.openWindow(data.url || '/');
      }
    })
  );
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches(payload.cacheNames));
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
      }));
      break;
  }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  for (const url of urls) {
    try {
      await cache.add(url);
    } catch (error) {
      console.warn('Failed to cache URL:', url, error);
    }
  }
}

/**
 * Clear specific caches
 */
async function clearCaches(cacheNames) {
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
    console.log('Cleared cache:', cacheName);
  }
}

/**
 * Get cache status information
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Utility functions for IndexedDB operations (simplified)
function getFailedRequests() {
  return new Promise(resolve => {
    // Simplified implementation - would use IndexedDB in production
    resolve([]);
  });
}

function removeFailedRequest(id) {
  return new Promise(resolve => {
    // Simplified implementation - would use IndexedDB in production
    resolve();
  });
}

console.log('Service Worker loaded and ready!');