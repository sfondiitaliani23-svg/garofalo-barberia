import { alternatesFor } from '@/lib/i18n/seo';
import OfferteView from './view';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)
export const metadata = {
  title: 'Offerte',
  description: 'Le offerte attive da Barberia Garofalo a Foggia. Prenota online e lo sconto si applica da solo.',
  alternates: alternatesFor('/offerte', 'it'),
};

export default function Page() {
  return <OfferteView lang="it" />;
}
