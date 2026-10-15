import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import PrimaVisitaView from '@/app/(public)/prima-visita/view';

export const metadata: Metadata = {
  title: 'Your first visit',
  description: 'Is it your first time at Barberia Garofalo in Foggia? How to book, what to expect, how long it takes and how to pay.',
  alternates: alternatesFor('/prima-visita', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <PrimaVisitaView lang="en" />;
}
