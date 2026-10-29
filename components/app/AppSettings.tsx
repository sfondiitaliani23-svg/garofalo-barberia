'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { applyLook, readLook, type Look } from '@/lib/look';
import { disablePushOnDevice, enablePushFromClick, readPushState, type PushUiState } from '@/lib/push-client';
import { createClient } from '@/lib/supabase/client';

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
    if (!loggedIn) {
      toast.error(L(lang, 'Entra nell’account per accendere le notifiche.', 'Sign in to turn notifications on.'));
      return;
    }
    setBusy(true);
    const result = await enablePushFromClick();
    setBusy(false);
    if (result === 'saved') {
      setPush('on');
      await fetch('/api/push/test', { method: 'POST' });
      toast.success(L(lang, 'Notifiche accese. Ti ho mandato una prova.', 'Notifications are on. I sent you a test.'));
    } else if (result === 'denied') {
      setPush('denied');
    } else if (result === 'logged-out') {
      setLoggedIn(false);
      toast.error(L(lang, 'Entra nell’account per accendere le notifiche.', 'Sign in to turn notifications on.'));
    } else {
      toast.error(L(lang, 'Questo telefono non ha accettato le notifiche.', 'This phone did not accept notifications.'));
    }
  }

  const pushOn = push === 'on';
  const note =
    push === 'denied'
      ? L(lang, 'Le notifiche sono bloccate dal telefono. Riattivale dalle impostazioni di iPhone o Android, poi torna qui.', 'Notifications are blocked by the phone. Turn them back on in the iPhone or Android settings, then come back here.')
      : push === 'ios-install'
        ? L(lang, 'Su iPhone le notifiche funzionano dall’app: aggiungi il sito alla schermata Home e aprilo dall’icona.', 'On iPhone, notifications work from the app: add the site to your Home Screen and open it from the icon.')
        : push === 'unsupported'
          ? L(lang, 'Questo telefono non può ricevere le notifiche del sito.', 'This phone cannot receive notifications from the site.')
          : loggedIn === false
            ? L(lang, 'Entra nell’account per accenderle su questo telefono.', 'Sign in to turn them on for this phone.')
            : L(lang, 'Promemoria del taglio e storie del salone. Le spegni quando vuoi.', 'Appointment reminders and shop stories. Turn them off whenever you like.');

  return (
    <section className="app-settings">
      <h1>{L(lang, 'Impostazioni', 'Settings')}</h1>
      <p className="app-settings-lead">
        {L(lang, 'Qui decidi gli avvisi di questo telefono e il colore dell’app.', 'Choose the alerts for this phone and the colour of the app.')}
      </p>

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
            disabled={busy || push === 'loading' || push === 'denied' || push === 'unsupported' || push === 'ios-install'}
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
        <div className="app-looks" role="radiogroup" aria-label={L(lang, 'Colore dell’app', 'App colour')}>
          <button type="button" role="radio" aria-checked={look === 'black'} className={`app-look${look === 'black' ? ' is-on' : ''}`} onClick={() => choose('black')}>
            <span className="app-look-face app-look-face--black">Garofalo</span>
            <span>{L(lang, 'Nero', 'Black')}</span>
          </button>
          <button type="button" role="radio" aria-checked={look === 'gold'} className={`app-look${look === 'gold' ? ' is-on' : ''}`} onClick={() => choose('gold')}>
            <span className="app-look-face app-look-face--gold">Garofalo</span>
            <span>{L(lang, 'Oro', 'Gold')}</span>
          </button>
        </div>
        <p className="app-settings-note">
          {L(lang, 'Il sito usa solo questi due colori. La scelta resta su questo telefono.', 'The site uses only these two colours. The choice stays on this phone.')}
        </p>
      </div>
    </section>
  );
}
