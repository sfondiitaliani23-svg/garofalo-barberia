import HomeView from '@/app/(public)/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const revalidate = 120;

export const metadata = {
  title: { absolute: 'Barberia Garofalo | Barber in Foggia – Men’s Haircuts, Beard Care and Kids’ Cuts' },
  description:
    'Barberia Garofalo in Foggia: haircuts for men, boys and kids, beard care with a straight razor, scissors or a hot towel. Viale Ignazio d’Addedda 236. Book online.',
  alternates: alternatesFor('/', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <HomeView lang="en" />;
}
