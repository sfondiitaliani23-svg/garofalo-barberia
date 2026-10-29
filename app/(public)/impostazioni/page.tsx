import type { Metadata } from 'next';
import { alternatesFor } from '@/lib/i18n/seo';
import { AppSettings } from '@/components/app/AppSettings';

export const metadata: Metadata = {
  title: 'Impostazioni',
  description: 'Accendi o spegni le notifiche e scegli la versione nera o oro dell’app Barberia Garofalo.',
  alternates: alternatesFor('/impostazioni', 'it'),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AppSettings />;
}
