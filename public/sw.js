const CACHE_NAME = 'foundators-v7';
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

function offlinePage() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body style="margin:0;background:#0a0a0c;color:#fff;font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h1 style="font-size:20px;margin:0 0 8px">You are offline</h1><p style="color:#a1a1aa;font-size:14px;margin:0">Check your connection and try again.</p></div></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function assetError() {
  return new Response('', { status: 504, statusText: 'Gateway Timeout' });
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
  // Every branch must resolve to a Response: responding with
  // undefined/rejected promises crashes the SW fetch handler.
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
        .catch(async () => {
          try {
            const cached = (await caches.match(request)) || (await caches.match('/'));
            return cached || offlinePage();
          } catch (err) {
            return offlinePage();
          }
        })
    );
    return;
  }

  // ── Static assets (JS/CSS/images): stale-while-revalidate ──
  // Hashed bundles never change, so cache-first is safe and fast.
  e.respondWith(
    caches
      .match(request)
      .then((cached) => {
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || assetError());

        return cached || networkPromise;
      })
      .catch(() => assetError())
  );
});
