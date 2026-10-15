import type { Metadata } from 'next';
import ResetPasswordView from '@/app/(public)/reimposta-password/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Choose a new password for your Barberia Garofalo account.',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/reimposta-password', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <ResetPasswordView />;
}
