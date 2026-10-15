import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import FaqView from './view';

export const metadata: Metadata = {
  title: 'Domande frequenti',
  description: 'Risposte rapide su prenotazione, prezzi, disdette, bambini e orari della Barberia Garofalo a Foggia.',
  alternates: alternatesFor('/faq', 'it'),
};

export default function Page() {
  return <FaqView lang="it" />;
}
