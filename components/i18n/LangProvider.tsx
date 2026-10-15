'use client';

import { createContext, useContext, useEffect } from 'react';
import { LANG_COOKIE, type Lang } from '@/lib/i18n';

const LangContext = createContext<Lang>('it');

/** Passa la lingua ai componenti client e ricorda la scelta (serve all'area cliente, che non ha /en). */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      // Si ricorda solo la scelta dell'inglese (serve all'area cliente, che non ha /en).
      // Tornare all'italiano cancella il cookie dall'interruttore (LanguageSwitch).
      if (lang === 'en') document.cookie = `${LANG_COOKIE}=en; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookie bloccati: nessun problema, la pagina funziona lo stesso */
    }
  }, [lang]);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}
