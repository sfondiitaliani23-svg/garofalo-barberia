'use client';

import { useMemo, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L, type Lang } from '@/lib/i18n';
import { serviceName } from '@/lib/i18n/content-en';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';
import './service-guide.css';

type GuideService = { id: string; name: string; category: ServiceCategory; price_cents: number; duration_minutes: number };

type Who = 'adulto' | 'ragazzo' | 'bimbo';
type What = 'taglio' | 'taglio-barba' | 'barba' | 'piega';
type Beard = 'lama' | 'forbici' | 'panno';

type Option<T> = { value: T; label: string; hint?: string };

function whoOptions(lang: Lang): Option<Who>[] {
  return [
    { value: 'adulto', label: L(lang, 'Per me', 'For me'), hint: L(lang, 'Uomo adulto', 'Adult man') },
    { value: 'ragazzo', label: L(lang, 'Per un ragazzo', 'For a teenager'), hint: L(lang, 'Dai 12 anni circa', 'From about 12 years old') },
    { value: 'bimbo', label: L(lang, 'Per un bambino', 'For a child'), hint: L(lang, 'Anche primo taglio', 'First haircuts too') },
  ];
}
function whatOptions(lang: Lang): Option<What>[] {
  return [
    { value: 'taglio', label: L(lang, 'Solo capelli', 'Hair only'), hint: L(lang, 'Taglio con shampoo', 'Haircut with shampoo') },
    { value: 'taglio-barba', label: L(lang, 'Capelli e barba', 'Hair and beard'), hint: L(lang, 'Tutto in un appuntamento', 'All in one appointment') },
    { value: 'barba', label: L(lang, 'Solo barba', 'Beard only'), hint: L(lang, 'Rasatura o modellatura', 'Shave or shaping') },
    { value: 'piega', label: L(lang, 'Solo piega', 'Styling only'), hint: L(lang, 'Shampoo e acconciatura', 'Shampoo and styling') },
  ];
}
function beardOptions(lang: Lang): Option<Beard>[] {
  return [
    { value: 'lama', label: L(lang, 'Rasata e pulita', 'Clean-shaven'), hint: L(lang, 'Con la lama', 'With a straight razor') },
    { value: 'forbici', label: L(lang, 'Corta e definita', 'Short and defined'), hint: L(lang, 'Modellata a forbici', 'Shaped with scissors') },
    { value: 'panno', label: L(lang, 'Con un momento di relax', 'With a moment of relaxation'), hint: L(lang, 'Panno caldo', 'Hot towel') },
  ];
}

const euro = (c: number, lang: Lang = 'it') =>
  lang === 'en' ? `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}` : `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

function pickBeard(services: GuideService[], beard: Beard) {
  const barba = services.filter((s) => s.category === 'barba');
  const key = beard === 'lama' ? /lama|rasat/i : beard === 'forbici' ? /forbic/i : /panno|caldo/i;
  return barba.find((s) => key.test(s.name)) ?? barba[0];
}

export function ServiceGuide({ services }: { services: GuideService[] }) {
  const lang = useLang();
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
        <p className="sg-kicker">{L(lang, 'Guida alla scelta', 'Choosing guide')}</p>
        <h2 id="sg-title" className="sg-title">{L(lang, 'Non sai cosa prenotare?', 'Not sure what to book?')}</h2>
        <p className="sg-sub">{L(lang, 'Rispondi a poche domande. Ti consigliamo il servizio giusto.', 'Answer a few questions. We will suggest the right service.')}</p>
      </div>

      <div className="sg-card">
        {step < 4 && (
          <div className="sg-progress" aria-hidden>
            {Array.from({ length: Math.max(totalSteps, step) }).map((_, i) => (
              <span key={i} className={i < step ? 'is-on' : ''} />
            ))}
          </div>
        )}

        {step === 1 && <Question title={L(lang, "Per chi è l'appuntamento?", 'Who is the appointment for?')} options={whoOptions(lang)} onPick={setWho} />}
        {step === 2 && <Question title={L(lang, 'Cosa vuoi fare?', 'What would you like to do?')} options={whatOptions(lang)} onPick={setWhat} />}
        {step === 3 && <Question title={L(lang, 'Come vuoi la barba?', 'How do you want your beard?')} options={beardOptions(lang)} onPick={setBeard} />}

        {step === 4 && (
          <div className="sg-result" aria-live="polite">
            <p className="sg-q">{L(lang, 'Ti consigliamo', 'We recommend')}</p>
            {result.length === 0 ? (
              <p className="sg-empty">
                {lang === 'en' ? (
                  <>
                    This service is not on the online price list. <Link href="/contatti">Write to us</Link> and we will help you.
                  </>
                ) : (
                  <>
                    Questo servizio non è nel listino online. <Link href="/contatti">Scrivici</Link> e ti aiutiamo noi.
                  </>
                )}
              </p>
            ) : (
              <>
                <ul className="sg-list">
                  {result.map((s) => (
                    <li key={s.id}>
                      <span>{serviceName(lang, s.name)}</span>
                      <span className="sg-price">{euro(s.price_cents, lang)}</span>
                    </li>
                  ))}
                </ul>
                <p className="sg-total">
                  {L(lang, 'Totale', 'Total')} <strong>{euro(total, lang)}</strong> · {L(lang, 'circa', 'about')} {minutes} {L(lang, 'minuti', 'minutes')}
                </p>
                {who === 'bimbo' && <p className="sg-tip">{L(lang, 'Se è il primo taglio, scrivilo nelle note quando prenoti.', 'If it is the first haircut, mention it in the notes when you book.')}</p>}
                <Link href={bookHref} className="btn-primary sg-cta">
                  {lang === 'en'
                    ? result.length > 1 ? 'Book these services' : 'Book this service'
                    : `Prenota ${result.length > 1 ? 'questi servizi' : 'questo servizio'}`}
                </Link>
              </>
            )}
          </div>
        )}

        {step > 1 && (
          <div className="sg-nav">
            <button type="button" onClick={back} className="sg-link">
              <ArrowLeft size={14} aria-hidden /> {L(lang, 'Indietro', 'Back')}
            </button>
            {step === 4 && (
              <button type="button" onClick={reset} className="sg-link">
                <RotateCcw size={14} aria-hidden /> {L(lang, 'Ricomincia', 'Start over')}
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
