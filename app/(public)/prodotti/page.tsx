import Image from 'next/image';
import Link from 'next/link';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicProducts, type PublicProduct } from '@/lib/actions/public-products';
import { PERFUMES } from '@/lib/data/homepage';
import { breadcrumbJsonLd } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/site-config';
import type { ProductCategory } from '@/types/database';
import '@/components/content/content.css';

export const revalidate = 300;
export const metadata = {
  title: 'Prodotti in salone',
  description: 'Profumi e prodotti per capelli e barba disponibili da Barberia Garofalo a Foggia. Chiedi in salone o su WhatsApp.',
  alternates: { canonical: '/prodotti' },
};

const CATEGORY: Record<ProductCategory, string> = {
  perfume: 'Profumi',
  cosmetic: 'Capelli e barba',
  accessory: 'Accessori',
  other: 'Altro',
};
const ORDER: ProductCategory[] = ['perfume', 'cosmetic', 'accessory', 'other'];

const euro = (c: number) => `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

function fallback(): PublicProduct[] {
  return PERFUMES.map((p, i) => ({
    id: `f${i}`,
    name: p.name,
    brand: null,
    category: 'perfume' as const,
    price_cents: null,
    image_url: p.image,
    description: p.lead,
    available: true,
  }));
}

export default async function ProdottiPage() {
  const live = await getPublicProducts();
  const products = live.length > 0 ? live : fallback();
  const groups = ORDER.map((c) => ({ c, items: products.filter((p) => p.category === c) })).filter((g) => g.items.length);

  return (
    <div className="public-page">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Prodotti', path: '/prodotti' }])} />
      <ContentHero eyebrow="Prodotti" title="Da portare a casa" sub="I prodotti che usiamo e consigliamo. Li trovi in salone: chiedi pure durante il tuo appuntamento." />
      <section className="section pb-24">
        <div className="container-lux">
          {groups.map((g) => (
            <div key={g.c} className="pr-group">
              <h2 className="cp-h2">{CATEGORY[g.c]}</h2>
              <div className="pr-grid">
                {g.items.map((p) => (
                  <article key={p.id} className="pr-card">
                    <div className="pr-img">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                      ) : (
                        <span className="pr-noimg" aria-hidden>{p.name.slice(0, 1)}</span>
                      )}
                      <span className={`pr-stock ${p.available ? 'is-on' : ''}`}>{p.available ? 'Disponibile' : 'Su richiesta'}</span>
                    </div>
                    <div className="pr-body">
                      {p.brand && <p className="pr-brand">{p.brand}</p>}
                      <h3 className="pr-name">{p.name}</h3>
                      {p.description && <p className="pr-desc">{p.description}</p>}
                      <p className="pr-price">{p.price_cents != null ? euro(p.price_cents) : 'Prezzo in salone'}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
          <div className="cp-cta">
            <p>Vuoi sapere se un prodotto è disponibile o metterlo da parte?</p>
            <div className="cp-cta-actions">
              <a href={getWhatsAppLink('Ciao! Vorrei informazioni su un prodotto:')} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Chiedi su WhatsApp
              </a>
              <Link href="/prenota" className="cp-ghost">Prenota un appuntamento</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
