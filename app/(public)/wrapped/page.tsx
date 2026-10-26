import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import WrappedView from './view';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Wrapped e storie',
  description: 'Le storie di Barberia Garofalo a Foggia: novità, tagli e promo. Con il tuo account, il tuo anno in barberia.',
  alternates: alternatesFor('/wrapped', 'it'),
};

export default function Page() {
  return <WrappedView lang="it" />;
}
