/**
 * Lingue del sito pubblico: italiano (senza prefisso) e inglese (prefisso /en).
 * Le pagine restano statiche: la lingua sta nell'indirizzo, mai in un cookie o header.
 */
export type Lang = 'it' | 'en';
export const LANGS: Lang[] = ['it', 'en'];
export const LANG_COOKIE = 'gb_lang';

export function isLang(v: unknown): v is Lang {
  return v === 'it' || v === 'en';
}

/** Sceglie il testo nella lingua giusta: L(lang, 'Prenota', 'Book'). */
export function L<T>(lang: Lang, it: T, en: T): T {
  return lang === 'en' ? en : it;
}

/**
 * Indirizzi che NON hanno una versione /en (restano uguali in ogni lingua):
 * area cliente, admin, API, QR, file e immagini. L'area cliente segue il cookie della lingua.
 */
const NEUTRAL_PREFIXES = ['/login/qr', '/area-cliente', '/admin', '/api', '/auth', '/qr', '/link', '/assets', '/pwa', '/_next'];

function isNeutral(path: string): boolean {
  if (NEUTRAL_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?') || path.startsWith(p + '#'))) return true;
  // file con estensione (immagini, pdf, xml, txt...)
  const onlyPath = path.split('?')[0].split('#')[0];
  return /\.[a-z0-9]{2,5}$/i.test(onlyPath.split('/').pop() ?? '');
}

/** Aggiunge /en agli indirizzi interni quando la lingua è l'inglese. Link esterni e neutri restano uguali. */
export function localHref(lang: Lang, href: string): string {
  if (lang !== 'en') return href;
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (href === '/en' || href.startsWith('/en/') || href.startsWith('/en?') || href.startsWith('/en#')) return href;
  if (isNeutral(href)) return href;
  if (href === '/') return '/en';
  if (href.startsWith('/?') || href.startsWith('/#')) return '/en' + href.slice(1);
  return '/en' + href;
}

/** Toglie il prefisso /en: '/en/servizi' -> '/servizi', '/en' -> '/'. */
export function stripLang(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
}

export function langOfPath(pathname: string): Lang {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'it';
}

/**
 * Pagine che esistono anche in inglese (indirizzo italiano, senza /en).
 * Un test controlla che coincidano con le cartelle in app/en.
 * Le pagine con parametro ([slug]) sono indicate con il prefisso: '/team/', '/journal/'.
 */
export const EN_STATIC_PATHS = [
  '/',
  '/prenota',
  '/servizi',
  '/galleria',
  '/recensioni',
  '/recensioni/nuova',
  '/chi-siamo',
  '/team',
  '/contatti',
  '/prima-visita',
  '/faq',
  '/journal',
  '/offerte',
  '/prodotti',
  '/lavora-con-noi',
  '/privacy',
  '/feedback',
  '/login',
  '/register',
  '/reimposta-password',
  '/barba-foggia',
  '/taglio-uomo-foggia',
  '/taglio-bambino-foggia',
] as const;
export const EN_DYNAMIC_PREFIXES = ['/team/', '/journal/'] as const;

/** Esiste la versione inglese di questa pagina (indirizzo senza /en)? */
export function hasEnglish(path: string): boolean {
  const clean = path.split('?')[0].split('#')[0].replace(/(.)\/$/, '$1') || '/';
  if ((EN_STATIC_PATHS as readonly string[]).includes(clean)) return true;
  return EN_DYNAMIC_PREFIXES.some((p) => clean.startsWith(p) && clean.length > p.length);
}

/** Indirizzo equivalente nell'altra lingua (se manca la versione inglese, porta alla home inglese). */
export function switchPath(pathname: string, to: Lang): string {
  const base = stripLang(pathname);
  if (to === 'it') return base;
  return hasEnglish(base) ? (base === '/' ? '/en' : '/en' + base) : '/en';
}
