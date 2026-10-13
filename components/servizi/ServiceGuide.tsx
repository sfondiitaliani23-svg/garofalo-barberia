'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';
import './service-guide.css';

type GuideService = { id: string; name: string; category: ServiceCategory; price_cents: number; duration_minutes: number };

type Who = 'adulto' | 'ragazzo' | 'bimbo';
type What = 'taglio' | 'taglio-barba' | 'barba' | 'piega';
type Beard = 'lama' | 'forbici' | 'panno';

type Option<T> = { value: T; label: string; hint?: string };

const WHO: Option<Who>[] = [
  { value: 'adulto', label: 'Per me', hint: 'Uomo adulto' },
  { value: 'ragazzo', label: 'Per un ragazzo', hint: 'Dai 12 anni circa' },
  { value: 'bimbo', label: 'Per un bambino', hint: 'Anche primo taglio' },
];
const WHAT: Option<What>[] = [
  { value: 'taglio', label: 'Solo capelli', hint: 'Taglio con shampoo' },
  { value: 'taglio-barba', label: 'Capelli e barba', hint: 'Tutto in un appuntamento' },
  { value: 'barba', label: 'Solo barba', hint: 'Rasatura o modellatura' },
  { value: 'piega', label: 'Solo piega', hint: 'Shampoo e acconciatura' },
];
const BEARD: Option<Beard>[] = [
  { value: 'lama', label: 'Rasata e pulita', hint: 'Con la lama' },
  { value: 'forbici', label: 'Corta e definita', hint: 'Modellata a forbici' },
  { value: 'panno', label: 'Con un momento di relax', hint: 'Panno caldo' },
];

const euro = (c: number) => `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

function pickBeard(services: GuideService[], beard: Beard) {
  const barba = services.filter((s) => s.category === 'barba');
  const key = beard === 'lama' ? /lama|rasat/i : beard === 'forbici' ? /forbic/i : /panno|caldo/i;
  return barba.find((s) => key.test(s.name)) ?? barba[0];
}

export function ServiceGuide({ services }: { services: GuideService[] }) {
  const [who, setWho] = useState<Who | null>(null);
  const [what, setWhat] = useState<What | null>(null);
  const [beard, setBeard] = useState<Beard | null>(null);

  const needsBeard = who !== 'bimbo' && (what === 'taglio-barba' || what === 'barba');
  const step = !who ? 1 : who !== 'bimbo' && !what ? 2 : needsBeard && !beard ? 3 : 4;
  const totalSteps = who === 'bimbo' ? 1 : needsBeard ? 3 : 2;

  const result = useMemo(() => {
    if (step !== 4 || !who) return [];
    const out: (GuideService | undefined)[] = [];
    if (who === 'bimbo') {
      out.push(services.find((s) => s.category === 'baby'));
    } else {
      if (what === 'taglio' || what === 'taglio-barba') out.push(services.find((s) => s.category === 'taglio'));
      if (what === 'piega') out.push(services.find((s) => s.category === 'styling'));
      if (needsBeard && beard) out.push(pickBeard(services, beard));
    }
    return out.filter((s): s is GuideService => !!s);
  }, [step, who, what, beard, needsBeard, services]);

  const total = result.reduce((a, s) => a + s.price_cents, 0);
  const minutes = result.reduce((a, s) => a + s.duration_minutes, 0);
  const bookHref = `/prenota?service=${encodeURIComponent(result.map((s) => s.name).join(','))}`;

  function back() {
    if (step === 4 && needsBeard) setBeard(null);
    else if (step === 4 && who === 'bimbo') setWho(null);
    else if (step === 4 || step === 3) {
      setBeard(null);
      setWhat(null);
    } else setWho(null);
  }
  function reset() {
    setWho(null);
    setWhat(null);
    setBeard(null);
  }

  return (
    <section id="guida" className="sg" aria-labelledby="sg-title">
      <div className="sg-head">
        <p className="sg-kicker">Guida alla scelta</p>
        <h2 id="sg-title" className="sg-title">Non sai cosa prenotare?</h2>
        <p className="sg-sub">Rispondi a poche domande. Ti consigliamo il servizio giusto.</p>
      </div>

      <div className="sg-card">
        {step < 4 && (
          <div className="sg-progress" aria-hidden>
            {Array.from({ length: Math.max(totalSteps, step) }).map((_, i) => (
              <span key={i} className={i < step ? 'is-on' : ''} />
            ))}
          </div>
        )}

        {step === 1 && <Question title="Per chi è l'appuntamento?" options={WHO} onPick={setWho} />}
        {step === 2 && <Question title="Cosa vuoi fare?" options={WHAT} onPick={setWhat} />}
        {step === 3 && <Question title="Come vuoi la barba?" options={BEARD} onPick={setBeard} />}

        {step === 4 && (
          <div className="sg-result" aria-live="polite">
            <p className="sg-q">Ti consigliamo</p>
            {result.length === 0 ? (
              <p className="sg-empty">
                Questo servizio non è nel listino online. <Link href="/contatti">Scrivici</Link> e ti aiutiamo noi.
              </p>
            ) : (
              <>
                <ul className="sg-list">
                  {result.map((s) => (
                    <li key={s.id}>
                      <span>{s.name}</span>
                      <span className="sg-price">{euro(s.price_cents)}</span>
                    </li>
                  ))}
                </ul>
                <p className="sg-total">
                  Totale <strong>{euro(total)}</strong> · circa {minutes} minuti
                </p>
                {who === 'bimbo' && <p className="sg-tip">Se è il primo taglio, scrivilo nelle note quando prenoti.</p>}
                <Link href={bookHref} className="btn-primary sg-cta">
                  Prenota {result.length > 1 ? 'questi servizi' : 'questo servizio'}
                </Link>
              </>
            )}
          </div>
        )}

        {step > 1 && (
          <div className="sg-nav">
            <button type="button" onClick={back} className="sg-link">
              <ArrowLeft size={14} aria-hidden /> Indietro
            </button>
            {step === 4 && (
              <button type="button" onClick={reset} className="sg-link">
                <RotateCcw size={14} aria-hidden /> Ricomincia
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Question<T extends string>({ title, options, onPick }: { title: string; options: Option<T>[]; onPick: (v: T) => void }) {
  return (
    <fieldset className="sg-question">
      <legend className="sg-q">{title}</legend>
      <div className="sg-options">
        {options.map((o) => (
          <button key={o.value} type="button" className="sg-option" onClick={() => onPick(o.value)}>
            <span className="sg-option-label">{o.label}</span>
            {o.hint && <span className="sg-option-hint">{o.hint}</span>}
            <ArrowRight size={16} className="sg-option-arrow" aria-hidden />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
