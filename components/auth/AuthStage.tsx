'use client';

// Scheda doppia di Accedi / Registrati (14/11/2026, richiesta di Eliseo).
// Spunto: «Modern Login & Sign-Up UI» (@CodeZenithAI, Instagram), rifatto nei colori di Garofalo.
// Una forma d'oro tagliata in diagonale sta da un lato con il saluto; passando all'altro modo
// attraversa tutta la scheda e si ferma dall'altro lato, mentre il modulo nuovo entra.
// I link «Registrati ora» / «Accedi» dentro la scheda fanno l'animazione invece di cambiare pagina
// (l'indirizzo diventa comunque /register o /login, e il tasto Indietro funziona).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

type Modo = 'login' | 'register';
const FORMA: Record<Modo, string> = {
  login: 'polygon(44% 0%, 100% 0%, 100% 100%, 99.9% 100%)',
  register: 'polygon(0% 0%, 54% 0%, 30% 100%, 0% 100%)',
};
const PIENA = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

const modoDa = (path: string): Modo => (/\/register\/?$/.test(path) ? 'register' : 'login');

export function AuthStage({ iniziale, login, registra }: { iniziale: Modo; login: ReactNode; registra: ReactNode }) {
  const lang = useLang();
  const [modo, setModo] = useState<Modo>(iniziale);
  const [giro, setGiro] = useState(0);
  const forma = useRef<HTMLDivElement>(null);
  const carta = useRef<HTMLDivElement>(null);

  const vai = useCallback((nuovo: Modo) => {
    setModo((vecchio) => {
      if (vecchio === nuovo) return vecchio;
      const el = forma.current;
      const piccolo = window.matchMedia('(max-width: 820px)').matches;
      const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (el && !piccolo && !fermo && el.animate) {
        el.animate([{ clipPath: FORMA[vecchio] }, { clipPath: PIENA, offset: 0.5 }, { clipPath: FORMA[nuovo] }], {
          duration: 1100,
          easing: 'cubic-bezier(.7,0,.25,1)',
        });
      }
      setGiro((g) => g + 1);
      return nuovo;
    });
  }, []);

  // I link interni alla scheda fanno l'animazione invece di ricaricare la pagina.
  useEffect(() => {
    const box = carta.current;
    if (!box) return undefined;
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !/\/(login|register)\/?$/.test(u.pathname)) return;
      e.preventDefault();
      history.pushState(null, '', u.pathname + u.search);
      vai(modoDa(u.pathname));
    };
    const indietro = () => vai(modoDa(location.pathname));
    box.addEventListener('click', clic);
    addEventListener('popstate', indietro);
    return () => { box.removeEventListener('click', clic); removeEventListener('popstate', indietro); };
  }, [vai]);

  const reg = modo === 'register';
  return (
    <div ref={carta} className={`as-carta${reg ? ' is-reg' : ''}`}>
      <div ref={forma} className="as-forma" aria-hidden style={{ clipPath: FORMA[modo] }}>
        <p key={`s${giro}`} className="as-saluto">
          {reg ? L(lang, 'Benvenuto!', 'Welcome!') : L(lang, 'Bentornato!', 'Welcome back!')}
        </p>
      </div>
      <div className={`as-pane as-pane--login${reg ? '' : ' is-on'}`} aria-hidden={reg} inert={reg ? true : undefined} key={`l${reg ? 0 : giro}`}>
        <h2 className="as-titolo">{L(lang, 'Accedi', 'Sign in')}</h2>
        {login}
      </div>
      <div className={`as-pane as-pane--reg${reg ? ' is-on' : ''}`} aria-hidden={!reg} inert={!reg ? true : undefined} key={`r${reg ? giro : 0}`}>
        {registra}
      </div>
    </div>
  );
}
