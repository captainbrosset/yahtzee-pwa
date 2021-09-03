const CACHE_NAME = 'yahtzee-cache-v1';
const TO_CACHE = [
    '/',
    '/index.html',
    '/bundle.js',
    '/favicon.ico',
    '/error.html',
    '/ui.css',
    'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
];

// On install, fill the cache with the resources.
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        cache.addAll(TO_CACHE);
    })());
});

// On fetch events, do a cache-first approach.
self.addEventListener('fetch', event => {
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Try the cache first.
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse !== undefined) {
            // Cache hit, let's send the cached resource.
            return cachedResponse;
        } else {
            // Nothing in cache, let's try the network.

            try {
                const fetchResponse = await fetch(event.request);
                if (fetchResponse.status === 200) {
                    // Save the fetched resource in the cache.
                    // (responses are streams, so we need to clone in order to use it here).
                    cache.put(event.request, fetchResponse.clone());
                }
    
                // And return it.
                return fetchResponse;
            } finally {
                // Could not reach the network, let's go to the error page.
                if (event.request.mode === 'navigate') {
                    const errorResponse = await cache.match('error.html');
                    return errorResponse;
                }
            }
        }
    })());
});
