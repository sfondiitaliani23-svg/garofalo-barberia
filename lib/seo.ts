import { SITE_CONFIG } from '@/lib/site-config';
import { publicPeriodsForDay } from '@/lib/utils/open-now';

/** Indirizzo pubblico principale del sito (usato da sitemap, canonical e dati strutturati). */
export const SITE_URL = 'https://barberiagarofalo.it';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Orari in formato schema.org, gli stessi mostrati nella pagina Contatti. */
export function openingHoursSpecification() {
  const spec: { '@type': 'OpeningHoursSpecification'; dayOfWeek: string; opens: string; closes: string }[] = [];
  for (let d = 0; d < 7; d++) {
    for (const p of publicPeriodsForDay(d)) {
      spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_NAMES[d], opens: p.start, closes: p.end });
    }
  }
  return spec;
}

type SeoService = { name: string; price_cents: number; duration_minutes?: number };

/** Scheda "attività locale" per Google (HairSalon). */
export function localBusinessJsonLd(services: SeoService[] = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': `${SITE_URL}/#barberia`,
    name: SITE_CONFIG.name,
    description: 'Barberia a Foggia: taglio uomo, taglio ragazzo e bimbo, barba con rasoio, forbici o panno caldo. Prenotazione online.',
    url: SITE_URL,
    telephone: SITE_CONFIG.phone,
    image: `${SITE_URL}/icon.png`,
    logo: `${SITE_URL}/icon.png`,
    priceRange: '€',
    currenciesAccepted: 'EUR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.addressShort,
      addressLocality: 'Foggia',
      postalCode: '71122',
      addressRegion: 'FG',
      addressCountry: 'IT',
    },
    hasMap: SITE_CONFIG.googleMapsUrl,
    areaServed: { '@type': 'City', name: 'Foggia' },
    sameAs: [SITE_CONFIG.instagram.split('?')[0]],
    openingHoursSpecification: openingHoursSpecification(),
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/prenota`, inLanguage: 'it-IT' },
      result: { '@type': 'Reservation', name: 'Appuntamento in barberia' },
    },
    ...(services.length > 0
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Listino servizi',
            itemListElement: services.map((s) => ({
              '@type': 'Offer',
              price: (s.price_cents / 100).toFixed(2),
              priceCurrency: 'EUR',
              itemOffered: { '@type': 'Service', name: s.name },
            })),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

/** Testo sicuro da mettere dentro <script type="application/ld+json">. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
