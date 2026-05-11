// Service worker for time-displaced-ears.
//
// Strategy
//   navigation (HTML)  → network-first, fall back to cached index.html (works offline)
//   ./assets/*         → cache-first (Vite hashes filenames, so they're immutable)
//   cross-origin       → pass through (don't proxy the Pyodide CDN here; the browser
//                        HTTP cache handles that and we don't want to double-cache 25 MB)

const VERSION = 'v1';
const SHELL_CACHE = `tde-shell-${VERSION}`;
const ASSET_CACHE = `tde-assets-${VERSION}`;
const SHELL_URLS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(req));
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  event.respondWith(cacheFirst(req, SHELL_CACHE));
});

async function navigationStrategy(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('./index.html', fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const cached = await caches.match('./index.html');
    if (cached) return cached;
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}
