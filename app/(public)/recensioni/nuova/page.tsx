import NuovaRecensioneView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Lascia una recensione · Garofalo Barberia',
  alternates: alternatesFor('/recensioni/nuova', 'it'),
};
export const dynamic = 'force-dynamic';

export default function Page() {
  return <NuovaRecensioneView lang="it" />;
}
