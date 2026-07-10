'use client';

import { useEffect, useState } from 'react';
import { saveDemographics } from '@/lib/actions/analytics';
import { AGE_OPTIONS } from '@/lib/analytics/labels';
import {
  getOrCreateSessionId,
  hasCompletedDemographics,
  markDemographicsCompleted,
} from '@/lib/analytics/session';
import { hasPreferencesConsent } from '@/lib/consent/cookie-consent';
import { useCookieBannerVisible } from '@/components/layout/CookieConsent';

export function DemographicsSurvey() {
  const cookieBannerVisible = useCookieBannerVisible();
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'child' | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleOpen = () => {
      if (timer) clearTimeout(timer);
      if (hasCompletedDemographics() || !hasPreferencesConsent()) {
        setOpen(false);
        return;
      }
      timer = setTimeout(() => setOpen(true), 4000);
    };

    scheduleOpen();
    window.addEventListener('garofalo:cookie-consent', scheduleOpen);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('garofalo:cookie-consent', scheduleOpen);
    };
  }, []);

  const dismiss = () => {
    markDemographicsCompleted();
    setOpen(false);
  };

  const submit = async () => {
    if (!gender || !ageRange) return;
    setSubmitting(true);
    setError(null);

    const sessionId = getOrCreateSessionId();
    const result = await saveDemographics(
      sessionId,
      gender,
      ageRange as (typeof AGE_OPTIONS)[number]['value']
    );

    setSubmitting(false);
    if (!result.ok) {
      setError('Impossibile salvare la risposta. Riprova tra poco.');
      return;
    }

    markDemographicsCompleted();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      data-demographics-survey
      data-cookie-offset={cookieBannerVisible ? 'true' : 'false'}
      className="demographics-survey fixed left-1/2 z-[110] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#111] p-5 shadow-2xl sm:right-6 sm:left-auto sm:translate-x-0"
      role="dialog"
      aria-label="Sondaggio visitatori"
    >
      <p className="font-display text-sm uppercase tracking-wide text-gold">
        Aiutaci a conoscerti
      </p>
      <p className="mt-1 text-xs text-white/50">
        Dati anonimi per migliorare l&apos;esperienza sul sito.
      </p>

      <div className="mt-4">
        <p className="text-xs font-medium text-white/70">Genere</p>
        <div className="mt-2 flex gap-2">
          {(
            [
              { value: 'male', label: 'Uomo' },
              { value: 'female', label: 'Donna' },
              { value: 'child', label: 'Bimbo' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                gender === value
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-white/70">Fascia d&apos;età</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {AGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAgeRange(value)}
              className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                ageRange === value
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-xs text-red-300">{error}</p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!gender || !ageRange || submitting}
          className="btn-primary flex-1 py-2 text-xs disabled:opacity-40"
        >
          Invia
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-4 py-2 text-xs text-white/40 transition hover:text-white/70"
        >
          Salta
        </button>
      </div>
    </div>
  );
}