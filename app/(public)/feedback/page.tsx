import { ContentHero } from '@/components/content/ContentHero';
import { FeedbackForm } from '@/components/content/FeedbackForm';
import '@/components/content/content.css';

export const metadata = {
  title: 'Feedback anonimo',
  description: 'Dicci com’è andata la tua visita da Barberia Garofalo. Feedback anonimo, senza nome né contatti.',
  alternates: { canonical: '/feedback' },
  robots: { index: false, follow: true },
};

export default function FeedbackPage() {
  return (
    <div className="public-page">
      <ContentHero eyebrow="Feedback anonimo" title="Com’è andata?" sub="Un minuto per dirci la verità. Niente nome, niente contatti: lo legge solo il salone." />
      <section className="section pb-24">
        <div className="container-lux cp-wrap" style={{ maxWidth: '32rem' }}>
          <FeedbackForm />
        </div>
      </section>
    </div>
  );
}
