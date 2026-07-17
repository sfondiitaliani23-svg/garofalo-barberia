'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasCookieConsentDecision, saveCookieConsent } from '@/lib/consent/cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [preferences, setPreferences] = useState(true);

  useEffect(() => {
    const sync = () => {
      setVisible(!hasCookieConsentDecision());
    };
    sync();
    window.addEventListener('garofalo:cookie-consent', sync);
    return () => window.removeEventListener('garofalo:cookie-consent', sync);
  }, []);

  const accept = (nextAnalytics: boolean, nextPreferences: boolean) => {
    saveCookieConsent(nextAnalytics, nextPreferences);
    setVisible(false);
    setCustomizeOpen(false);
  };

  if (!visible) return null;

  return (
    <div
      data-cookie-banner="visible"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#0d0d0d]/95 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Informativa cookie"
    >
      <div className="mx-auto w-full max-w-3xl">
        {!customizeOpen ? (
          <>
            <p className="text-sm font-medium text-white">Informativa sui cookie</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Utilizziamo cookie tecnici necessari al funzionamento del sito e, solo con il tuo
              consenso, cookie analitici e di preferenza per migliorare l&apos;esperienza e
              comprendere come viene utilizzato il sito. Puoi accettare tutti i cookie, rifiutare
              quelli opzionali o personalizzare le tue scelte.{' '}
              <Link href="/privacy" className="text-gold underline-offset-2 hover:underline">
                Leggi l&apos;informativa privacy
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => accept(true, true)}
                className="btn-primary w-full px-5 py-2.5 text-xs sm:w-auto"
              >
                Accetta tutti
              </button>
              <button
                type="button"
                onClick={() => accept(false, false)}
                className="btn-outline w-full px-5 py-2.5 text-xs sm:w-auto"
              >
                Solo necessari
              </button>
              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="rounded-full px-4 py-2.5 text-xs text-white/55 transition hover:text-white/80"
              >
                Personalizza
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white">Preferenze cookie</p>
            <p className="mt-1 text-xs text-white/55">
              Scegli quali categorie autorizzare. I cookie necessari sono sempre attivi.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#151515] p-3">
                <input type="checkbox" checked disabled className="mt-0.5 accent-gold" />
                <span>
                  <span className="block text-sm text-white">Necessari</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    Sessione, sicurezza e funzioni essenziali del sito.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#151515] p-3">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-0.5 accent-gold"
                />
                <span>
                  <span className="block text-sm text-white">Analitici</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    Statistiche anonime su visite e utilizzo del sito.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#151515] p-3">
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  className="mt-0.5 accent-gold"
                />
                <span>
                  <span className="block text-sm text-white">Preferenze</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    Salvataggio di scelte come il sondaggio visitatori.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => accept(analytics, preferences)}
                className="btn-primary w-full px-5 py-2.5 text-xs sm:w-auto"
              >
                Salva preferenze
              </button>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-full px-4 py-2.5 text-xs text-white/55 transition hover:text-white/80"
              >
                Indietro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function useCookieBannerVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!hasCookieConsentDecision());
    sync();

    window.addEventListener('garofalo:cookie-consent', sync);
    return () => window.removeEventListener('garofalo:cookie-consent', sync);
  }, []);

  return visible;
}