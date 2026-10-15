import Image from 'next/image';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicProducts, type PublicProduct } from '@/lib/actions/public-products';
import { PERFUMES } from '@/lib/data/homepage';
import { perfumes as perfumesFor } from '@/lib/i18n/content-home';
import { breadcrumbJsonLd } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/site-config';
import { L, type Lang } from '@/lib/i18n';
import type { ProductCategory } from '@/types/database';
import '@/components/content/content.css';

const CATEGORY: Record<ProductCategory, string> = {
  perfume: 'Profumi',
  cosmetic: 'Capelli e barba',
  accessory: 'Accessori',
  other: 'Altro',
};
const CATEGORY_EN: Record<ProductCategory, string> = {
  perfume: 'Perfumes',
  cosmetic: 'Hair and beard',
  accessory: 'Accessories',
  other: 'Other',
};
const ORDER: ProductCategory[] = ['perfume', 'cosmetic', 'accessory', 'other'];

const euro = (c: number, lang: Lang) =>
  lang === 'en' ? `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}` : `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

function fallback(lang: Lang): PublicProduct[] {
  const localized = perfumesFor(lang);
  return PERFUMES.map((p, i) => ({
    id: `f${i}`,
    name: p.name,
    brand: null,
    category: 'perfume' as const,
    price_cents: null,
    image_url: p.image,
    description: localized[i]?.lead ?? p.lead,
    available: true,
  }));
}

export default async function ProdottiView({ lang }: { lang: Lang }) {
  const live = await getPublicProducts();
  const products = live.length > 0 ? live : fallback(lang);
  const groups = ORDER.map((c) => ({ c, items: products.filter((p) => p.category === c) })).filter((g) => g.items.length);

  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd(lang === 'en'
            ? [{ name: 'Home', path: '/en' }, { name: 'Products', path: '/en/prodotti' }]
            : [{ name: 'Home', path: '/' }, { name: 'Prodotti', path: '/prodotti' }])} />
      <ContentHero
        eyebrow={L(lang, 'Prodotti', 'Products')}
        title={L(lang, 'Da portare a casa', 'To take home')}
        sub={L(lang, 'I prodotti che usiamo e consigliamo. Li trovi in salone: chiedi pure durante il tuo appuntamento.', 'The products we use and recommend. You can find them at the barbershop: just ask during your appointment.')}
      />
      <section className="section pb-24">
        <div className="container-lux">
          {groups.map((g) => (
            <div key={g.c} className="pr-group">
              <h2 className="cp-h2">{(lang === 'en' ? CATEGORY_EN : CATEGORY)[g.c]}</h2>
              <div className="pr-grid">
                {g.items.map((p) => (
                  <article key={p.id} className="pr-card">
                    <div className="pr-img">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                      ) : (
                        <span className="pr-noimg" aria-hidden>{p.name.slice(0, 1)}</span>
                      )}
                      <span className={`pr-stock ${p.available ? 'is-on' : ''}`}>{p.available ? L(lang, 'Disponibile', 'Available') : L(lang, 'Su richiesta', 'On request')}</span>
                    </div>
                    <div className="pr-body">
                      {p.brand && <p className="pr-brand">{p.brand}</p>}
                      <h3 className="pr-name">{p.name}</h3>
                      {p.description && <p className="pr-desc">{p.description}</p>}
                      <p className="pr-price">{p.price_cents != null ? euro(p.price_cents, lang) : L(lang, 'Prezzo in salone', 'Price at the barbershop')}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
          <div className="cp-cta">
            <p>{L(lang, 'Vuoi sapere se un prodotto è disponibile o metterlo da parte?', 'Want to know if a product is available, or have one set aside for you?')}</p>
            <div className="cp-cta-actions">
              <a href={getWhatsAppLink(L(lang, 'Ciao! Vorrei informazioni su un prodotto:', 'Hi! I would like some information about a product:'))} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {L(lang, 'Chiedi su WhatsApp', 'Ask on WhatsApp')}
              </a>
              <Link href="/prenota" className="cp-ghost">{L(lang, 'Prenota un appuntamento', 'Book an appointment')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
