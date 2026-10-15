import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import ContattiView from '@/app/(public)/contatti/view';

export const metadata: Metadata = {
  title: 'Contact and opening hours',
  description: "Address, opening hours, phone and WhatsApp of Barberia Garofalo, Viale Ignazio d'Addedda 236, Foggia. Map and directions.",
  alternates: alternatesFor('/contatti', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <ContattiView lang="en" />;
}
