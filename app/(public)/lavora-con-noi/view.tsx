import { ContentHero } from '@/components/content/ContentHero';
import { ApplicationForm } from '@/components/content/ApplicationForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { L, localHref, type Lang } from '@/lib/i18n';
import '@/components/content/content.css';

function getPoints(lang: Lang) {
  return [
    {
      title: L(lang, 'Cosa cerchiamo', 'What we look for'),
      text: L(
        lang,
        'Persone precise, puntuali e con voglia di crescere. L’esperienza conta, ma conta di più l’attitudine.',
        'People who are precise, punctual and eager to grow. Experience matters, but attitude matters more.',
      ),
    },
    {
      title: L(lang, 'Come lavoriamo', 'How we work'),
      text: L(
        lang,
        'Tempi che rispettano il risultato, non il cronometro. Ogni cliente, dal bambino al nonno, merita la stessa cura.',
        'We take the time the result needs, not the time the stopwatch says. Every client, from the child to the grandfather, deserves the same care.',
      ),
    },
    {
      title: L(lang, 'Anche per chi inizia', 'Beginners welcome too'),
      text: L(
        lang,
        'Se vuoi imparare il mestiere, scrivici lo stesso. Raccontaci cosa sai fare e cosa vuoi imparare.',
        'If you want to learn the trade, write to us anyway. Tell us what you can do and what you want to learn.',
      ),
    },
  ];
}

export default function LavoraConNoiView({ lang }: { lang: Lang }) {
  return (
    <div className="public-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: localHref(lang, '/') },
          { name: L(lang, 'Lavora con noi', 'Work with us'), path: localHref(lang, '/lavora-con-noi') },
        ])}
      />
      <ContentHero
        eyebrow={L(lang, 'Lavora con noi', 'Work with us')}
        title={L(lang, 'Entra nel team', 'Join the team')}
        sub={L(lang, 'Cerchiamo persone che amano questo mestiere. Candidati in due minuti.', 'We are looking for people who love this craft. Apply in two minutes.')}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          <div className="cp-steps">
            {getPoints(lang).map((p) => (
              <div key={p.title} className="cp-step cp-step--plain">
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
          <h2 className="cp-h2" style={{ marginTop: '2.5rem' }}>{L(lang, 'Candidati', 'Apply')}</h2>
          <ApplicationForm />
        </div>
      </section>
    </div>
  );
}
