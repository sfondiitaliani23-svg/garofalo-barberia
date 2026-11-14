'use client';

import { useEffect } from 'react';
import { useAdminSaveState } from '@/components/admin/AdminSaveContext';

const MINE = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
const KEY = 'garofalo-build-reloaded';
const EVERY_MS = 30_000;

function busy(dirty: boolean) {
  if (dirty) return true;
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return true;
  // Finestra aperta (nuova prenotazione, modifica cliente...): non si ricarica.
  return !!document.querySelector('[role="dialog"], [aria-modal="true"]');
}

/**
 * Quando esce una versione nuova del sito, la scheda aperta si ricarica da sola.
 * Non lo fa mentre scrivi, mentre c'è una finestra aperta o ci sono modifiche da salvare.
 * 14/11/2026: vale per tutto il sito (sito pubblico, area cliente, app). Nella parte admin c'è già
 * l'istanza dentro AdminProtectedShell, che conosce le modifiche da salvare: quella del layout principale la salta.
 */
export function AutoRefreshOnUpdate({ fuoriAdmin = false }: { fuoriAdmin?: boolean } = {}) {
  const { isDirty } = useAdminSaveState();

  useEffect(() => {
    if (MINE === 'dev') return;
    let stopped = false;

    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      if (fuoriAdmin && window.location.pathname.startsWith('/admin')) return;
      try {
        const res = await fetch('/api/build-id', { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        if (!id || id === 'dev' || id === MINE) return;
        if (busy(isDirty)) return;
        // Una sola volta per versione: niente giri a vuoto se qualcosa non torna.
        if (sessionStorage.getItem(KEY) === id) return;
        sessionStorage.setItem(KEY, id);
        window.location.reload();
      } catch {
        /* offline o errore di rete: riprova al prossimo giro */
      }
    };

    const timer = window.setInterval(check, EVERY_MS);
    const onVisible = () => void check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isDirty, fuoriAdmin]);

  return null;
}
