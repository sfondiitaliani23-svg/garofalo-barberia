'use client';

import { useEffect } from 'react';

/** Ogni minuto, mentre la scheda è aperta e visibile, segnala che l'utente collegato è sul sito. */
export function PresencePing() {
  useEffect(() => {
    const loggedIn = () => /sb-[^=]+-auth-token/.test(document.cookie);
    let last = 0;
    const ping = () => {
      if (document.visibilityState !== 'visible' || !loggedIn()) return;
      if (Date.now() - last < 45_000) return;
      last = Date.now();
      void fetch('/api/presence', { method: 'POST', keepalive: true }).catch(() => {});
    };
    ping();
    const id = window.setInterval(ping, 60_000);
    const onVis = () => ping();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}
