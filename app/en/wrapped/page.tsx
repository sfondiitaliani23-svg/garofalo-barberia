import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import WrappedView from '@/app/(public)/wrapped/view';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Wrapped and stories',
  description: 'Barberia Garofalo stories in Foggia: news, cuts and offers. With your account, your year at the barbershop.',
  alternates: alternatesFor('/wrapped', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <WrappedView lang="en" />;
}
