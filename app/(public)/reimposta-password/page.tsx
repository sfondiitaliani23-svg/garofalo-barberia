import type { Metadata } from 'next';
import ResetPasswordView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Reimposta Password | Garofalo Barberia',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/reimposta-password', 'it'),
};

export default function Page() {
  return <ResetPasswordView />;
}
