import FeedbackView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Feedback anonimo',
  description: 'Dicci com’è andata la tua visita da Barberia Garofalo. Feedback anonimo, senza nome né contatti.',
  alternates: alternatesFor('/feedback', 'it'),
  robots: { index: false, follow: true },
};

export default function Page() {
  return <FeedbackView lang="it" />;
}
