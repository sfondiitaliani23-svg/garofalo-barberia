/** Rinnova l'iscrizione alle notifiche sul browser che ha la pagina aperta. */

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function saveCurrent(): Promise<'saved' | 'logged-out' | 'unsupported'> {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
  await navigator.serviceWorker.ready;
  const { publicKey } = await fetch('/api/push/key').then((r) => r.json());
  if (!publicKey) return 'unsupported';
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
  if (res.status === 401) return 'logged-out';
  if (!res.ok) return 'unsupported';
  try {
    const prev = localStorage.getItem('push-endpoint');
    if (prev && prev !== sub.endpoint) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: prev }),
      });
    }
    localStorage.setItem('push-endpoint', sub.endpoint);
  } catch {
    /* la nuova iscrizione è già salvata */
  }
  return 'saved';
}

function supported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Se il permesso c'è già, aggiorna l'iscrizione. Non chiede il permesso. */
export async function syncPushSubscription(): Promise<'saved' | 'off' | 'denied' | 'logged-out' | 'unsupported'> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  try {
    return await saveCurrent();
  } catch {
    return 'unsupported';
  }
}

export type PushUiState = 'unsupported' | 'ios-install' | 'off' | 'on' | 'denied';

/** Stato delle notifiche su questo telefono, senza chiedere il permesso. */
export async function readPushState(): Promise<PushUiState> {
  if (typeof window === 'undefined') return 'off';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const alone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!supported()) return ios && !alone ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

/** Spegne le notifiche solo su questo telefono. */
export async function disablePushOnDevice(): Promise<'off' | 'unsupported'> {
  if (!supported()) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      try {
        localStorage.removeItem('push-endpoint');
      } catch {
        /* l'iscrizione sul telefono è già tolta */
      }
    }
    return 'off';
  } catch {
    return 'unsupported';
  }
}

/** Dal clic di Avvisa: se manca il permesso lo chiede, poi salva questo browser. */
export async function enablePushFromClick(): Promise<'saved' | 'denied' | 'logged-out' | 'unsupported'> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    return await saveCurrent();
  } catch {
    return 'unsupported';
  }
}
