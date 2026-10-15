import { SITE_URL } from '@/lib/seo';
import type { Lang } from './index';

/** Indirizzo assoluto di una pagina nella lingua indicata. path = indirizzo italiano ('/servizi', '' per la home). */
export function pageUrl(path: string, lang: Lang): string {
  const p = path === '/' ? '' : path;
  return lang === 'en' ? `${SITE_URL}/en${p}` : `${SITE_URL}${p}`;
}

/**
 * Blocco "alternates" per i metadati di Next: canonical della lingua corrente
 * e hreflang verso le due versioni (più x-default = italiano).
 */
export function alternatesFor(path: string, lang: Lang) {
  return {
    canonical: pageUrl(path, lang),
    languages: {
      it: pageUrl(path, 'it'),
      en: pageUrl(path, 'en'),
      'x-default': pageUrl(path, 'it'),
    },
  };
}

export const OG_LOCALE: Record<Lang, string> = { it: 'it_IT', en: 'en_GB' };

/** Anteprima social delle pagine inglesi: stessa immagine e nome del sito, lingua inglese (sostituisce il blocco del layout principale). */
export const OG_EN = {
  type: 'website' as const,
  locale: OG_LOCALE.en,
  siteName: 'Barberia Garofalo',
  images: [{ url: '/assets/sostituisci-immagini/homepage/1.jpg', width: 1200, height: 630, alt: 'Barberia Garofalo' }],
};
