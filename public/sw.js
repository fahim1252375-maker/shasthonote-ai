/*
 * Privacy-first app-shell cache.
 * Cache the versioned static UI bundles so the app can reopen offline.
 * Never cache API responses, authentication data, Firestore data, or user uploads.
 */
const CACHE_PREFIX = 'shasthonote-static-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const STATIC_ASSET_PATTERN = /\.(?:js|css|svg|png|webp|woff2?)$/i;

async function precacheBuiltAssets(cache) {
  try {
    const response = await fetch('/index.html', { cache: 'no-store' });
    if (!response.ok) return;
    await cache.put('/index.html', response.clone());
    const html = await response.text();
    const assetPaths = new Set();
    const attributePattern = /(?:src|href)=["']([^"']+)["']/g;
    let match;
    while ((match = attributePattern.exec(html)) !== null) {
      const rawPath = match[1];
      if (!rawPath.startsWith('/') || rawPath.startsWith('//')) continue;
      const pathname = new URL(rawPath, self.location.origin).pathname;
      if (STATIC_ASSET_PATTERN.test(pathname) && !pathname.startsWith('/api/')) assetPaths.add(pathname);
    }
    await Promise.all([...assetPaths].map(async (path) => {
      try {
        const asset = await fetch(path, { cache: 'no-store' });
        if (asset.ok && asset.type === 'basic') await cache.put(path, asset);
      } catch {
        // Keep the install resilient if an optional static asset cannot be fetched.
      }
    }));
  } catch {
    // The static fallback files below may still be cached on a later install attempt.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (url) => {
      try { await cache.add(url); } catch { /* An individual shell asset must not block installation. */ }
    }));
    await precacheBuiltAssets(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/') || url.pathname.toLowerCase().includes('firestore')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Cache only static frontend resources. No response bodies from data/API routes are stored.
  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
  }
});
