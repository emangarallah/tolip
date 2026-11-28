const SHELL_CACHE = 'tolip-shell-v3';
const DATA_CACHE = 'tolip-data-v1';
const STATIC_CACHE = 'tolip-static-v1';
const IMAGE_CACHE = 'tolip-images-v1';
const ACTIVE_CACHES = [SHELL_CACHE, DATA_CACHE, STATIC_CACHE, IMAGE_CACHE];
const SHELL_URLS = ['/', '/manifest.webmanifest', '/images/tolip-logo.png'];
const PUBLIC_DATA_PATHS = new Set([
  '/api/settings',
  '/api/categories',
  '/api/products',
  '/api/offers',
]);
const MAX_CACHED_ASSETS = 60;
const MAX_CACHED_IMAGES = 60;

async function storeResponse(cacheName, request, response, maxEntries) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());

    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.length - maxEntries;
      await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
    }
  } catch {
    // A full browser cache must never prevent the storefront from loading.
  }
}

async function fetchAndStore(cacheName, request, maxEntries) {
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await storeResponse(cacheName, request, response, maxEntries);
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Cache each shell file independently so one missing resource cannot
      // prevent the worker from installing on an unstable connection.
      await Promise.all(SHELL_URLS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
        } catch {
          // The next online visit will fill any missing shell entry.
        }
      }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('tolip-') && !ACTIVE_CACHES.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Keep the public storefront catalog available from the last successful
  // visit. Never cache admin queries, filtered/private data, or order APIs.
  if (isSameOrigin && url.search === '' && PUBLIC_DATA_PATHS.has(url.pathname)) {
    const cachePromise = caches.open(DATA_CACHE);
    const updatePromise = fetchAndStore(DATA_CACHE, request, 20);
    event.waitUntil(updatePromise.catch(() => undefined));

    event.respondWith((async () => {
      const cache = await cachePromise;
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        return await updatePromise;
      } catch {
        return new Response(url.pathname === '/api/settings' ? '{}' : '[]', {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // Return the last downloaded page immediately, then refresh the app shell
  // quietly in the background when the network is available.
  if (request.mode === 'navigate' && isSameOrigin) {
    const cachePromise = caches.open(SHELL_CACHE);
    const updatePromise = fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await cachePromise;
        try {
          await cache.put('/', response.clone());
        } catch {
          // A cache write failure must not block page navigation.
        }
      }
      return response;
    }).catch(() => null);
    event.waitUntil(updatePromise.then(() => undefined));

    event.respondWith((async () => {
      const cache = await cachePromise;
      const cached = await cache.match('/');
      if (cached) return cached;

      const networkResponse = await updatePromise;
      if (networkResponse) return networkResponse;

      return new Response(
        '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>توليب</title><body style="font-family:Arial,sans-serif;padding:24px;text-align:center"><h2>لا يوجد اتصال بالإنترنت</h2><p>افتحي المتجر مرة أخرى عند توفر الاتصال.</p></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })());
    return;
  }

  // Cache product and category images, including secure external image hosts.
  // Once downloaded, an image can be shown without downloading it again.
  if (request.destination === 'image') {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        return await fetchAndStore(IMAGE_CACHE, request, MAX_CACHED_IMAGES);
      } catch {
        return new Response('', { status: 504, statusText: 'Image unavailable offline' });
      }
    })());
    return;
  }

  // Vite files have fingerprinted names, so cache-first is safe and avoids
  // waiting for repeated downloads of JavaScript and CSS on weak connections.
  if (isSameOrigin && (
    url.pathname.startsWith('/assets/') ||
    request.destination === 'script' ||
    request.destination === 'style'
  )) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        return await fetchAndStore(STATIC_CACHE, request, MAX_CACHED_ASSETS);
      } catch {
        return new Response('', { status: 504, statusText: 'Asset unavailable offline' });
      }
    })());
  }
});
