import type { Metadata } from 'next';
import LoginView from '@/app/(public)/login/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to manage your appointments and your haircut history at Barberia Garofalo, Foggia.',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/login', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <LoginView lang="en" />;
}
