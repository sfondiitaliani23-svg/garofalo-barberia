import ChiSiamoView from '@/app/(public)/chi-siamo/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata = {
  title: 'About us',
  description: 'About us: Barberia Garofalo in Foggia, a barbershop for men, teens and kids. The team, our values and the way we work.',
  alternates: alternatesFor('/chi-siamo', 'en'),
  openGraph: OG_EN,
};
export const revalidate = 300;

export default function Page() {
  return <ChiSiamoView lang="en" />;
}
