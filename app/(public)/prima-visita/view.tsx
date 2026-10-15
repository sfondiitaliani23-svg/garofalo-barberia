import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import { L, localHref, type Lang } from '@/lib/i18n';
import '@/components/content/content.css';

function getSteps(lang: Lang) {
  return [
    {
      title: L(lang, 'Scegli e prenota', 'Choose and book'),
      text:
        lang === 'en' ? (
          <>
            Online you choose the service, the barber and the time. Confirmation arrives straight away. Not sure what to choose? Use the{' '}
            <Link href="/servizi#guida">choosing guide</Link>.
          </>
        ) : (
          <>
            Online scegli servizio, barbiere e orario. La conferma arriva subito. Non sai cosa scegliere? Usa la{' '}
            <Link href="/servizi#guida">guida alla scelta</Link>.
          </>
        ),
    },
    {
      title: L(lang, 'Ricevi il promemoria', 'Get your reminder'),
      text:
        lang === 'en' ? (
          <>If you leave your email, you get the confirmation and a reminder the evening before. If your plans change, cancel from your account up to {SITE_CONFIG.cancellationMinutes} minutes before.</>
        ) : (
          <>Se lasci la tua email, ricevi la conferma e un promemoria la sera prima. Se cambi programma, disdici dall’area clienti fino a {SITE_CONFIG.cancellationMinutes} minuti prima.</>
        ),
    },
    {
      title: L(lang, 'Arriva qualche minuto prima', 'Arrive a few minutes early'),
      text:
        lang === 'en' ? (
          <>You will find us at {SITE_CONFIG.addressShort}, Foggia. Arriving 5 minutes early lets you sit down without rushing.</>
        ) : (
          <>Ci trovi in {SITE_CONFIG.addressShort}, Foggia. Arrivare 5 minuti prima ti permette di sederti senza fretta.</>
        ),
    },
    {
      title: L(lang, 'Raccontaci cosa vuoi', 'Tell us what you want'),
      text:
        lang === 'en' ? (
          <>Before we start we talk for two minutes. If you have a photo of the cut you like, show it to us: it helps a lot.</>
        ) : (
          <>Prima di iniziare parliamo due minuti. Se hai una foto del taglio che ti piace, mostracela: aiuta molto.</>
        ),
    },
    {
      title: L(lang, 'Taglio, shampoo e styling', 'Haircut, shampoo and styling'),
      text:
        lang === 'en' ? (
          <>Shampoo is included in every haircut. At the end we style your hair the way you will wear it out of here and tell you how to look after it.</>
        ) : (
          <>Lo shampoo è compreso in ogni taglio. Alla fine sistemiamo i capelli come li porterai fuori di qui e ti diciamo come mantenerli.</>
        ),
    },
    {
      title: L(lang, 'Paghi in salone', 'Pay at the barbershop'),
      text:
        lang === 'en' ? (
          <>You pay after the service, at the barbershop. The price is the one on the price list: no extra charges.</>
        ) : (
          <>Si paga dopo il servizio, in salone. Il prezzo è quello del listino: nessun supplemento.</>
        ),
    },
  ];
}

export default function PrimaVisitaView({ lang }: { lang: Lang }) {
  const steps = getSteps(lang);
  return (
    <div className="public-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: localHref(lang, '/') },
          { name: L(lang, 'Prima visita', 'Your first visit'), path: localHref(lang, '/prima-visita') },
        ])}
      />
      <ContentHero
        eyebrow={L(lang, 'Prima visita', 'Your first visit')}
        title={L(lang, 'La tua prima volta da noi', 'Your first time with us')}
        sub={L(lang, 'Ecco cosa succede, passo dopo passo. Niente sorprese.', 'Here is what happens, step by step. No surprises.')}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          <ol className="cp-steps">
            {steps.map((s, i) => (
              <li key={i} className="cp-step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="cp-step cp-step--plain" style={{ marginTop: '0.9rem' }}>
            <h3>{L(lang, 'Vieni con un bambino?', 'Coming with a child?')}</h3>
            {lang === 'en' ? (
              <p>
                Choose “Kids’ haircut” and, if it is the first haircut, write it in the notes. We take all the time that is needed.{' '}
                <Link href="/journal/primo-taglio-bambino">Read our tips</Link>.
              </p>
            ) : (
              <p>
                Scegli “Taglio baby” e, se è il primo taglio, scrivilo nelle note. Prendiamo tutto il tempo necessario.{' '}
                <Link href="/journal/primo-taglio-bambino">Leggi i nostri consigli</Link>.
              </p>
            )}
          </div>

          <div className="cp-cta">
            <p>{L(lang, 'Pronto? Scegli il tuo orario.', 'Ready? Choose your time.')}</p>
            <div className="cp-cta-actions">
              <Link href="/prenota" className="btn-primary">{L(lang, 'Prenota la prima visita', 'Book your first visit')}</Link>
              <a
                href={getWhatsAppLink(L(lang, undefined, 'Hello! I would like to book an appointment at Garofalo Barberia. Can you help me?'))}
                target="_blank"
                rel="noopener noreferrer"
                className="cp-ghost"
              >
                {L(lang, 'Scrivici su WhatsApp', 'Message us on WhatsApp')}
              </a>
            </div>
            <p className="mt-4 text-sm">
              {L(lang, 'Altre domande?', 'More questions?')}{' '}
              <Link href="/faq" className="cp-inline-link">{L(lang, 'Leggi le FAQ', 'Read the FAQ')}</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
