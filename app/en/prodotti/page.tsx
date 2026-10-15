import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import ProdottiView from '@/app/(public)/prodotti/view';

export const revalidate = 300;
export const metadata = {
  title: 'Products at the salon',
  description: 'Perfumes and hair and beard products available at Barberia Garofalo in Foggia. Ask at the salon or on WhatsApp.',
  alternates: alternatesFor('/prodotti', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <ProdottiView lang="en" />;
}
