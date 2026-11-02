import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import StoriesView from './view';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Stories: le storie del giorno',
  description: 'Le storie del giorno di Barberia Garofalo a Foggia: novità del salone, tagli e promo.',
  alternates: alternatesFor('/stories', 'it'),
};

export default function Page() {
  return <StoriesView lang="it" />;
}
