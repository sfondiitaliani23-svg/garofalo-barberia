import Link from 'next/link';
import { ServicesGrid } from '@/components/servizi/ServicesGrid';
import { ActivePromotions } from '@/components/servizi/ActivePromotions';
import { ServiceGuide } from '@/components/servizi/ServiceGuide';
import { getServices } from '@/lib/actions/bookings';
import { getActivePromotions } from '@/lib/actions/promotions';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/data/services';
import type { Service, ServiceCategory } from '@/types/database';
import '../public-pages.css';

export const metadata = {
  title: 'Servizi e prezzi',
  description: "Listino della Barberia Garofalo a Foggia: taglio e shampoo, taglio baby, barba rasata, a forbici o con panno caldo. Prezzi chiari, prenotazione online.",
  alternates: { canonical: '/servizi' },
};
export const revalidate = 120;

function groupServices(services: Service[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_META[category].label,
    subtitle: CATEGORY_META[category].subtitle,
    items: services
      .filter((s) => s.category === category)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price_cents: s.price_cents,
        duration_minutes: s.duration_minutes,
      })),
  })).filter((group) => group.items.length > 0);
}

export default async function ServiziPage() {
  const [services, promotions] = await Promise.all([getServices(), getActivePromotions()]);
  const groups = groupServices(services);

  return (
    <div className="public-page">
      <section className="page-hero">
        <div className="container-lux">
          <div className="eyebrow justify-center">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">Listino</span>
            <div className="eyebrow-line" />
          </div>
          <h1 className="hero-heading">Servizi &amp; Prezzi</h1>
          <p className="hero-sub max-w-xl">
            Sfoglia il menù, apri la categoria che ti interessa e prenota in un click.
          </p>
          <a href="#guida" className="mt-4 inline-block text-sm text-gold-light underline underline-offset-4">
            Non sai cosa scegliere? Usa la guida
          </a>
        </div>
      </section>

      <section className="section section-white pb-24">
        <div className="container-lux max-w-5xl">
          <ActivePromotions promotions={promotions} />
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
              Shampoo e consulenza styling inclusi con ogni taglio.
            </p>
            <Link href="/prenota" className="btn-primary">
              Prenota ora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}