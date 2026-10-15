import type { Metadata } from 'next';
import PrenotaView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata: Metadata = {
  title: 'Prenota Online',
  description: 'Prenota online taglio, barba e taglio baby da Barberia Garofalo a Foggia: scegli servizio, barbiere e orario libero.',
  alternates: alternatesFor('/prenota', 'it'),
};
export const dynamic = 'force-dynamic';

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[]; barber?: string }>;
}) {
  return <PrenotaView lang="it" searchParams={searchParams} />;
}
