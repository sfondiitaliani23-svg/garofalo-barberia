import type { Metadata } from 'next';
import RegisterView from '@/app/(public)/register/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your Barberia Garofalo account to book faster and see your haircut history.',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/register', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <RegisterView />;
}
