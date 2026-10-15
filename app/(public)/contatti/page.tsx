import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import ContattiView from './view';

export const metadata: Metadata = {
  title: 'Contatti e orari',
  description: "Indirizzo, orari, telefono e WhatsApp della Barberia Garofalo, Viale Ignazio d'Addedda 236, Foggia. Mappa e indicazioni.",
  alternates: alternatesFor('/contatti', 'it'),
};

export default function Page() {
  return <ContattiView lang="it" />;
}
