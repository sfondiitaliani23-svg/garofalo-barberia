'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { isStandalone } from '@/lib/utils/install-app';

const MINE = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

/**
 * Voce del menu "Aggiorna app": compare solo dentro l'app installata (dove "Installa App" sparisce).
 * Controlla /api/build-id: se c'è una versione nuova aggiorna il service worker e ricarica, altrimenti lo dice.
 * Allineata a Maximize e Maurizio Barber Shop (01/11/2026).
 */
export function UpdateAppButton({ className = '', label }: { className?: string; label?: string }) {
  const lang = useLang();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setShow(isStandalone());
  }, []);

  if (!show) return null;

  const run = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/build-id', { cache: 'no-store' });
      const { id } = res.ok ? ((await res.json()) as { id?: string }) : { id: undefined };
      if (!id) {
        setMsg(L(lang, 'Nessuna connessione. Riprova tra poco.', 'No connection. Try again shortly.'));
        return;
      }
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
      } catch {
        /* senza service worker si ricarica e basta */
      }
      if (id === MINE || id === 'dev') {
        setMsg(L(lang, 'Hai già l’ultima versione.', 'You already have the latest version.'));
        return;
      }
      setMsg(L(lang, 'Aggiornamento in corso…', 'Updating…'));
      const url = new URL(window.location.href);
      url.searchParams.set('v', id.slice(0, 7));
      window.location.replace(url.toString());
    } catch {
      setMsg(L(lang, 'Nessuna connessione. Riprova tra poco.', 'No connection. Try again shortly.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" data-evt="aggiorna_app" className={className} onClick={run} aria-busy={busy}>
      <RefreshCw size={16} aria-hidden className={busy ? 'animate-spin' : ''} />
      <span className="flex flex-col">
        <span>{label ?? L(lang, 'Aggiorna app', 'Update app')}</span>
        {msg && (
          <span role="status" aria-live="polite" className="mt-1 text-[11px] font-normal normal-case tracking-normal text-white/60">
            {msg}
          </span>
        )}
      </span>
    </button>
  );
}
