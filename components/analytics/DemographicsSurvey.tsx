'use client';

import { useEffect, useState } from 'react';
import { saveDemographics } from '@/lib/actions/analytics';
import { AGE_OPTIONS } from '@/lib/analytics/labels';
import {
  getOrCreateSessionId,
  hasCompletedDemographics,
  markDemographicsCompleted,
} from '@/lib/analytics/session';

export function DemographicsSurvey() {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasCompletedDemographics()) return;

    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    markDemographicsCompleted();
    setOpen(false);
  };

  const submit = async () => {
    if (!gender || !ageRange) return;
    setSubmitting(true);

    const sessionId = getOrCreateSessionId();
    await saveDemographics(
      sessionId,
      gender,
      ageRange as (typeof AGE_OPTIONS)[number]['value']
    );

    markDemographicsCompleted();
    setOpen(false);
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-40 w-[min(100vw-2rem,22rem)] rounded-xl border border-white/10 bg-[#111] p-5 shadow-2xl"
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