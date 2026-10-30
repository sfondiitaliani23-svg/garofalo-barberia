// Service worker leggero di Barberia Garofalo.
// Non mette in cache le pagine: il sito resta sempre aggiornato.
// Serve solo a mostrare /offline.html quando manca la connessione.
const CACHE = 'garofalo-offline-v2';
const PRECACHE = ['/offline.html', '/pwa/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
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
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch (e) {
        data = { title: 'Barberia Garofalo', body: 'C’è una novità sul sito.' };
      }
      const note = data.notification || {};
      const title = note.title || data.title || 'Barberia Garofalo';
      const body = note.body || data.body || 'Apri il sito per vederla.';
      const tag = note.tag || data.tag || 'garofalo';
      const options = {
        body,
        icon: '/pwa/icon-192.png',
        tag,
        data: { url: data.url || note.navigate || '/' },
      };
      try {
        await self.registration.showNotification(title, {
          ...options,
          badge: '/pwa/badge.png',
          renotify: true,
          requireInteraction: true,
        });
      } catch (e) {
        try {
          await self.registration.showNotification(title, options);
        } catch (e2) {
          await self.registration.showNotification(title, { body, data: options.data });
        }
      }
    })()
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
