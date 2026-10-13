import Link from 'next/link';
import { Instagram } from 'lucide-react';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getActivePromotions } from '@/lib/actions/promotions';
import { formatDiscountLabel } from '@/lib/utils/promotions';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import '@/components/content/content.css';

export const revalidate = 120;
export const metadata = {
  title: 'Offerte',
  description: 'Le offerte attive da Barberia Garofalo a Foggia. Prenota online e lo sconto si applica da solo.',
  alternates: { canonical: '/offerte' },
};

const dateIt = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });

export default async function OffertePage() {
  const promos = await getActivePromotions();

  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Offerte', path: '/offerte' }])} />
      <ContentHero eyebrow="Offerte" title="Le offerte di adesso" sub="Solo offerte valide oggi. Prenota online e lo sconto si applica da solo." />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          {promos.length === 0 ? (
            <div className="of-empty">
              <h2>Al momento non ci sono offerte attive</h2>
              <p>Le annunciamo sul sito e su Instagram. Torna a trovarci presto.</p>
              <div className="cp-cta-actions mt-5">
                <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <Instagram size={16} aria-hidden /> Seguici su Instagram
                </a>
                <Link href="/servizi" className="cp-ghost">Vedi i servizi</Link>
              </div>
            </div>
          ) : (
            <div className="of-list">
              {promos.map((p) => (
                <article key={p.id} className="of-card">
                  <div className="of-badge">{formatDiscountLabel(p.discount_type, p.discount_value)}</div>
                  <div className="of-body">
                    <h2 className="of-title">{p.title}</h2>
                    {p.description && <p className="of-desc">{p.description}</p>}
                    <p className="of-meta">
                      {p.service?.name ?? 'Su tutti i servizi'}
                      {p.ends_at && <> · valida fino al {dateIt(p.ends_at)}</>}
                    </p>
                    {p.code && (
                      <p className="of-code">
                        Codice da inserire in prenotazione: <strong>{p.code}</strong>
                      </p>
                    )}
                    <Link
                      href={p.service?.name ? `/prenota?service=${encodeURIComponent(p.service.name)}` : '/prenota'}
                      className="btn-primary of-cta"
                    >
                      Prenota con l’offerta
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
