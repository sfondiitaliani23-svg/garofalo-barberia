import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { LOCAL_PAGES } from '@/lib/data/local-pages';
import { getAllArticles } from '@/lib/data/journal-store';
import { getBarbers } from '@/lib/actions/bookings';
import { barberSlug } from '@/lib/utils/barber-slug';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const barbers = await getBarbers().catch(() => []);
  const articles = await getAllArticles().catch(() => []);
  const main: { path: string; priority: number; freq: 'weekly' | 'monthly' | 'yearly' }[] = [
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
    ...main.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: p.freq, priority: p.priority })),
    ...LOCAL_PAGES.map((p) => ({ url: `${SITE_URL}/${p.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...barbers.map((b) => ({ url: `${SITE_URL}/team/${barberSlug(b.name)}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...articles.map((a) => ({ url: `${SITE_URL}/journal/${a.slug}`, lastModified: new Date(a.date), changeFrequency: 'yearly' as const, priority: 0.6 })),
  ];
}
