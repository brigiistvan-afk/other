const CACHE_NAME = 'ibar-final-v1';
const BASE = '/IBAR';

// Local files to cache
const LOCAL_FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`
];

// CDN files
const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

// Install - cache everything
self.addEventListener('install', event => {
  console.log('[IBAR SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[IBAR SW] Caching local files');
      return cache.addAll(LOCAL_FILES)
        .then(() => {
          console.log('[IBAR SW] Local files cached');
          console.log('[IBAR SW] Caching CDN files');
          return Promise.allSettled(
            CDN_FILES.map(url => 
              fetch(url, {mode: 'cors', cache: 'force-cache'})
                .then(response => {
                  if (response.ok) {
                    console.log('[IBAR SW] Cached:', url);
                    return cache.put(url, response);
                  }
                })
                .catch(err => console.warn('[IBAR SW] CDN cache failed:', url, err))
            )
          );
        })
        .then(() => console.log('[IBAR SW] Install complete!'));
    })
  );
  self.skipWaiting();
});

// Activate - cleanup
self.addEventListener('activate', event => {
  console.log('[IBAR SW] Activating...');
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[IBAR SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[IBAR SW] Activated!');
      return self.clients.claim();
    })
  );
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(cached => {
          if (cached) {
            console.log('[IBAR SW] Serving from cache:', event.request.url);
            return cached;
          }
          console.warn('[IBAR SW] No cache for:', event.request.url);
          return new Response('Offline', {status: 503});
        });
      })
  );
});
