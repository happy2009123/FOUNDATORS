const CACHE_NAME = 'foundators-v6';
const PRECACHE = ['/', '/home', '/discover', '/messages', '/login', '/copilot', '/voice', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      PrecacheSafely(c)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// precache each URL individually so a single failed asset doesn't abort the rest
async function PrecacheSafely(c) {
  const results = await Promise.allSettled(PRECACHE.map((u) => c.add(u)));
  return results;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Skip auth API-like paths that should always hit the network
  if (url.pathname.startsWith('/__nextjs')) return;

  // ── Page navigations: NETWORK FIRST ──────────────────────
  // HTML must always reflect the latest deploy. Phones visit often
  // and previously got whatever was cached first (stale shell, old
  // nav entries, broken deep links) — this guarantees new routes
  // like /voice work immediately after a push. The cache is only a
  // fallback when the device is genuinely offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Static assets (JS/CSS/images): stale-while-revalidate ──
  // Hashed bundles never change, so cache-first is safe and fast.
  e.respondWith(
    caches.match(request).then((cached) => {
      const networkPromise = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkPromise;
    })
  );
});
