// Neha's Institute — Minimal Service Worker
// Version: bump SHELL_VERSION when deploying new Next.js build to force cache refresh
const SHELL_VERSION = 'v6';
const SHELL_CACHE = `neha-shell-${SHELL_VERSION}`;
const OFFLINE_CACHE = 'neha-offline-v2';

// ─── App shell pages to pre-cache on install ─────────────────────────────────
const SHELL_PAGES = ['/', '/notes', '/plans', '/account', '/help', '/offline.html'];

// ─── Install: cache offline fallback and shell pages immediately ───────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(OFFLINE_CACHE).then((cache) => cache.add('/offline.html')),
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_PAGES))
    ])
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ─── Activate: wipe outdated caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // Delete old caches (ajitsir-* and old neha-* versions)
          if (key !== SHELL_CACHE && key !== OFFLINE_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim()) // take control of all open tabs
  );
});

// ─── Fetch: intercept requests ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. CRITICAL: Never intercept or cache ANY /api/* endpoints or Bunny Stream / CDN domains
  const isBunny =
    url.hostname.includes('bunny') ||
    url.hostname.includes('b-cdn.net') ||
    url.hostname.includes('mediadelivery.net');
  const pathname = url.pathname;

  if (isBunny || pathname.startsWith('/api/')) {
    // Zero SW involvement — pass directly to network
    return;
  }

  // Only handle same-origin requests AND allowed CDNs
  const isSameOrigin = url.origin === self.location.origin;
  const isUnpkg = url.hostname === 'unpkg.com';
  
  if (!isSameOrigin && !isUnpkg) return;

  // 2. CDN Assets (like pdf.worker.min.mjs) — Cache-First
  if (isUnpkg) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 3. Next.js static assets — Cache-First (immutable, versioned by Next.js hash)
  if (pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 4. App shell pages — NetworkFirst, fall back to cache, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // 5. Everything else — network only, do not intercept
});

// ─── Strategy: Cache-First ─────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// ─── Strategy: Navigation handler ─────────────────────────────────────────────
const NAV_TIMEOUT_MS = 10000; // 10 s

async function navigationHandler(request) {
  const cache = await caches.open(SHELL_CACHE);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      cache.put(request, response.clone()); // update shell cache while online
    }
    return response;
  } catch {
    clearTimeout(timer);
    // Network failed or timed out — try exact URL match first
    const cachedPage = await cache.match(request);
    if (cachedPage) return cachedPage;

    const offline = await caches.match('/offline.html');
    return offline || new Response('You are offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
