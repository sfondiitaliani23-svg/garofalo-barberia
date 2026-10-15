'use client';

import { useEffect, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { cookieText } from '@/lib/i18n/content-widgets';
import { hasCookieConsentDecision, saveCookieConsent } from '@/lib/consent/cookie-consent';

export function CookieConsent() {
  const t = cookieText(useLang());
  // Visibile già nell'HTML del server: se c'è già una scelta, la nasconde subito il CSS
  // (classe html.has-consent impostata prima del disegno), poi l'effetto sotto la toglie.
  const [visible, setVisible] = useState(true);
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
      aria-label={t.ariaLabel}
    >
      <div className="mx-auto w-full max-w-3xl">
        {!customizeOpen ? (
          <>
            <p className="text-sm font-medium text-white">{t.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              {t.intro}{' '}
              <Link href="/privacy" className="text-gold underline underline-offset-2">
                {t.privacy}
              </Link>
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => accept(true, true)}
                className="btn-primary w-full px-5 py-2.5 text-xs sm:w-auto"
              >
                {t.acceptAll}
              </button>
              <button
                type="button"
                onClick={() => accept(false, false)}
                className="btn-outline w-full px-5 py-2.5 text-xs sm:w-auto"
              >
                {t.necessaryOnly}
              </button>
              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="rounded-full px-4 py-2.5 text-xs text-white/55 transition hover:text-white/80"
              >
                {t.customize}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white">{t.prefsTitle}</p>
            <p className="mt-1 text-xs text-white/55">
              {t.prefsIntro}
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#151515] p-3">
                <input type="checkbox" checked disabled className="mt-0.5 accent-gold" />
                <span>
                  <span className="block text-sm text-white">{t.necessary}</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {t.necessaryDesc}
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
                  <span className="block text-sm text-white">{t.analytics}</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {t.analyticsDesc}
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
                  <span className="block text-sm text-white">{t.preferences}</span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {t.preferencesDesc}
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
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-full px-4 py-2.5 text-xs text-white/55 transition hover:text-white/80"
              >
                {t.back}
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