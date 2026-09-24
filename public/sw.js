const CACHE_NAME = 'foundators-v3';
const PRECACHE = ['/', '/home', '/discover', '/messages', '/login', '/icon.svg'];

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
    )
  );
  self.clients.claim();
});

// precache each URL individually so a single failed asset doesn't abort the rest
async function PrecacheSafely(c) {
  const results = await Promise.allSettled(PRECACHE.map((u) => c.add(u)));
  return results;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Only handle same-origin (app) requests — never cache cross-origin
  // (avatars, fonts, Firebase API calls) so the SW doesn't slow those down.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Skip auth API-like paths that should always hit the network
  if (url.pathname.startsWith('/__nextjs')) return;

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
        .catch(() => cached || caches.match('/'));

      // Stale-while-revalidate: resolve immediately with the cache (if any),
      // then update it in the background. No network wait on repeat visits.
      return cached || networkPromise;
    })
  );
});