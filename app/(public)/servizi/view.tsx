import { LocLink as Link } from '@/components/i18n/LocLink';
import { ServicesGrid } from '@/components/servizi/ServicesGrid';
import { ActivePromotions } from '@/components/servizi/ActivePromotions';
import { ServiceGuide } from '@/components/servizi/ServiceGuide';
import { getServices } from '@/lib/actions/bookings';
import { getActivePromotions } from '@/lib/actions/promotions';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/data/services';
import { L, type Lang } from '@/lib/i18n';
import { serviceName } from '@/lib/i18n/content-en';
import { CATEGORY_META_EN } from '@/lib/i18n/content-servizi';
import type { Service } from '@/types/database';
import '../public-pages.css';

function groupServices(services: Service[], lang: Lang) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: (lang === 'en' ? CATEGORY_META_EN : CATEGORY_META)[category].label,
    subtitle: (lang === 'en' ? CATEGORY_META_EN : CATEGORY_META)[category].subtitle,
    items: services
      .filter((s) => s.category === category)
      .map((s) => ({
        id: s.id,
        name: serviceName(lang, s.name),
        price_cents: s.price_cents,
        duration_minutes: s.duration_minutes,
      })),
  })).filter((group) => group.items.length > 0);
}

export default async function ServiziView({ lang }: { lang: Lang }) {
  const [services, promotions] = await Promise.all([getServices(), getActivePromotions()]);
  const groups = groupServices(services, lang);

  return (
    <div className="public-page">
      <section className="page-hero">
        <div className="container-lux">
          <div className="eyebrow justify-center">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">{L(lang, 'Listino', 'Price list')}</span>
            <div className="eyebrow-line" />
          </div>
          <h1 className="hero-heading">{L(lang, 'Servizi & Prezzi', 'Services & Prices')}</h1>
          <p className="hero-sub max-w-xl">
            {L(lang, 'Sfoglia il menù, apri la categoria che ti interessa e prenota in un click.', 'Browse the price list, open the category you are interested in and book in one click.')}
          </p>
          <a href="#guida" className="mt-4 inline-block text-sm text-gold-light underline underline-offset-4">
            {L(lang, 'Non sai cosa scegliere? Usa la guida', 'Not sure what to choose? Use the guide')}
          </a>
        </div>
      </section>

      <section className="section section-white pb-24">
        <div className="container-lux max-w-5xl">
          <ActivePromotions promotions={promotions} lang={lang} />
          <ServicesGrid groups={groups} />
          <ServiceGuide
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              category: s.category,
              price_cents: s.price_cents,
              duration_minutes: s.duration_minutes,
            }))}
          />

          <div className="mt-12 text-center">
            <p className="mb-4 text-sm text-white/60">
              {L(lang, 'Shampoo e consulenza styling inclusi con ogni taglio.', 'Shampoo and styling advice included with every haircut.')}
            </p>
            <Link href="/prenota" className="btn-primary">
              {L(lang, 'Prenota ora', 'Book now')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}