/**
 * Versioni inglesi dei dati fissi della home (listino, strip foto, profumi, recensioni di esempio).
 * Gli originali italiani restano in lib/data/homepage.ts.
 */
import type { Lang } from './index';
import { serviceName } from './content-en';
import { PRICE_LIST, PHOTO_STRIP, PERFUMES, REVIEWS } from '@/lib/data/homepage';

export interface HomePerfumeNote {
  label: string;
  value: string;
}
export interface HomePerfume {
  name: string;
  image: string;
  lead: string;
  body: string;
  notes: readonly HomePerfumeNote[];
  footer?: string | null;
}

export function priceList(lang: Lang): { name: string; price: string }[] {
  return PRICE_LIST.map((i) => ({ name: serviceName(lang, i.name), price: i.price }));
}

const PHOTO_ALT_EN = [
  'Shave and beard care in the barbershop',
  'Professional beard treatment',
  'Beard and haircut in the barbershop',
  'Close-up of beard care',
];

export function photoStrip(lang: Lang): { src: string; alt: string }[] {
  return PHOTO_STRIP.map((p, i) => ({ src: p.src, alt: lang === 'en' ? PHOTO_ALT_EN[i] ?? p.alt : p.alt }));
}

const PERFUMES_EN: Omit<HomePerfume, 'name' | 'image'>[] = [
  {
    lead: 'Mood Velvet Eau De Parfum is an oriental floral fragrance.',
    body: 'A lively, sensual perfume for the passionate woman.',
    notes: [
      { label: 'Top notes', value: 'Fruity notes, saffron.' },
      { label: 'Heart notes', value: 'Amber, jasmine.' },
      { label: 'Base notes', value: 'Moss, caramel, musk, powdery accord.' },
    ],
    footer: 'Mood Velvet perfume',
  },
  {
    lead: 'Mood Fancy is fruity and citrusy: lush, bright and smooth, above all exuberant.',
    body: 'With citrus top notes of orange, bergamot and Sicilian lemons, a heart full of Mediterranean fruits, and a base of musk, vanilla and amber.',
    notes: [],
    footer: null,
  },
  {
    lead: 'Fruity and woody, so vibrant, impetuous and fearless, above all, valiant.',
    body: 'With its fruity and spicy top mix of pineapple, blackcurrant and pink pepper, a heart of patchouli, leather and lavender, and a base of white musk and grey amber.',
    notes: [],
    footer: null,
  },
  {
    lead: 'Mood Aroma is floral and oriental: captivating, sweet and dynamic, above all intense.',
    body: 'With coffee accords and floral notes, a woody and floral heart, and a base of amber and gourmand accords.',
    notes: [],
    footer: null,
  },
];

export function perfumes(lang: Lang): HomePerfume[] {
  return PERFUMES.map((p, i) =>
    lang === 'en' && PERFUMES_EN[i]
      ? { name: p.name, image: p.image, ...PERFUMES_EN[i] }
      : { name: p.name, image: p.image, lead: p.lead, body: p.body, notes: p.notes, footer: p.footer },
  );
}

const REVIEWS_EN = [
  'Finally a real barbershop. Professional, friendly, and the price is fair. I always go back.',
  'I have been bringing my 5-year-old son for three years. He is not afraid, the atmosphere is calm. Highly recommended.',
  'Precise, quick and reliable cuts. Perfect if you are short on time but do not want to compromise.',
];

export function sampleReviews(lang: Lang): { text: string; author: string }[] {
  return REVIEWS.map((r, i) => ({ text: lang === 'en' ? REVIEWS_EN[i] ?? r.text : r.text, author: r.author }));
}
