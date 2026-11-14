'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { applyLook, readLook, type Look } from '@/lib/look';
import { disablePushOnDevice, enablePushFromClick, readPushState, type PushUiState } from '@/lib/push-client';
import { createClient } from '@/lib/supabase/client';
import { LanguageSwitch } from '@/components/i18n/LanguageSwitch';

/**
 * Impostazioni dell'app: notifiche di questo telefono e scelta tra versione nera e versione oro.
 */
export function AppSettings() {
  const lang = useLang();
  const [look, setLook] = useState<Look>('black');
  const [push, setPush] = useState<PushUiState | 'loading'>('loading');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLook(readLook());
    readPushState().then(setPush);
    const supabase = createClient();
    if (!supabase) {
      setLoggedIn(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(Boolean(session?.user)));
  }, []);

  // 14/11/2026: tornando dalle impostazioni del telefono si rilegge lo stato; se il permesso ora c'è, si accendono da sole.
  useEffect(() => {
    const ricontrolla = async () => {
      if (document.visibilityState !== 'visible') return;
      const prima = await readPushState();
      if (prima === 'off' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const r = await enablePushFromClick();
        setPush(r === 'saved' ? 'on' : await readPushState());
        return;
      }
      setPush(prima);
    };
    document.addEventListener('visibilitychange', ricontrolla);
    return () => document.removeEventListener('visibilitychange', ricontrolla);
  }, []);

  /** Come riaccenderle dalle impostazioni del telefono: il sito non può aprirle da solo. */
  function passiTelefono() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    toast.message(L(lang, 'Accendile dalle impostazioni del telefono', 'Turn them on in the phone settings'), {
      duration: 12000,
      description: ios
        ? L(lang, 'Impostazioni → Notifiche → Garofalo → Consenti notifiche. Poi torna qui: si accendono da sole.', 'Settings → Notifications → Garofalo → Allow Notifications. Then come back: they turn on by themselves.')
        : L(lang, 'Tieni premuta l’icona dell’app → Info app → Notifiche → Attiva. Oppure nel browser: lucchetto accanto all’indirizzo → Notifiche → Consenti. Poi torna qui: si accendono da sole.', 'Long-press the app icon → App info → Notifications → On. Or in the browser: padlock next to the address → Notifications → Allow. Then come back: they turn on by themselves.'),
    });
  }

  function choose(next: Look) {
    setLook(next);
    applyLook(next);
    try {
      navigator.vibrate?.(8);
    } catch {
      /* vibrazione non disponibile */
    }
  }

  async function togglePush() {
    if (push === 'on') {
      setBusy(true);
      const result = await disablePushOnDevice();
      setBusy(false);
      if (result === 'off') {
        setPush('off');
        toast.success(L(lang, 'Notifiche spente su questo telefono.', 'Notifications are off on this phone.'));
      } else {
        toast.error(L(lang, 'Non sono riuscito a spegnerle. Riprova.', 'Could not turn them off. Try again.'));
      }
      return;
    }
    if (push === 'denied') {
      passiTelefono();
      return;
    }
    setBusy(true);
    const result = await enablePushFromClick();
    setBusy(false);
    if (result === 'saved') {
      setPush('on');
      let endpoint = '';
      try {
        endpoint = localStorage.getItem('push-endpoint') || '';
      } catch {
        endpoint = '';
      }
      await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) });
      toast.success(L(lang, 'Notifiche accese. Ti ho mandato una prova.', 'Notifications are on. I sent you a test.'));
    } else if (result === 'denied') {
      setPush(await readPushState());
      if (Notification.permission === 'denied') passiTelefono();
    } else {
      toast.error(L(lang, 'Questo telefono non ha accettato le notifiche.', 'This phone did not accept notifications.'));
    }
  }

  const pushOn = push === 'on';
  const note =
    push === 'denied'
      ? L(lang, 'Le notifiche sono bloccate dal telefono. Tocca l’interruttore: ti dico dove riattivarle. Quando torni qui si accendono da sole.', 'Notifications are blocked by the phone. Tap the switch: I’ll tell you where to turn them back on. When you come back they turn on by themselves.')
      : push === 'ios-install'
        ? L(lang, 'Su iPhone le notifiche funzionano dall’app: aggiungi il sito alla schermata Home e aprilo dall’icona.', 'On iPhone, notifications work from the app: add the site to your Home Screen and open it from the icon.')
        : push === 'unsupported'
          ? L(lang, 'Questo telefono non può ricevere le notifiche del sito.', 'This phone cannot receive notifications from the site.')
          : loggedIn === false
            ? L(lang, 'Novità e avvisi del salone. Con l’account ricevi anche i promemoria del taglio.', 'Shop news and alerts. With an account you also get appointment reminders.')
            : L(lang, 'Promemoria del taglio e storie del salone. Le spegni quando vuoi.', 'Appointment reminders and shop stories. Turn them off whenever you like.');

  return (
    <section className="app-settings">
      <h1>{L(lang, 'Impostazioni', 'Settings')}</h1>
      <p className="app-settings-lead">
        {L(lang, 'Qui scegli la lingua, gli avvisi di questo telefono e il colore dell’app.', 'Choose the language, the alerts for this phone and the colour of the app.')}
      </p>

      <div className="app-settings-block">
        <p className="app-settings-label">{L(lang, 'Lingua', 'Language')}</p>
        <div className="app-settings-row">
          <div>
            <h2>{L(lang, 'Lingua dell’app', 'App language')}</h2>
            <p>{L(lang, 'Italiano · English. Cambia tutte le pagine.', 'Italiano · English. Changes every page.')}</p>
          </div>
          <LanguageSwitch className="text-sm font-bold tracking-[0.2em]" />
        </div>
      </div>

      <div className="app-settings-block">
        <p className="app-settings-label">{L(lang, 'Notifiche', 'Notifications')}</p>
        <div className="app-settings-row">
          <div>
            <h2>{L(lang, 'Avvisi sul telefono', 'Phone alerts')}</h2>
            <p>{pushOn ? L(lang, 'Accese su questo telefono.', 'On for this phone.') : L(lang, 'Spente su questo telefono.', 'Off for this phone.')}</p>
          </div>
          <button
            type="button"
            className="app-switch"
            role="switch"
            aria-checked={pushOn}
            aria-label={L(lang, 'Notifiche sul telefono', 'Phone notifications')}
            disabled={busy || push === 'loading' || push === 'unsupported' || push === 'ios-install'}
            onClick={togglePush}
          >
            <i />
          </button>
        </div>
        <p className="app-settings-note">
          {note}{' '}
          {loggedIn === false && push !== 'denied' && push !== 'unsupported' && (
            <Link href="/login">{L(lang, 'Accedi', 'Sign in')}</Link>
          )}
        </p>
      </div>

      <div className="app-settings-block">
        <p className="app-settings-label">{L(lang, 'Aspetto', 'Appearance')}</p>
        {/* 14/11/2026: interruttore 3D (spunto: @code_x_sg, «Premium 3D Light/Dark Toggle»), rifatto in nero e oro Garofalo. */}
        <button
          type="button"
          role="switch"
          aria-checked={look === 'gold'}
          aria-label={L(lang, 'Colore dell’app: oro', 'App colour: gold')}
          className={`app-toggle3d${look === 'gold' ? ' is-gold' : ''}`}
          onClick={() => choose(look === 'gold' ? 'black' : 'gold')}
        >
          <span className="app-toggle3d__track">
            <span className="app-toggle3d__label app-toggle3d__label--nero" aria-hidden>{L(lang, 'Nero', 'Black')}</span>
            <span className="app-toggle3d__label app-toggle3d__label--oro" aria-hidden>{L(lang, 'Oro', 'Gold')}</span>
            <span className="app-toggle3d__knob" aria-hidden />
          </span>
        </button>
        <p className="app-settings-note">
          {L(lang, 'Il sito usa solo questi due colori. La scelta resta su questo telefono.', 'The site uses only these two colours. The choice stays on this phone.')}
        </p>
      </div>
    </section>
  );
}
