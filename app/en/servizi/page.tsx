import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import ServiziView from '@/app/(public)/servizi/view';

export const revalidate = 120;
export const metadata = {
  title: 'Services and prices',
  description: 'Price list of Barberia Garofalo in Foggia: haircut and shampoo, kids’ haircut, straight-razor shave, beard trim with scissors or hot-towel beard. Clear prices, online booking.',
  alternates: alternatesFor('/servizi', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <ServiziView lang="en" />;
}
