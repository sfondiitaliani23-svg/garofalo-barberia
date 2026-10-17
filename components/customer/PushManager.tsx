'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

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
export function PushManager({ variant = 'card' }: { variant?: 'card' | 'banner' | 'popup' }) {
  const lang = useLang();
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem('push-popup-no') ?? 0);
      setHidden(Date.now() - t < 7 * 864e5);
    } catch {
      setHidden(false);
    }
  }, []);

  function later() {
    try {
      localStorage.setItem('push-popup-no', String(Date.now()));
    } catch {
      /* niente memoria: pazienza */
    }
    setHidden(true);
  }

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
      setHidden(true);
      await fetch('/api/push/test', { method: 'POST' });
      toast.success(L(lang, 'Notifiche attive. Ti abbiamo mandato una notifica di prova.', 'Notifications are on. We have sent you a test notification.'));
    } catch {
      toast.error(L(lang, 'Non è stato possibile attivare le notifiche su questo dispositivo.', 'We could not turn on notifications on this device.'));
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
      toast.success(L(lang, 'Notifiche disattivate su questo dispositivo.', 'Notifications turned off on this device.'));
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'banner' && state !== 'off') return null;
  if (state === 'loading') return null;
  if (variant === 'popup' && (hidden || (state !== 'off' && state !== 'ios-install'))) return null;

  const text: Record<State, string> = {
    loading: '',
    unsupported: L(lang, 'Questo browser non supporta le notifiche.', 'This browser does not support notifications.'),
    'ios-install': L(lang, 'Su iPhone le notifiche funzionano dall’app: aggiungi il sito alla schermata Home (Condividi → Aggiungi alla schermata Home), poi aprilo dall’icona.', 'On iPhone, notifications work from the app: add the site to your Home Screen (Share → Add to Home Screen), then open it from the icon.'),
    off: L(lang, 'Ricevi sul telefono il promemoria del tuo appuntamento e le novità del salone. Gratis, le spegni quando vuoi.', 'Get your appointment reminder and news from the barbershop on your phone. Free, and you can turn it off whenever you like.'),
    on: L(lang, 'Attive su questo dispositivo: promemoria appuntamenti e novità del salone.', 'On for this device: appointment reminders and news from the barbershop.'),
    denied: L(lang, 'Le notifiche sono bloccate nelle impostazioni del browser. Riattivale da lì per riceverle.', 'Notifications are blocked in your browser settings. Turn them back on there to receive them.'),
  };

  if (variant === 'popup') {
    return (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="push-pop-title">
        <div className="w-full max-w-sm border border-gold/40 bg-[#0e0e0e] p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center bg-gold/10 text-gold">
            <Bell size={24} aria-hidden />
          </span>
          <h2 id="push-pop-title" className="mt-4 font-display text-xl text-white">
            {L(lang, 'Non perdere il tuo appuntamento', 'Never miss your appointment')}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {state === 'ios-install'
              ? text['ios-install']
              : L(lang, 'Attiva le notifiche: ti avvisiamo prima del taglio e quando si libera un posto. Gratis, le spegni quando vuoi. Ti arrivano anche a telefono spento o fuori dal sito.', 'Turn on notifications: we remind you before your cut and tell you when a slot opens. Free, and you can turn them off anytime. They reach you even when your phone is off or away from the site.')}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {state === 'off' && (
              <button type="button" onClick={enable} disabled={busy} className="inline-flex items-center justify-center gap-2 bg-gold px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />} {L(lang, 'Attiva notifiche', 'Turn on notifications')}
              </button>
            )}
            <button type="button" onClick={later} className="px-5 py-2 text-sm text-white/60">
              {state === 'ios-install' ? L(lang, 'Ho capito', 'Got it') : L(lang, 'Non ora', 'Not now')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={variant === 'banner' ? 'mb-6 rounded-xl border border-gold/35 bg-gold/[0.06] p-4' : 'mt-6 rounded-xl border border-white/10 bg-[#0e0e0e] p-5'} aria-labelledby="push-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
            {state === 'on' ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
          </span>
          <div>
            <h2 id="push-title" className="font-semibold text-white">
              {L(lang, 'Notifiche sul telefono', 'Phone notifications')}
            </h2>
            <p className="mt-0.5 max-w-md text-sm text-white/65">{text[state]}</p>
          </div>
        </div>
        {state === 'off' && (
          <button type="button" onClick={enable} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden />} {L(lang, 'Attiva notifiche', 'Turn on notifications')}
          </button>
        )}
        {state === 'on' && (
          <button type="button" onClick={disable} disabled={busy} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 disabled:opacity-50">
            {L(lang, 'Disattiva', 'Turn off')}
          </button>
        )}
      </div>
    </section>
  );
}
