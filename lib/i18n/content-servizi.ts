/**
 * Versioni inglesi dei testi fissi nel codice per servizi, offerte, prodotti e pagine locali.
 * Nomi e descrizioni che arrivano dal database restano in italiano se qui manca la traduzione.
 */
import type { ServiceCategory } from '@/types/database';
import type { LocalPage } from '@/lib/data/local-pages';
import type { Lang } from './index';

export const CATEGORY_META_EN: Record<ServiceCategory, { label: string; subtitle: string }> = {
  taglio: { label: 'Haircut', subtitle: 'Precise cuts, shampoo included' },
  baby: { label: 'Kids', subtitle: 'First haircuts, with calm and patience' },
  barba: { label: 'Beard', subtitle: 'Professional shaves and beard shaping' },
  styling: { label: 'Styling', subtitle: 'Hairstyling and finishing touches' },
};

export const BABY_NOTE_EN =
  'We know that taking a child to the barber can be an adventure. Here we take all the time needed: no rush, no pressure. If it is the first time, mention it in the notes when you book.';

type LocalText = Pick<LocalPage, 'title' | 'description' | 'eyebrow' | 'h1' | 'intro' | 'imageAlt' | 'points' | 'faq'>;

const LOCAL_PAGES_EN: Record<string, LocalText> = {
  'taglio-uomo-foggia': {
    title: 'Men’s haircut in Foggia',
    description:
      'Men’s and teens’ haircuts in Foggia with shampoo included: fades, classic and modern cuts at Barberia Garofalo, Viale Ignazio d’Addedda 236. Book online.',
    eyebrow: 'Men’s haircut · Foggia',
    h1: 'Men’s haircut in Foggia',
    intro:
      'A low fade, a classic cut or something new: first we listen, then we cut. Shampoo is always included, and at the end we style your hair the way you will wear it out the door.',
    imageAlt: 'Men’s haircut at Barberia Garofalo in Foggia',
    points: [
      { title: 'Experience', text: 'Luigi has been doing this job since 2012. Together with Vittorio and Francesco, he brings the same care to every cut.' },
      { title: 'We talk first', text: 'Two minutes to understand your face shape, your habits and how much time you want to spend on your hair each morning.' },
      { title: 'Shampoo included', text: 'Every haircut includes a shampoo. No hidden extras: the price you see is the price you pay.' },
      { title: 'Your time', text: 'Book online by choosing a free day and time. You pay at the barbershop, after the service.' },
    ],
    faq: [
      { q: 'How long does a men’s haircut take?', a: 'About half an hour, shampoo included. The exact length of each service is shown in the price list above.' },
      { q: 'Can I come without an appointment?', a: 'We recommend booking online, so your time is guaranteed. To find out if there is room right now, you can message us on WhatsApp.' },
      { q: 'Can I add a beard service to my haircut?', a: 'Yes. When you book you can choose several services together, for example haircut and beard, and the system works out the time needed.' },
    ],
  },
  'barba-foggia': {
    title: 'Beard in Foggia: razor shave, scissors and hot towel',
    description:
      'Beard care in Foggia at Barberia Garofalo: straight-razor shave, beard trimmed with scissors or a hot-towel treatment. Clear prices, online booking.',
    eyebrow: 'Beard · Foggia',
    h1: 'Beard in Foggia',
    intro:
      'A full straight-razor shave, a short beard shaped with scissors or the hot-towel ritual: choose the service that suits your beard and the time you have.',
    imageAlt: 'Well-groomed beard at Barberia Garofalo in Foggia',
    points: [
      { title: 'Razor', text: 'For a clean shave or to define the edges with precision.' },
      { title: 'Scissors', text: 'For those who wear a beard and want to keep it in shape without losing length.' },
      { title: 'Hot towel', text: 'The hot towel softens hair and skin: a smoother shave and a real moment of relaxation.' },
    ],
    faq: [
      { q: 'What is the difference between the beard services?', a: 'The razor is for shaving or refining the edges, the scissors are for shaping a beard you want to keep, and the hot towel adds skin preparation and relaxation.' },
      { q: 'Can I book just the beard?', a: 'Yes, beard services can be booked on their own. If you like, you can add them to a haircut in the same booking.' },
      { q: 'How often should I have my beard tidied?', a: 'It depends on the length: for a short, defined beard, usually every one or two weeks. Ask us at your next appointment.' },
    ],
  },
  'taglio-bambino-foggia': {
    title: 'Kids’ haircut in Foggia',
    description:
      'Kids’ haircuts in Foggia at Barberia Garofalo: first haircuts and cuts for the little ones, calmly and without rush. Book online by choosing the Kids’ haircut service.',
    eyebrow: 'Kids’ haircut · Foggia',
    h1: 'Kids’ haircut in Foggia',
    intro:
      'Taking a child to the barber can be an adventure. Here we take all the time needed: no rush, no pressure, and a parent always close by.',
    imageAlt: 'Kids’ haircut at Barberia Garofalo in Foggia',
    points: [
      { title: 'Taking our time', text: 'The appointment is planned around little ones: if a break is needed, we take it.' },
      { title: 'First haircut', text: 'If it is the first time, mention it in the notes when you book: we will make it a nice memory.' },
      { title: 'The whole family', text: 'Dad, grandpa and child at the same time: when you book you can choose several services.' },
    ],
    faq: [
      { q: 'From what age do you cut children’s hair?', a: 'We welcome the youngest too, including the first haircut. Write the age in the booking notes so we can prepare.' },
      { q: 'Can the parent stay close by?', a: 'Of course, we even recommend it: for a child, having mum or dad nearby makes all the difference.' },
      { q: 'How do I book a kids’ haircut?', a: 'Online, by choosing the “Kids’ haircut” service, then a free day and time.' },
    ],
  },
};

/** Testi della pagina locale nella lingua richiesta (se manca l'inglese, resta l'italiano). */
export function localPageText(lang: Lang, page: LocalPage): LocalText {
  const en = lang === 'en' ? LOCAL_PAGES_EN[page.slug] : undefined;
  return en ?? page;
}
