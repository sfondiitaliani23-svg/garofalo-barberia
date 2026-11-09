import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import StoriesView from '@/app/(public)/stories/view';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export const metadata: Metadata = {
  title: 'Stories: today\'s stories',
  description: 'Today\'s stories from Barberia Garofalo in Foggia: shop news, cuts and offers.',
  alternates: alternatesFor('/stories', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <StoriesView lang="en" />;
}
