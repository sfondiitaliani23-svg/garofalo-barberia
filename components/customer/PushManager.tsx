'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type State = 'loading' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'denied';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Attiva/disattiva le notifiche sul telefono (promemoria appuntamenti, "è ora di tornare", novità).
 * variant "banner": riquadro compatto che compare solo se le notifiche non sono ancora attive.
 */
export function PushManager({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState(isIOS() && !standalone() ? 'ios-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return setState('denied');
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch {
        setState('off');
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/push/key').then((r) => r.json());
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error('save');
      setState('on');
      await fetch('/api/push/test', { method: 'POST' });
      toast.success('Notifiche attive. Ti abbiamo mandato una notifica di prova.');
    } catch {
      toast.error('Non è stato possibile attivare le notifiche su questo dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState('off');
      toast.success('Notifiche disattivate su questo dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'banner' && state !== 'off') return null;
  if (state === 'loading') return null;

  const text: Record<State, string> = {
    loading: '',
    unsupported: 'Questo browser non supporta le notifiche.',
    'ios-install': 'Su iPhone le notifiche funzionano dall’app: aggiungi il sito alla schermata Home (Condividi → Aggiungi alla schermata Home), poi aprilo dall’icona.',
    off: 'Ricevi sul telefono il promemoria del tuo appuntamento e le novità del salone. Gratis, le spegni quando vuoi.',
    on: 'Attive su questo dispositivo: promemoria appuntamenti e novità del salone.',
    denied: 'Le notifiche sono bloccate nelle impostazioni del browser. Riattivale da lì per riceverle.',
  };

  return (
    <section className={variant === 'banner' ? 'mb-6 rounded-xl border border-gold/35 bg-gold/[0.06] p-4' : 'mt-6 rounded-xl border border-white/10 bg-[#0e0e0e] p-5'} aria-labelledby="push-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
            {state === 'on' ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
          </span>
          <div>
            <h2 id="push-title" className="font-semibold text-white">
              Notifiche sul telefono
            </h2>
            <p className="mt-0.5 max-w-md text-sm text-white/65">{text[state]}</p>
          </div>
        </div>
        {state === 'off' && (
          <button type="button" onClick={enable} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden />} Attiva notifiche
          </button>
        )}
        {state === 'on' && (
          <button type="button" onClick={disable} disabled={busy} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 disabled:opacity-50">
            Disattiva
          </button>
        )}
      </div>
    </section>
  );
}
