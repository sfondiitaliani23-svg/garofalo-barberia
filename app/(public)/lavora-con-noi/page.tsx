import { ContentHero } from '@/components/content/ContentHero';
import { ApplicationForm } from '@/components/content/ApplicationForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import '@/components/content/content.css';

export const metadata = {
  title: 'Lavora con noi',
  description: 'Sei un barbiere o vuoi imparare il mestiere a Foggia? Invia la tua candidatura alla Barberia Garofalo.',
  alternates: { canonical: '/lavora-con-noi' },
};

const POINTS = [
  { title: 'Cosa cerchiamo', text: 'Persone precise, puntuali e con voglia di crescere. L’esperienza conta, ma conta di più l’attitudine.' },
  { title: 'Come lavoriamo', text: 'Tempi che rispettano il risultato, non il cronometro. Ogni cliente, dal bambino al nonno, merita la stessa cura.' },
  { title: 'Anche per chi inizia', text: 'Se vuoi imparare il mestiere, scrivici lo stesso. Raccontaci cosa sai fare e cosa vuoi imparare.' },
];

export default function LavoraConNoiPage() {
  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Lavora con noi', path: '/lavora-con-noi' }])} />
      <ContentHero eyebrow="Lavora con noi" title="Entra nel team" sub="Cerchiamo persone che amano questo mestiere. Candidati in due minuti." />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          <div className="cp-steps">
            {POINTS.map((p) => (
              <div key={p.title} className="cp-step cp-step--plain">
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
          <h2 className="cp-h2" style={{ marginTop: '2.5rem' }}>Candidati</h2>
          <ApplicationForm />
        </div>
      </section>
    </div>
  );
}
