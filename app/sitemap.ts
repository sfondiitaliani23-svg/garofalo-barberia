import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { LOCAL_PAGES } from '@/lib/data/local-pages';
import { getAllArticles } from '@/lib/data/journal-store';
import { getBarbers } from '@/lib/actions/bookings';
import { barberSlug } from '@/lib/utils/barber-slug';
import { pageUrl } from '@/lib/i18n/seo';
import { hasEnglishArticle } from '@/lib/i18n/content-info';

type Freq = 'weekly' | 'monthly' | 'yearly';
type Entry = MetadataRoute.Sitemap[number];

/** Una pagina nelle due lingue: due righe, ognuna con i link hreflang verso l'altra. */
function both(path: string, priority: number, changeFrequency: Freq, lastModified?: Date): Entry[] {
  const languages = {
    it: pageUrl(path, 'it'),
    en: pageUrl(path, 'en'),
    'x-default': pageUrl(path, 'it'),
  };
  return (['it', 'en'] as const).map((lang) => ({
    url: pageUrl(path, lang),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const barbers = await getBarbers().catch(() => []);
  const articles = await getAllArticles().catch(() => []);
  const main: { path: string; priority: number; freq: Freq }[] = [
    { path: '', priority: 1, freq: 'weekly' },
    { path: '/prenota', priority: 0.9, freq: 'weekly' },
    { path: '/servizi', priority: 0.9, freq: 'monthly' },
    { path: '/galleria', priority: 0.7, freq: 'monthly' },
    { path: '/recensioni', priority: 0.7, freq: 'weekly' },
    { path: '/chi-siamo', priority: 0.6, freq: 'monthly' },
    { path: '/team', priority: 0.6, freq: 'monthly' },
    { path: '/contatti', priority: 0.8, freq: 'monthly' },
    { path: '/prima-visita', priority: 0.7, freq: 'monthly' },
    { path: '/faq', priority: 0.7, freq: 'monthly' },
    { path: '/journal', priority: 0.6, freq: 'weekly' },
    { path: '/offerte', priority: 0.6, freq: 'weekly' },
    { path: '/prodotti', priority: 0.5, freq: 'monthly' },
    { path: '/lavora-con-noi', priority: 0.4, freq: 'monthly' },
    { path: '/privacy', priority: 0.2, freq: 'yearly' },
  ];
  return [
    ...main.flatMap((p) => both(p.path, p.priority, p.freq)),
    ...LOCAL_PAGES.flatMap((p) => both(`/${p.slug}`, 0.8, 'monthly')),
    ...barbers.flatMap((b) => both(`/team/${barberSlug(b.name)}`, 0.5, 'monthly')),
    // Gli articoli senza traduzione inglese compaiono solo in italiano.
    ...articles.flatMap((a) =>
      hasEnglishArticle(a.slug, a.source)
        ? both(`/journal/${a.slug}`, 0.6, 'yearly', new Date(a.date))
        : [{ url: pageUrl(`/journal/${a.slug}`, 'it'), lastModified: new Date(a.date), changeFrequency: 'yearly' as const, priority: 0.6 }],
    ),
  ];
}
