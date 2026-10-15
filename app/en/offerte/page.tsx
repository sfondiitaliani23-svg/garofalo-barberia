import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import OfferteView from '@/app/(public)/offerte/view';

export const revalidate = 120;
export const metadata = {
  title: 'Offers',
  description: 'Current offers at Barberia Garofalo in Foggia. Book online and the discount applies by itself.',
  alternates: alternatesFor('/offerte', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <OfferteView lang="en" />;
}
