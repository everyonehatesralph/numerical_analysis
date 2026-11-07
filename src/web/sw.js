/* Offline support for the hosted copy. The page itself comes from the network when there is
   one, so a new deploy shows on the next open, and from this cache when offline or on a very
   slow connection. Icons and the manifest come from the cache, refreshed in the background. */
const CACHE = 'nmr-__BUILD_ID__';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png', './favicon-32-dark.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's own HTTP cache, so a new deploy never stores an old page
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // the page: network first; the saved copy when offline, or after 4 s on a bad connection
    e.respondWith(caches.open(CACHE).then((cache) => {
      const net = fetch(req).then((res) => { if (res.ok) cache.put('./', res.clone()); return res; });
      const slow = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
      return Promise.race([net.catch(() => null), slow])
        .then((res) => res || cache.match('./').then((hit) => hit || net));
    }));
    return;
  }
  // everything else: the saved copy at once, a fresh one fetched in the background
  e.respondWith(caches.open(CACHE).then((cache) => cache.match(req, { ignoreSearch: true }).then((hit) => {
    const fresh = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || cache.match('./'));
    return hit || fresh;
  })));
});
