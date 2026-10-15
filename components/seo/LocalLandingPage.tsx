import { LocLink as Link } from '@/components/i18n/LocLink';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { getServices } from '@/lib/actions/bookings';
import { LOCAL_PAGES, getLocalPage } from '@/lib/data/local-pages';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { L, localHref, type Lang } from '@/lib/i18n';
import { alternatesFor, OG_LOCALE } from '@/lib/i18n/seo';
import { dayName, serviceName, timeText } from '@/lib/i18n/content-en';
import { localPageText } from '@/lib/i18n/content-servizi';
import './local-page.css';

const euro = (c: number) => `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

const euroEn = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

export function localPageMetadata(slug: string, lang: Lang = 'it') {
  const base = getLocalPage(slug);
  if (!base) return {};
  const page = { ...base, ...localPageText(lang, base) };
  return {
    title: page.title,
    description: page.description,
    alternates: alternatesFor(`/${page.slug}`, lang),
    openGraph: {
      title: `${page.title} | ${SITE_CONFIG.name}`,
      description: page.description,
      images: [{ url: page.image }],
      ...(lang === 'en' ? { locale: OG_LOCALE.en } : {}),
    },
  };
}

export async function LocalLandingPage({ slug, lang = 'it' }: { slug: string; lang?: Lang }) {
  const base = getLocalPage(slug);
  if (!base) notFound();
  const page = { ...base, ...localPageText(lang, base) };

  const all = await getServices();
  const services = all.filter((s) => page.categories.includes(s.category));
  const others = LOCAL_PAGES.filter((p) => p.slug !== page.slug).map((p) => ({ ...p, ...localPageText(lang, p) }));

  return (
    <div className="public-page lp">
      <JsonLd data={localBusinessJsonLd(services, lang)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: lang === 'en' ? '/en' : '/' }, { name: page.h1, path: localHref(lang, `/${page.slug}`) }])} />
      <JsonLd data={faqJsonLd(page.faq)} />

      <section className="page-hero">
        <div className="container-lux">
          <div className="eyebrow justify-center">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">{page.eyebrow}</span>
            <div className="eyebrow-line" />
          </div>
          <h1 className="hero-heading">{page.h1}</h1>
          <p className="hero-sub mx-auto max-w-2xl">{page.intro}</p>
          <div className="lp-hero-actions">
            <Link href={services.length === 1 ? `/prenota?service=${encodeURIComponent(services[0].name)}` : '/prenota'} className="btn-primary">
              {L(lang, 'Prenota online', 'Book online')}
            </Link>
            <a href={lang === 'en' ? getWhatsAppLink('Hi! I would like to book an appointment at Garofalo Barberia. Can you help me?') : getWhatsAppLink()} className="lp-ghost" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden /> {L(lang, 'Scrivici su WhatsApp', 'Message us on WhatsApp')}
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-lux lp-split">
          <div className="lp-photo">
            <Image src={page.image} alt={page.imageAlt} fill sizes="(max-width: 900px) 100vw, 480px" className="object-cover" />
          </div>
          <div className="lp-points">
            {page.points.map((pt) => (
              <div key={pt.title} className="lp-point">
                <h2 className="lp-point-title">{pt.title}</h2>
                <p>{pt.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <section className="section">
          <div className="container-lux max-w-3xl">
            <h2 className="lp-h2">{L(lang, 'Prezzi', 'Prices')}</h2>
            <ul className="lp-prices">
              {services.map((s) => (
                <li key={s.id} className="lp-price-row">
                  <div className="min-w-0">
                    <p className="lp-price-name">{serviceName(lang, s.name)}</p>
                    <p className="lp-price-meta">{s.duration_minutes} min</p>
                  </div>
                  <span className="lp-price-value">{lang === 'en' ? euroEn(s.price_cents) : euro(s.price_cents)}</span>
                  <Link href={`/prenota?service=${encodeURIComponent(s.name)}`} className="lp-price-cta" aria-label={L(lang, `Prenota ${s.name}`, `Book ${serviceName(lang, s.name)}`)}>
                    {L(lang, 'Prenota', 'Book')} <ArrowRight size={14} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="lp-note">
              {lang === 'en' ? (
                <>
                  Prices updated from the salon’s price list. <Link href="/servizi">See all services</Link>.
                </>
              ) : (
                <>
                  Prezzi aggiornati dal listino del salone. <Link href="/servizi">Vedi tutti i servizi</Link>.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-lux max-w-3xl">
          <h2 className="lp-h2">{L(lang, 'Domande frequenti', 'Frequently asked questions')}</h2>
          <div className="lp-faq">
            {page.faq.map((f) => (
              <details key={f.q} className="lp-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section pb-24">
        <div className="container-lux lp-where">
          <div>
            <h2 className="lp-h2">{L(lang, 'Dove siamo', 'Where we are')}</h2>
            <p className="lp-address">
              <MapPin size={16} aria-hidden /> {SITE_CONFIG.address}
            </p>
            <dl className="lp-hours">
              {SITE_CONFIG.hours.map((h) => (
                <div key={h.day}>
                  <dt>{dayName(lang, h.day)}</dt>
                  <dd>{timeText(lang, h.time)}</dd>
                </div>
              ))}
            </dl>
            <a href={SITE_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="lp-link">
              {L(lang, 'Apri in Google Maps', 'Open in Google Maps')}
            </a>
          </div>
          <div>
            <h2 className="lp-h2">{L(lang, 'Altri servizi a Foggia', 'More services in Foggia')}</h2>
            <ul className="lp-others">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/${o.slug}`}>
                    {o.h1} <ArrowRight size={14} aria-hidden />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/galleria">
                  {L(lang, 'Guarda la galleria', 'See the gallery')} <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
