// Service worker leggero di Barberia Garofalo.
// Non mette in cache le pagine: il sito resta sempre aggiornato.
// Serve solo a mostrare /offline.html quando manca la connessione.
const CACHE = 'garofalo-offline-v4';
// Avvio istantaneo dell'app (03/11/2026): la pagina d'avvio e la schermata d'ingresso stanno nel telefono.
const AVVIO = ['/app.html', '/css/benvenuto.css?v=20261103h', '/js/benvenuto.js?v=20261103h', '/js/benvenuto-garofalo.js?v=20261103h', '/assets/app/ingresso-poster.jpg?v=3'];
const PRECACHE = ['/offline.html', '/pwa/icon-192.png', ...AVVIO];

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

// Prima dalla memoria del telefono (subito), intanto si aggiorna dalla rete per la volta dopo.
function veloce(event, chiave) {
  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(chiave).then((salvata) => {
        const rete = fetch(chiave, { cache: 'no-store' }).then((r) => { if (r.ok) c.put(chiave, r.clone()); return r; });
        if (salvata) { event.waitUntil(rete.catch(() => {})); return salvata; }
        return rete.catch(() => caches.match('/offline.html'));
      })
    )
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    // Apertura dell'app (start_url «/?app=1») o pagina d'avvio: risposta istantanea
    if (req.mode === 'navigate' && ((u.pathname === '/' && u.searchParams.get('app') === '1') || u.pathname === '/app.html')) { veloce(event, '/app.html'); return; }
    if (AVVIO.includes(u.pathname + u.search) && u.pathname !== '/app.html') { veloce(event, u.pathname + u.search); return; }
  }
  if (req.mode !== 'navigate') return;
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
          badge: '/pwa/badge-v2.png',
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
