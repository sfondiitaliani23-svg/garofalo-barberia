import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import { AppSettings } from '@/components/app/AppSettings';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Turn notifications on or off and choose the black or gold version of the Barberia Garofalo app.',
  alternates: alternatesFor('/impostazioni', 'en'),
  openGraph: OG_EN,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AppSettings />;
}
