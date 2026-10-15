import TeamView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const revalidate = 300;
export const metadata = {
  title: 'Il team',
  description: 'Conosci i barbieri della Barberia Garofalo a Foggia e prenota con chi preferisci.',
  alternates: alternatesFor('/team', 'it'),
};

export default function Page() {
  return <TeamView lang="it" />;
}
