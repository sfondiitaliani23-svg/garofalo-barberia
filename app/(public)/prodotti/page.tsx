import { alternatesFor } from '@/lib/i18n/seo';
import ProdottiView from './view';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)
export const metadata = {
  title: 'Prodotti in salone',
  description: 'Profumi e prodotti per capelli e barba disponibili da Barberia Garofalo a Foggia. Chiedi in salone o su WhatsApp.',
  alternates: alternatesFor('/prodotti', 'it'),
};

export default function Page() {
  return <ProdottiView lang="it" />;
}
