import GalleriaView from '@/app/(public)/galleria/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Haircut and beard gallery',
  description: 'Photos of haircuts, fades and beards created at Barberia Garofalo in Foggia.',
  alternates: alternatesFor('/galleria', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <GalleriaView lang="en" />;
}
