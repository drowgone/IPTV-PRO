const CACHE_NAME = 'iptv-player-v1';
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

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
