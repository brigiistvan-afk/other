const CACHE_NAME = 'ibar-v3';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// CDN URLs - handle separately
const cdnUrls = [
  'https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // Cache local files
        return cache.addAll(urlsToCache)
          .then(() => {
            // Cache CDN files
            return Promise.all(
              cdnUrls.map(url => 
                fetch(url, {mode: 'cors'})
                  .then(response => cache.put(url, response))
                  .catch(err => console.log('[SW] CDN cache failed:', url))
              )
            );
          });
      })
      .catch(err => console.log('[SW] Install failed:', err))
  );
  self.skipWaiting();
});

// Fetch - Network First with Cache Fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone response for caching
        const responseToCache = response.clone();
        
        // Cache valid responses
        if(response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('[SW] Serving from cache:', event.request.url);
              return response;
            }
            // Both failed
            console.log('[SW] No cache match for:', event.request.url);
            return new Response('Offline - no cached version', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
