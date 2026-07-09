/**
 * FileNamer Service Worker
 * Placeholder for offline support / caching.
 */

const CACHE_NAME = 'fn-maker-cache-v4';
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
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
