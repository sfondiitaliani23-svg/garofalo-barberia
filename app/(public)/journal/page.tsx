import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import JournalView from './view';

export const metadata: Metadata = {
  title: 'Journal: consigli su capelli e barba',
  description: 'Consigli pratici dalla Barberia Garofalo di Foggia: ogni quanto tagliare i capelli, sfumature, barba e primo taglio dei bambini.',
  alternates: alternatesFor('/journal', 'it'),
};

export const revalidate = 300;

export default function Page() {
  return <JournalView lang="it" />;
}
