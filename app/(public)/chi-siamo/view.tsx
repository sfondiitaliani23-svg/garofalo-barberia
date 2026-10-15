import { TeamStudioSection } from '@/components/chi-siamo/TeamStudioSection';
import { getBarbers } from '@/lib/actions/bookings';
import { L, type Lang } from '@/lib/i18n';
import { ABOUT_STORY_EN, ABOUT_VALUES_EN, barberRole } from '@/lib/i18n/content-team';
import './chi-siamo.css';

const TEAM_DISPLAY_ORDER = ['Vittorio Morlino', 'Luigi Garofalo', 'Francesco Costantino'];

const VALUES = [
  {
    title: 'Mestiere prima di tutto',
    text: 'Tagli precisi, rasature affidabili. Tempi che rispettano il risultato, non il fatturato.',
  },
  {
    title: 'Family-friendly',
    text: 'Uno spazio dove le famiglie si sentono a casa — anche con i più piccoli in poltrona.',
  },
  {
    title: 'Trasparenza',
    text: 'Prezzi chiari, nessun supplemento nascosto. Quello che vedi è quello che paghi.',
  },
];

export default async function ChiSiamoView({ lang }: { lang: Lang }) {
  const values = lang === 'en' ? ABOUT_VALUES_EN : VALUES;
  const barbers = await getBarbers();
  const orderedBarbers = TEAM_DISPLAY_ORDER.map((name) => barbers.find((b) => b.name === name)).filter(
    (b): b is NonNullable<typeof b> => Boolean(b)
  );

  const teamMembers = orderedBarbers.map((barber) => ({
    id: barber.id,
    name: barber.name,
    role: barberRole(lang, barber.role),
    imageUrl: barber.image_url ?? '/assets/sostituisci-immagini/team/luigi-garofalo.png',
    isOwner: barber.name === 'Luigi Garofalo',
  }));

  return (
    <div className="page-chi-siamo">
      <section className="page-hero">
        <div className="container-lux">
          <h1 className="hero-heading">{L(lang, 'Chi siamo', 'About us')}</h1>
        </div>
      </section>

      <section className="section section-white">
        <div className="container-lux max-w-3xl">
          <div className="eyebrow">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">{L(lang, 'Storia', 'Story')}</span>
          </div>
          <h2 className="heading-display" style={{ fontSize: '2rem' }}>
            {L(lang, 'La nostra storia', 'Our story')}
          </h2>
          <div className="space-y-4 section-lead" style={{ maxWidth: '100%' }}>
            {lang === 'en' ? (
              <>
                {ABOUT_STORY_EN.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </>
            ) : (
              <>
                <p>
                  Sono Luigi Garofalo, ho iniziato questo lavoro nel 2012. Prima di esaudire il sogno di aprire la mia
                  Barberia ho fatto 13 anni di gavetta affiancata da corsi d&apos;aggiornamento e varie lezioni dai miei
                  &ldquo;masti&rdquo;.
                </p>
                <p>
                  Ho voluto fortemente che il mio cognome dovesse essere il nome della mia Barberia perché deve essere un
                  marchio di riconoscimento nel bene e nel male del nostro operato.
                </p>
                <p>
                  Ho creato la mia realtà dove la Barberia è il posto di tutti da bambini ad adulti che si vogliono
                  rilassare, scambiare delle parole o farsi una risata. Un posto dove si sta bene insieme!
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section section-cream">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">{L(lang, 'I nostri valori', 'Our values')}</h2>
            <div className="diamond-divider">
              <div className="diamond-line" />
              <div className="diamond-block" />
              <div className="diamond-line" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="team-card-lux">
                <h3 className="mb-2 font-semibold text-gold">{value.title}</h3>
                <p className="text-sm text-white/60">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TeamStudioSection members={teamMembers} />
    </div>
  );
}