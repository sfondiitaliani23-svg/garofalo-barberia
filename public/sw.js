// Service worker leggero di Barberia Garofalo.
// Non mette in cache le pagine: il sito resta sempre aggiornato.
// Serve solo a mostrare /offline.html quando manca la connessione.
const CACHE = 'garofalo-offline-v2';
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

// Notifiche sul telefono (promemoria, novità). Il tocco apre la pagina indicata.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Barberia Garofalo', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Barberia Garofalo';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/' },
      vibrate: [60, 40, 60],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
