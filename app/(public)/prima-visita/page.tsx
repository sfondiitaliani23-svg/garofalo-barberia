import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import PrimaVisitaView from './view';

export const metadata: Metadata = {
  title: 'Prima visita',
  description: 'È la prima volta da Barberia Garofalo a Foggia? Come prenotare, cosa aspettarti, quanto dura e come si paga.',
  alternates: alternatesFor('/prima-visita', 'it'),
};

export default function Page() {
  return <PrimaVisitaView lang="it" />;
}
