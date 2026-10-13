// Service worker leggero di Barberia Garofalo.
// Non mette in cache le pagine: il sito resta sempre aggiornato.
// Serve solo a mostrare /offline.html quando manca la connessione.
const CACHE = 'garofalo-offline-v1';
const PRECACHE = ['/offline.html', '/pwa/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;
  event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
});
