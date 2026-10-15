import { ContentHero } from '@/components/content/ContentHero';
import { AnonymousFeedbackForm } from '@/components/reviews/AnonymousFeedbackForm';
import { L, type Lang } from '@/lib/i18n';
import '@/components/content/content.css';

export default function FeedbackView({ lang }: { lang: Lang }) {
  return (
    <div className="public-page">
      <ContentHero
        eyebrow={L(lang, 'Feedback anonimo', 'Anonymous feedback')}
        title={L(lang, 'Com’è andata?', 'How did it go?')}
        sub={L(lang, 'Un minuto per dirci la verità. Niente nome, niente contatti: lo legge solo il salone.', 'One minute to tell us the truth. No name, no contact details: only the barbershop reads it.')}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap" style={{ maxWidth: '32rem' }}>
          <AnonymousFeedbackForm />
        </div>
      </section>
    </div>
  );
}
