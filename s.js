// OKAGIA Service Worker v2.0
const CACHE_NAME   = 'okagia-v2';
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>OKAGIA – Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:sans-serif;background:#0f172a;color:#fff;min-height:100vh;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         padding:2rem;text-align:center}
    .icon{font-size:4rem;margin-bottom:1rem}
    h1{font-size:2rem;color:#10b981;margin-bottom:.5rem}
    p{color:#94a3b8;margin:.4rem 0}
    button{margin-top:1.5rem;background:#10b981;color:#fff;border:none;
           padding:.75rem 2rem;border-radius:999px;font-size:1rem;cursor:pointer;
           font-weight:700}
  </style>
</head>
<body>
  <div class="icon">🏍️</div>
  <h1>OKAGIA</h1>
  <p>You are currently <strong>offline</strong>.</p>
  <p>Check your internet connection and try again.</p>
  <button onclick="location.reload()">↺ Retry</button>
</body>
</html>`;

// Shell files to pre-cache on install
const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// ── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache API calls — always go to network, fallback to JSON error
  if (url.includes('script.google.com') || url.includes('googleapis.com')) {
    return e.respondWith(
      fetch(e.request).catch(() =>
        new Response(
          JSON.stringify({ status: 'error', message: 'You are offline. check your internet connection' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
  }

  // For everything else: try network first, fall back to cache, then offline page
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.destination === 'document') {
          return new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html' } });
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
