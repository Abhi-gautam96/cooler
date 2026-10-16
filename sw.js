const CACHE_NAME = 'cooler-pwa-v6';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept direct HTTP calls to the ESP-12F (192.168.4.1, router IP, or cooler.local)
  if (url.origin !== self.location.origin && !url.href.includes('cdn.jsdelivr.net')) {
    return;
  }

  const isNav = (e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

  e.respondWith(
    caches.match(isNav ? './index.html' : e.request, { ignoreSearch: true }).then(cached => {
      const netFetch = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => {
            c.put(isNav ? './index.html' : e.request, clone);
          });
        }
        return res;
      }).catch(() => cached);

      // Cache-First so GitHub PWA launches immediately when offline on ESP Hotspot
      return cached || netFetch;
    })
  );
});
