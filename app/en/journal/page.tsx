import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import JournalView from '@/app/(public)/journal/view';

export const metadata: Metadata = {
  title: 'Journal: hair and beard tips',
  description: 'Practical tips from Barberia Garofalo in Foggia: how often to get a haircut, fades, beard care and a child’s first haircut.',
  alternates: alternatesFor('/journal', 'en'),
  openGraph: OG_EN,
};

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export default function Page() {
  return <JournalView lang="en" />;
}
