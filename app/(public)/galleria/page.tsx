import GalleriaView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Galleria tagli e barbe',
  description: "Foto di tagli, sfumature e barbe realizzati alla Barberia Garofalo di Foggia.",
  alternates: alternatesFor('/galleria', 'it'),
};

export default function Page() {
  return <GalleriaView lang="it" />;
}
