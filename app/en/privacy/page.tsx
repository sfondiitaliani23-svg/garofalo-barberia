import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import PrivacyView from '@/app/(public)/privacy/view';

export const metadata: Metadata = {
  title: 'Privacy and Cookies',
  description: 'Privacy and cookie policy of Barberia Garofalo (courtesy translation; the Italian version prevails).',
  alternates: alternatesFor('/privacy', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <PrivacyView lang="en" />;
}
