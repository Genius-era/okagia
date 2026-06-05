// OKAGIA Service Worker v3.0
const CACHE = 'okagia-v3';
const SHELL = ['/index.html', '/manifest.json'];

const OFFLINE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OKAGIA – Offline</title>
<style>
  body{font-family:sans-serif;background:#0f172a;color:#fff;min-height:100vh;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       padding:2rem;text-align:center;margin:0}
  h1{color:#10b981;font-size:2rem;margin-bottom:.5rem}
  p{color:#94a3b8;margin:.3rem 0}
  button{margin-top:1.5rem;background:#10b981;color:#fff;border:none;
         padding:.75rem 2rem;border-radius:999px;font-size:1rem;cursor:pointer;font-weight:700}
</style></head>
<body>
  <div style="font-size:4rem">🏍️</div>
  <h1>OKAGIA</h1>
  <p>You are <strong>offline</strong>.</p>
  <p>Check your internet connection.</p>
  <button onclick="location.reload()">↺ Retry</button>
</body></html>`;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .catch(() => {})   // Don't block install if CDN assets fail
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept API calls — always live
  if (url.includes('script.google.com') || url.includes('googleapis.com') ||
      url.includes('telegram.org')) {
    return e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ status:'error', message:'You are offline.' }),
          { headers: { 'Content-Type':'application/json' } })
      )
    );
  }

  // For everything else: network first, cache fallback, offline page last
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.destination === 'document')
          return new Response(OFFLINE, { headers: { 'Content-Type':'text/html' } });
        return new Response('Offline', { status: 503 });
      })
  );
});
