import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarCheck, MessageCircle } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { getBarbers } from '@/lib/actions/bookings';
import { getBarberWorkWeek } from '@/lib/actions/availability';
import { TEAM_EXTRA } from '@/lib/data/team';
import { barberSlug, firstName } from '@/lib/utils/barber-slug';
import { isBarberAllowedForCut } from '@/lib/utils/barber-schedule';
import { formatBarberRole } from '@/lib/utils';
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '@/components/content/content.css';
import '@/components/seo/local-page.css';

export const revalidate = 300;

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const dateIt = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });

async function findBarber(slug: string) {
  const barbers = await getBarbers();
  return barbers.find((b) => barberSlug(b.name) === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await findBarber(slug);
  if (!b) return {};
  const desc = `${b.name}, ${formatBarberRole(b.role).toLowerCase()} alla Barberia Garofalo di Foggia. Giorni di lavoro e prenotazione online.`;
  return {
    title: `${b.name} · Barbiere a Foggia`,
    description: desc,
    alternates: { canonical: `/team/${slug}` },
    openGraph: { title: `${b.name} | ${SITE_CONFIG.name}`, description: desc, images: b.image_url ? [{ url: b.image_url }] : undefined },
  };
}

export default async function BarberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [b, all] = await Promise.all([findBarber(slug), getBarbers()]);
  if (!b) notFound();
  const week = await getBarberWorkWeek(b.id);
  const extra = TEAM_EXTRA[slug] ?? {};
  const name = firstName(b.name);
  const cuts = isBarberAllowedForCut(b.name);
  const others = all.filter((x) => x.id !== b.id);
  const workDays = week.days.filter((d) => d.periods.length > 0);

  return (
    <div className="public-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: b.name,
          jobTitle: formatBarberRole(b.role),
          image: b.image_url ? `${SITE_URL}${b.image_url}` : undefined,
          worksFor: { '@id': `${SITE_URL}/#barberia` },
          url: `${SITE_URL}/team/${slug}`,
        }}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Il team', path: '/team' }, { name: b.name, path: `/team/${slug}` }])} />

      <section className="section" style={{ paddingTop: '7rem' }}>
        <div className="container-lux">
          <Link href="/team" className="jr-back">
            <ArrowLeft size={14} aria-hidden /> Il team
          </Link>
          <div className="tm-hero">
            <div className="tm-hero-photo">
              <Image src={b.image_url ?? '/assets/sostituisci-immagini/team/luigi-garofalo.png'} alt={b.name} fill priority sizes="(max-width: 900px) 100vw, 420px" className="object-cover object-top" />
            </div>
            <div>
              <p className="jr-meta">{formatBarberRole(b.role)}</p>
              <h1 className="hero-heading tm-title">{b.name}</h1>
              {b.bio && <p className="cp-lead" style={{ marginBottom: '1rem' }}>{b.bio}</p>}
              {extra.intro && <p className="cp-lead">{extra.intro}</p>}
              {!b.bio && !extra.intro && (
                <p className="cp-lead">Fa parte del team della Barberia Garofalo: stessa cura e stessa attenzione su ogni cliente.</p>
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
                  Assente dal {dateIt(week.away.from)} al {dateIt(week.away.to)}.
                </p>
              )}

              <div className="cp-cta-actions" style={{ justifyContent: 'flex-start', marginTop: '1.5rem' }}>
                <Link href={`/prenota?barber=${slug}`} className="btn-primary">
                  <CalendarCheck size={16} aria-hidden /> Prenota con {name}
                </Link>
                <a href={getWhatsAppLink(`Ciao! Vorrei prenotare con ${name}.`)} target="_blank" rel="noopener noreferrer" className="cp-ghost">
                  <MessageCircle size={16} aria-hidden /> WhatsApp
                </a>
              </div>
              {!cuts && (
                <p className="cp-hint" style={{ marginTop: '0.75rem' }}>
                  Online con {name} puoi prenotare barba e piega. Per un taglio con {name}, scrivici su WhatsApp.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-lux cp-wrap">
          <h2 className="cp-h2">Quando trovi {name}</h2>
          {workDays.length === 0 ? (
            <p className="cp-lead">In questo periodo gli orari non sono pubblicati. Scrivici su WhatsApp per sapere quando c’è.</p>
          ) : (
            <dl className="lp-hours">
              {week.days.map((d) => (
                <div key={d.dayOfWeek}>
                  <dt>{DAYS[d.dayOfWeek]}</dt>
                  <dd>{d.periods.length ? d.periods.map((p) => `${p.start}–${p.end}`).join(' · ') : 'Non in salone'}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="cp-hint">Lunedì e domenica il salone è chiuso. Gli orari liberi aggiornati li vedi quando prenoti.</p>
        </div>
      </section>

      {others.length > 0 && (
        <section className="section pb-24">
          <div className="container-lux cp-wrap">
            <h2 className="cp-h2">Il resto del team</h2>
            <ul className="lp-others">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/team/${barberSlug(o.name)}`}>
                    {o.name} <span className="text-xs text-white/45">{formatBarberRole(o.role)}</span>
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
