import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import LavoraConNoiView from './view';

export const metadata: Metadata = {
  title: 'Lavora con noi',
  description: 'Sei un barbiere o vuoi imparare il mestiere a Foggia? Invia la tua candidatura alla Barberia Garofalo.',
  alternates: alternatesFor('/lavora-con-noi', 'it'),
};

export default function Page() {
  return <LavoraConNoiView lang="it" />;
}
