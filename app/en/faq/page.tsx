import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import FaqView from '@/app/(public)/faq/view';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: 'Quick answers about booking, prices, cancellations, kids and opening hours at Barberia Garofalo in Foggia.',
  alternates: alternatesFor('/faq', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <FaqView lang="en" />;
}
