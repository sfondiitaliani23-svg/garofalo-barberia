import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import PrivacyView from './view';

export const metadata: Metadata = {
  title: 'Privacy e Cookie',
  description: "Informativa privacy e cookie della Barberia Garofalo.",
  alternates: alternatesFor('/privacy', 'it'),
};

export default function Page() {
  return <PrivacyView lang="it" />;
}
