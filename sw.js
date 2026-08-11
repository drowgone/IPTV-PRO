const CACHE_NAME = 'iptv-player-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './controls.js',
  './parser.js',
  './storage.js',
  './stream.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://cdn.dashjs.org/latest/dash.all.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
