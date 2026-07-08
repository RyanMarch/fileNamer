/**
 * FileNamer Service Worker
 * Placeholder for offline support / caching.
 */

const CACHE_NAME = 'fn-maker-cache-v1';
const ASSETS = [
    '/app/',
    '/app/index.html',
    '/css/style.css',
    '/js/app.js',
    '/docs/',
    '/docs/index.html',
    '/docs/style.css',
    '/docs/header.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
