import { alternatesFor } from '@/lib/i18n/seo';
import ServiziView from './view';

export const metadata = {
  title: 'Servizi e prezzi',
  description: "Listino della Barberia Garofalo a Foggia: taglio e shampoo, taglio baby, barba rasata, a forbici o con panno caldo. Prezzi chiari, prenotazione online.",
  alternates: alternatesFor('/servizi', 'it'),
};
export const revalidate = 120;

export default function Page() {
  return <ServiziView lang="it" />;
}
