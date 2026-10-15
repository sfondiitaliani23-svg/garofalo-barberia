import { LocLink as Link } from '@/components/i18n/LocLink';
import { Instagram } from 'lucide-react';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getActivePromotions } from '@/lib/actions/promotions';
import { formatDiscountLabel } from '@/lib/utils/promotions';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import { L, type Lang } from '@/lib/i18n';
import { serviceName } from '@/lib/i18n/content-en';
import '@/components/content/content.css';

const dateIt = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });

export default async function OfferteView({ lang }: { lang: Lang }) {
  const promos = await getActivePromotions();

  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd(lang === 'en'
            ? [{ name: 'Home', path: '/en' }, { name: 'Offers', path: '/en/offerte' }]
            : [{ name: 'Home', path: '/' }, { name: 'Offerte', path: '/offerte' }])} />
      <ContentHero
        eyebrow={L(lang, 'Offerte', 'Offers')}
        title={L(lang, 'Le offerte di adesso', 'Our offers right now')}
        sub={L(lang, 'Solo offerte valide oggi. Prenota online e lo sconto si applica da solo.', 'Only offers valid today. Book online and the discount applies by itself.')}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          {promos.length === 0 ? (
            <div className="of-empty">
              <h2>{L(lang, 'Al momento non ci sono offerte attive', 'There are no active offers at the moment')}</h2>
              <p>{L(lang, 'Le annunciamo sul sito e su Instagram. Torna a trovarci presto.', 'We announce them on the website and on Instagram. Come back and see us soon.')}</p>
              <div className="cp-cta-actions mt-5">
                <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <Instagram size={16} aria-hidden /> {L(lang, 'Seguici su Instagram', 'Follow us on Instagram')}
                </a>
                <Link href="/servizi" className="cp-ghost">{L(lang, 'Vedi i servizi', 'See the services')}</Link>
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
                      {p.service?.name ? serviceName(lang, p.service.name) : L(lang, 'Su tutti i servizi', 'On all services')}
                      {p.ends_at && (
                        <>
                          {' '}
                          · {L(lang, 'valida fino al', 'valid until')} {dateIt(p.ends_at, lang)}
                        </>
                      )}
                    </p>
                    {p.code && (
                      <p className="of-code">
                        {L(lang, 'Codice da inserire in prenotazione:', 'Code to enter when booking:')} <strong>{p.code}</strong>
                      </p>
                    )}
                    <Link
                      href={p.service?.name ? `/prenota?service=${encodeURIComponent(p.service.name)}` : '/prenota'}
                      className="btn-primary of-cta"
                    >
                      {L(lang, 'Prenota con l’offerta', 'Book with the offer')}
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
