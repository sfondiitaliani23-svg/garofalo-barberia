'use client';

import { useRouter } from 'next/navigation';
import { LANG_COOKIE, type Lang } from '@/lib/i18n';
import { useLang } from './LangProvider';

/**
 * Interruttore IT | EN per l'area cliente (che non ha /en): scrive il cookie della lingua
 * e ricarica la pagina dal server. Stesso stile di LanguageSwitch.
 */
export function CookieLanguageSwitch({ className = '' }: { className?: string }) {
  const router = useRouter();
  const current = useLang();

  function choose(lang: Lang) {
    if (lang === current) return;
    try {
      document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookie bloccati: nessun problema */
    }
    router.refresh();
  }

  const item = (lang: Lang, label: string, full: string) =>
    lang === current ? (
      <span aria-current="true" className="text-gold">{label}</span>
    ) : (
      <button
        type="button"
        lang={lang}
        aria-label={full}
        onClick={() => choose(lang)}
        className="cursor-pointer text-white/60 transition-colors hover:text-gold-light"
      >
        {label}
      </button>
    );

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}>
      {item('it', 'IT', 'Italiano')}
      <span className="text-white/25" aria-hidden>|</span>
      {item('en', 'EN', 'English')}
    </span>
  );
}
