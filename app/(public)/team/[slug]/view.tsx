import Image from 'next/image';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarCheck, MessageCircle } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { getBarbers } from '@/lib/actions/bookings';
import { getBarberWorkWeek } from '@/lib/actions/availability';
import { TEAM_EXTRA } from '@/lib/data/team';
import { barberSlug, firstName } from '@/lib/utils/barber-slug';
import { L, localHref, type Lang } from '@/lib/i18n';
import { dayName } from '@/lib/i18n/content-en';
import { TEAM_EXTRA_EN, barberRole } from '@/lib/i18n/content-team';
import { OG_LOCALE, alternatesFor } from '@/lib/i18n/seo';
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '@/components/content/content.css';
import '@/components/seo/local-page.css';

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const dateOf = (lang: Lang, iso: string) =>
  new Date(iso).toLocaleDateString(L(lang, 'it-IT', 'en-GB'), { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });

async function findBarber(slug: string) {
  const barbers = await getBarbers();
  return barbers.find((b) => barberSlug(b.name) === slug) ?? null;
}

export async function barberMetadata(lang: Lang, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const b = await findBarber(slug);
  if (!b) return {};
  const desc =
    lang === 'en'
      ? `${b.name}, ${barberRole(lang, b.role).toLowerCase()} at Barberia Garofalo in Foggia. Working days and online booking.`
      : `${b.name}, ${barberRole(lang, b.role).toLowerCase()} alla Barberia Garofalo di Foggia. Giorni di lavoro e prenotazione online.`;
  return {
    title: L(lang, `${b.name} · Barbiere a Foggia`, `${b.name} · Barber in Foggia`),
    description: desc,
    alternates: alternatesFor(`/team/${slug}`, lang),
    openGraph: {
      title: `${b.name} | ${SITE_CONFIG.name}`,
      description: desc,
      images: b.image_url ? [{ url: b.image_url }] : undefined,
      ...(lang === 'en' ? { locale: OG_LOCALE.en } : {}),
    },
  };
}

export default async function BarberView({ lang, params }: { lang: Lang; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [b, all] = await Promise.all([findBarber(slug), getBarbers()]);
  if (!b) notFound();
  const week = await getBarberWorkWeek(b.id);
  const extra = (lang === 'en' ? TEAM_EXTRA_EN[slug] ?? TEAM_EXTRA[slug] : TEAM_EXTRA[slug]) ?? {};
  const name = firstName(b.name);
  const others = all.filter((x) => x.id !== b.id);
  const workDays = week.days.filter((d) => d.periods.length > 0);

  return (
    <div className="public-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: b.name,
          jobTitle: barberRole(lang, b.role),
          image: b.image_url ? `${SITE_URL}${b.image_url}` : undefined,
          worksFor: { '@id': `${SITE_URL}/#barberia` },
          url: `${SITE_URL}${localHref(lang, `/team/${slug}`)}`,
        }}
      />
      <JsonLd data={breadcrumbJsonLd([
          { name: 'Home', path: localHref(lang, '/') },
          { name: L(lang, 'Il team', 'The team'), path: localHref(lang, '/team') },
          { name: b.name, path: localHref(lang, `/team/${slug}`) },
        ])} />

      <section className="section" style={{ paddingTop: '7rem' }}>
        <div className="container-lux">
          <Link href="/team" className="jr-back">
            <ArrowLeft size={14} aria-hidden /> {L(lang, 'Il team', 'The team')}
          </Link>
          <div className="tm-hero">
            <div className="tm-hero-photo">
              <Image src={b.image_url ?? '/assets/sostituisci-immagini/team/luigi-garofalo.png'} alt={b.name} fill priority sizes="(max-width: 900px) 100vw, 420px" className="object-cover object-top" />
            </div>
            <div>
              <p className="jr-meta">{barberRole(lang, b.role)}</p>
              <h1 className="hero-heading tm-title">{b.name}</h1>
              {b.bio && <p className="cp-lead" style={{ marginBottom: '1rem' }}>{b.bio}</p>}
              {extra.intro && <p className="cp-lead">{extra.intro}</p>}
              {!b.bio && !extra.intro && (
                <p className="cp-lead">
                  {L(lang, 'Fa parte del team della Barberia Garofalo: stessa cura e stessa attenzione su ogni cliente.', 'Part of the Barberia Garofalo team: the same care and attention for every client.')}
                </p>
              )}
              {extra.facts && (
                <ul className="tm-facts">
                  {extra.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {extra.quote && <p className="jr-tip">“{extra.quote}”</p>}

              {week.away && (
                <p className="tm-away" role="status">
                  {lang === 'en'
                    ? `Away from ${dateOf(lang, week.away.from)} to ${dateOf(lang, week.away.to)}.`
                    : `Assente dal ${dateOf(lang, week.away.from)} al ${dateOf(lang, week.away.to)}.`}
                </p>
              )}

              <div className="cp-cta-actions" style={{ justifyContent: 'flex-start', marginTop: '1.5rem' }}>
                <Link href={`/prenota?barber=${slug}`} className="btn-primary">
                  <CalendarCheck size={16} aria-hidden /> {L(lang, 'Prenota con', 'Book with')} {name}
                </Link>
                <a href={getWhatsAppLink(L(lang, `Ciao! Vorrei prenotare con ${name}.`, `Hi! I’d like to book with ${name}.`))} target="_blank" rel="noopener noreferrer" className="cp-ghost">
                  <MessageCircle size={16} aria-hidden /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-lux cp-wrap">
          <h2 className="cp-h2">{L(lang, `Quando trovi ${name}`, `When you can find ${name}`)}</h2>
          {workDays.length === 0 ? (
            <p className="cp-lead">
              {L(lang, 'In questo periodo gli orari non sono pubblicati. Scrivici su WhatsApp per sapere quando c’è.', `The hours for this period haven’t been published. Message us on WhatsApp to find out when ${name} is in.`)}
            </p>
          ) : (
            <dl className="lp-hours">
              {week.days.map((d) => (
                <div key={d.dayOfWeek}>
                  <dt>{dayName(lang, DAYS[d.dayOfWeek])}</dt>
                  <dd>{d.periods.length ? d.periods.map((p) => `${p.start}–${p.end}`).join(' · ') : L(lang, 'Non in salone', 'Not in')}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="cp-hint">
            {L(lang, 'Lunedì e domenica il salone è chiuso. Gli orari liberi aggiornati li vedi quando prenoti.', 'The barbershop is closed on Monday and Sunday. You’ll see the up-to-date free times when you book.')}
          </p>
        </div>
      </section>

      {others.length > 0 && (
        <section className="section pb-24">
          <div className="container-lux cp-wrap">
            <h2 className="cp-h2">{L(lang, 'Il resto del team', 'The rest of the team')}</h2>
            <ul className="lp-others">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/team/${barberSlug(o.name)}`}>
                    {o.name} <span className="text-xs text-white/60">{barberRole(lang, o.role)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
