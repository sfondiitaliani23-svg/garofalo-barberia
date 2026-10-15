import HomeView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const revalidate = 120;

export const metadata = {
  title: { absolute: 'Barberia Garofalo | Barbiere a Foggia – Taglio uomo, barba e bimbo' },
  description:
    "Barberia Garofalo a Foggia: taglio uomo, ragazzo e bimbo, barba con rasoio, forbici o panno caldo. Viale Ignazio d'Addedda 236. Prenota online.",
  alternates: alternatesFor('/', 'it'),
};

export default function Page() {
  return <HomeView lang="it" />;
}
