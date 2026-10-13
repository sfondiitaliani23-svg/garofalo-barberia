import Link from 'next/link';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '@/components/content/content.css';

export const metadata = {
  title: 'Prima visita',
  description: 'È la prima volta da Barberia Garofalo a Foggia? Come prenotare, cosa aspettarti, quanto dura e come si paga.',
  alternates: { canonical: '/prima-visita' },
};

const STEPS = [
  {
    title: 'Scegli e prenota',
    text: (
      <>
        Online scegli servizio, barbiere e orario. La conferma arriva subito. Non sai cosa scegliere? Usa la{' '}
        <Link href="/servizi#guida">guida alla scelta</Link>.
      </>
    ),
  },
  {
    title: 'Ricevi il promemoria',
    text: <>Se lasci la tua email, ricevi la conferma e un promemoria la sera prima. Se cambi programma, disdici dall’area clienti fino a {SITE_CONFIG.cancellationMinutes} minuti prima.</>,
  },
  {
    title: 'Arriva qualche minuto prima',
    text: <>Ci trovi in {SITE_CONFIG.addressShort}, Foggia. Arrivare 5 minuti prima ti permette di sederti senza fretta.</>,
  },
  {
    title: 'Raccontaci cosa vuoi',
    text: <>Prima di iniziare parliamo due minuti. Se hai una foto del taglio che ti piace, mostracela: aiuta molto.</>,
  },
  {
    title: 'Taglio, shampoo e styling',
    text: <>Lo shampoo è compreso in ogni taglio. Alla fine sistemiamo i capelli come li porterai fuori di qui e ti diciamo come mantenerli.</>,
  },
  {
    title: 'Paghi in salone',
    text: <>Si paga dopo il servizio, in salone. Il prezzo è quello del listino: nessun supplemento.</>,
  },
];

export default function PrimaVisitaPage() {
  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Prima visita', path: '/prima-visita' }])} />
      <ContentHero eyebrow="Prima visita" title="La tua prima volta da noi" sub="Ecco cosa succede, passo dopo passo. Niente sorprese." />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          <ol className="cp-steps">
            {STEPS.map((s) => (
              <li key={s.title} className="cp-step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="cp-step cp-step--plain" style={{ marginTop: '0.9rem' }}>
            <h3>Vieni con un bambino?</h3>
            <p>
              Scegli “Taglio baby” e, se è il primo taglio, scrivilo nelle note. Prendiamo tutto il tempo necessario.{' '}
              <Link href="/journal/primo-taglio-bambino">Leggi i nostri consigli</Link>.
            </p>
          </div>

          <div className="cp-cta">
            <p>Pronto? Scegli il tuo orario.</p>
            <div className="cp-cta-actions">
              <Link href="/prenota" className="btn-primary">Prenota la prima visita</Link>
              <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="cp-ghost">Scrivici su WhatsApp</a>
            </div>
            <p className="mt-4 text-sm">
              Altre domande? <Link href="/faq" className="cp-inline-link">Leggi le FAQ</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
