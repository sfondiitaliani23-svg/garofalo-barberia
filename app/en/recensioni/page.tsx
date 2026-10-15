import RecensioniView from '@/app/(public)/recensioni/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Customer reviews',
  description: 'Reviews from the clients of Barberia Garofalo in Foggia. Read their opinions or leave your own.',
  alternates: alternatesFor('/recensioni', 'en'),
  openGraph: OG_EN,
};
export const revalidate = 60;

export default function Page() {
  return <RecensioniView lang="en" />;
}
