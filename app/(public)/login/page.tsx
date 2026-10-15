import type { Metadata } from 'next';
import LoginView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Accedi',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/login', 'it'),
};

export default function Page() {
  return <LoginView lang="it" />;
}
