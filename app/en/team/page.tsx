import TeamView from '@/app/(public)/team/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const revalidate = 300;
export const metadata = {
  title: 'The team',
  description: 'Meet the barbers at Barberia Garofalo in Foggia and book with whoever you prefer.',
  alternates: alternatesFor('/team', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <TeamView lang="en" />;
}
