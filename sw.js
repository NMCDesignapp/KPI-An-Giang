/* PWA Service Worker - KPI BVNT An Giang */
const CACHE_NAME = 'kpi-bvnt-v31';
const OFFLINE_URLS = ['/', '/style.css', '/app.js'];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(OFFLINE_URLS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    /* ★ QUAN TRỌNG: index.html LUÔN lấy từ mạng trước, không dùng cache */
    var url = new URL(event.request.url);
    var isHTML = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('.html');

    if (isHTML) {
        /* Network-first cho HTML: ưu tiên mạng, chỉ dùng cache khi offline */
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then(function(response) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(function() {
                    return caches.match(event.request).then(function(cachedResponse) {
                        if (cachedResponse) return cachedResponse;
                        return caches.match('/');
                    });
                })
        );
        return;
    }

    /* Các file khác (CSS, JS, images): network-first, fallback cache */
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(function() {
                return caches.match(event.request).then(function(cachedResponse) {
                    if (cachedResponse) return cachedResponse;
                    return caches.match('/');
                });
            })
    );
});
