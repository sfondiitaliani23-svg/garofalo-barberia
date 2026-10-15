'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LANG_COOKIE, langOfPath, switchPath, type Lang } from '@/lib/i18n';

/** Interruttore IT | EN: porta alla stessa pagina nell'altra lingua (tenendo query e #ancora). */
export function LanguageSwitch({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const current: Lang = langOfPath(pathname);

  function go(e: React.MouseEvent, to: Lang) {
    // Lascia fare al browser i clic "speciali" (nuova scheda, tasto centrale...).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    try {
      document.cookie =
        to === 'en'
          ? `${LANG_COOKIE}=en; path=/; max-age=31536000; samesite=lax`
          : `${LANG_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } catch {
      /* cookie bloccati: la navigazione funziona lo stesso */
    }
    onNavigate?.();
    router.push(switchPath(pathname, to) + window.location.search + window.location.hash);
  }

  const item = (lang: Lang, label: string, full: string) => {
    const active = lang === current;
    return active ? (
      <span aria-current="true" className="text-gold">{label}</span>
    ) : (
      <Link
        href={switchPath(pathname, lang)}
        hrefLang={lang}
        lang={lang}
        aria-label={full}
        onClick={(e) => go(e, lang)}
        className="text-white/60 transition-colors hover:text-gold-light"
      >
        {label}
      </Link>
    );
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}>
      {item('it', 'IT', 'Italiano')}
      <span className="text-white/25" aria-hidden>|</span>
      {item('en', 'EN', 'English')}
    </span>
  );
}
