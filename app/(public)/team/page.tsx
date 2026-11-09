import TeamView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)
export const metadata = {
  title: 'Il team',
  description: 'Conosci i barbieri della Barberia Garofalo a Foggia e prenota con chi preferisci.',
  alternates: alternatesFor('/team', 'it'),
};

export default function Page() {
  return <TeamView lang="it" />;
}
