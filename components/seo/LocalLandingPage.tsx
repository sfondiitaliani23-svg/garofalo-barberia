import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { getServices } from '@/lib/actions/bookings';
import { LOCAL_PAGES, getLocalPage } from '@/lib/data/local-pages';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import './local-page.css';

const euro = (c: number) => `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

export function localPageMetadata(slug: string) {
  const page = getLocalPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: `${page.title} | ${SITE_CONFIG.name}`, description: page.description, images: [{ url: page.image }] },
  };
}

export async function LocalLandingPage({ slug }: { slug: string }) {
  const page = getLocalPage(slug);
  if (!page) notFound();

  const all = await getServices();
  const services = all.filter((s) => page.categories.includes(s.category));
  const others = LOCAL_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <div className="public-page lp">
      <JsonLd data={localBusinessJsonLd(services)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: page.h1, path: `/${page.slug}` }])} />
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
              Prenota online
            </Link>
            <a href={getWhatsAppLink()} className="lp-ghost" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden /> Scrivici su WhatsApp
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
            <h2 className="lp-h2">Prezzi</h2>
            <ul className="lp-prices">
              {services.map((s) => (
                <li key={s.id} className="lp-price-row">
                  <div className="min-w-0">
                    <p className="lp-price-name">{s.name}</p>
                    <p className="lp-price-meta">{s.duration_minutes} min</p>
                  </div>
                  <span className="lp-price-value">{euro(s.price_cents)}</span>
                  <Link href={`/prenota?service=${encodeURIComponent(s.name)}`} className="lp-price-cta" aria-label={`Prenota ${s.name}`}>
                    Prenota <ArrowRight size={14} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="lp-note">
              Prezzi aggiornati dal listino del salone. <Link href="/servizi">Vedi tutti i servizi</Link>.
            </p>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-lux max-w-3xl">
          <h2 className="lp-h2">Domande frequenti</h2>
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
            <h2 className="lp-h2">Dove siamo</h2>
            <p className="lp-address">
              <MapPin size={16} aria-hidden /> {SITE_CONFIG.address}
            </p>
            <dl className="lp-hours">
              {SITE_CONFIG.hours.map((h) => (
                <div key={h.day}>
                  <dt>{h.day}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
            <a href={SITE_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="lp-link">
              Apri in Google Maps
            </a>
          </div>
          <div>
            <h2 className="lp-h2">Altri servizi a Foggia</h2>
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
                  Guarda la galleria <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
