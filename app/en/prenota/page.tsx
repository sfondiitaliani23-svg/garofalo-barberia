import type { Metadata } from 'next';
import PrenotaView from '@/app/(public)/prenota/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata: Metadata = {
  title: 'Book Online',
  description: 'Book a haircut, beard trim or kids’ haircut online at Barberia Garofalo in Foggia: choose your service, barber and a free time.',
  alternates: alternatesFor('/prenota', 'en'),
  openGraph: OG_EN,
};
export const dynamic = 'force-dynamic';

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[]; barber?: string }>;
}) {
  return <PrenotaView lang="en" searchParams={searchParams} />;
}
