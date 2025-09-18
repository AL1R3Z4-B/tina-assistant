const CACHE_NAME = 'tina-cache-v2';
const urlsToCache = [
  '/tina-assistant/',
  '/tina-assistant/Tina2.html',
  '/tina-assistant/manifest.json',
  '/tina-assistant/sw.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://s6.uupload.ir/files/img_20250821_020025_605_7pey.jpg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // اگر فایل در کش وجود دارد، آن را برگردان
        if (response) {
          return response;
        }
        
        // در غیر این صورت از شبکه fetch کن
        return fetch(event.request).then(function(response) {
          // پاسخ را بررسی کن و در صورت نیاز cache کن
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          var responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// پاک کردن کش‌های قدیمی
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
