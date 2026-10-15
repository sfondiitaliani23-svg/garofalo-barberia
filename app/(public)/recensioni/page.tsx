import RecensioniView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Recensioni dei clienti',
  description: "Le recensioni dei clienti della Barberia Garofalo a Foggia. Leggi le opinioni o lascia la tua.",
  alternates: alternatesFor('/recensioni', 'it'),
};
export const revalidate = 60;

export default function Page() {
  return <RecensioniView lang="it" />;
}
