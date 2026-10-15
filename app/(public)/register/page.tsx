import type { Metadata } from 'next';
import RegisterView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata: Metadata = {
  title: 'Registrati',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/register', 'it'),
};

export default function Page() {
  return <RegisterView />;
}
