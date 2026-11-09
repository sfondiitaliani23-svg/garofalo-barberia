import RecensioniView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Recensioni dei clienti',
  description: "Le recensioni dei clienti della Barberia Garofalo a Foggia. Leggi le opinioni o lascia la tua.",
  alternates: alternatesFor('/recensioni', 'it'),
};
export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export default function Page() {
  return <RecensioniView lang="it" />;
}
