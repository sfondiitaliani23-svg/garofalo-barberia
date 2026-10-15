/**
 * Versioni inglesi dei testi fissi delle pagine informative:
 * FAQ, articoli base del Journal, categorie.
 * Gli articoli scritti dall'admin nel database restano in italiano se qui manca la traduzione.
 */
import { SITE_CONFIG } from '@/lib/site-config';
import type { FaqGroup, FaqItem } from '@/lib/data/faq';
import { FAQ_GROUPS } from '@/lib/data/faq';
import type { JournalBlock, JournalArticle } from '@/lib/data/journal';
import type { Lang } from './index';

/* ───────────────────────────── FAQ ───────────────────────────── */

export const FAQ_GROUPS_EN: FaqGroup[] = [
  {
    title: 'Booking',
    items: [
      {
        q: 'How do I book an appointment?',
        a: 'Online, from the website: choose the service, the barber and a free time. You get confirmation straight away. If you prefer, you can also message us on WhatsApp.',
        link: { href: '/prenota', label: 'Book online' },
      },
      {
        q: 'Can I book more than one service together?',
        a: 'Yes. In the booking you can choose several services, for example haircut and beard. The system works out the total time by itself and only shows you the times when there is room.',
      },
      {
        q: 'Can I come without an appointment?',
        a: 'We recommend booking: your time is guaranteed and you do not have to wait. To find out if there is room right now, message us on WhatsApp.',
      },
      {
        q: 'Will I get a reminder?',
        a: 'Yes. If you leave your email, you get the confirmation straight away and a reminder the evening before your appointment.',
      },
      {
        q: 'How do I cancel or reschedule an appointment?',
        a: `From your account, up to ${SITE_CONFIG.cancellationMinutes} minutes before your appointment. Or message us on WhatsApp: that way we can free the spot for another client.`,
        link: { href: '/area-cliente/appuntamenti', label: 'Go to your appointments' },
      },
    ],
  },
  {
    title: 'Services and prices',
    items: [
      {
        q: 'Is shampoo included in the haircut?',
        a: 'Yes, every haircut includes a shampoo. The prices on the price list are what you pay, with no extra charges.',
        link: { href: '/servizi', label: 'See the price list' },
      },
      {
        q: 'What is the difference between the beard services?',
        a: 'The razor is for shaving or defining the edges. The scissors are for shaping a beard you want to keep. The hot towel adds skin preparation and relaxation.',
        link: { href: '/barba-foggia', label: 'Learn more about beard care' },
      },
      {
        q: 'I do not know which service to choose. What can I do?',
        a: 'Use the guide on the Services page: a few questions and we suggest the right service.',
        link: { href: '/servizi#guida', label: 'Open the guide' },
      },
      {
        q: 'When do I pay?',
        a: 'At the barbershop, after the service. You do not pay anything online.',
      },
    ],
  },
  {
    title: 'Kids',
    items: [
      {
        q: 'Do you cut children’s hair too?',
        a: 'Yes, including the very first haircut. We take all the time that is needed. Choose the “Kids’ haircut” service when you book.',
        link: { href: '/taglio-bambino-foggia', label: 'Kids’ haircut' },
      },
      {
        q: 'It is my child’s first haircut. What should I do?',
        a: 'Write it in the booking notes. We will make it a calm moment. A parent can always stay close.',
        link: { href: '/journal/primo-taglio-bambino', label: 'Read our tips' },
      },
    ],
  },
  {
    title: 'The barbershop',
    items: [
      {
        q: 'Where are you?',
        a: `At ${SITE_CONFIG.address}. You will find the map on the Contact page.`,
        link: { href: '/contatti', label: 'Contact and map' },
      },
      {
        q: 'What are your opening hours?',
        a: 'Tuesday to Saturday, morning and afternoon. We are closed on Monday and Sunday. The exact hours are on the Contact page and at the bottom of every page.',
      },
      {
        q: 'How can I share my opinion?',
        a: 'You can leave a review on the website or send us anonymous feedback: we always read it.',
        link: { href: '/feedback', label: 'Leave feedback' },
      },
    ],
  },
];

export function faqGroups(lang: Lang): FaqGroup[] {
  return lang === 'en' ? FAQ_GROUPS_EN : FAQ_GROUPS;
}

export function allFaq(lang: Lang): FaqItem[] {
  return faqGroups(lang).flatMap((g) => g.items);
}

/* ─────────────────────────── Journal ─────────────────────────── */

const CATEGORY_EN: Record<string, string> = {
  Capelli: 'Hair',
  Bambini: 'Kids',
  Barba: 'Beard',
  Consigli: 'Tips',
};

export function categoryName(lang: Lang, category: string): string {
  return lang === 'en' ? (CATEGORY_EN[category] ?? category) : category;
}

type ArticleEn = {
  title: string;
  description: string;
  imageAlt: string;
  ctaLabel: string;
  blocks: JournalBlock[];
};

const JOURNAL_EN: Record<string, ArticleEn> = {
  'ogni-quanto-tagliare-i-capelli': {
    title: 'How often should you get a haircut? It depends on the cut',
    description: 'Fade, classic cut or longer hair: how often to come back to the barber to keep your cut looking sharp.',
    imageAlt: 'A low fade, freshly finished',
    ctaLabel: 'Book your next haircut',
    blocks: [
      { type: 'p', text: 'There is no rule that fits everyone. One thing matters most: how short the cut is on the sides. The shorter it is, the sooner you can see that the hair has grown.' },
      { type: 'h2', text: 'Fades and very short cuts' },
      { type: 'p', text: 'A fade loses its definition quickly. After two or three weeks the line softens and the contrast between the sides and the top weakens.' },
      { type: 'list', items: ['Skin fade or high fade: every 2–3 weeks.', 'Mid or low fade: every 3–4 weeks.'] },
      { type: 'h2', text: 'Classic cuts and medium length' },
      { type: 'p', text: 'With scissors and more length on the sides, the cut grows out more evenly. Here you can wait longer.' },
      { type: 'list', items: ['Short classic cut: every 4–5 weeks.', 'Medium or long hair: every 6–8 weeks, to tidy the ends and the shape.'] },
      { type: 'tip', text: 'A simple trick: when you book, note down the date of your next haircut straight away. That way you are never “out of shape”.' },
      { type: 'h2', text: 'And the beard?' },
      { type: 'p', text: 'A short, defined beard should be tidied every 1–2 weeks. A long beard lasts longer, but the edges need fixing at least once a month.' },
    ],
  },
  'primo-taglio-bambino': {
    title: 'A child’s first haircut: how to prepare',
    description: 'Practical tips to make the first visit to the barber a calm moment, for the child and for the parents.',
    imageAlt: 'The Barberia Garofalo barbershop in Foggia',
    ctaLabel: 'Book the kids’ haircut',
    blocks: [
      { type: 'p', text: 'For a child, the barbershop is a new place: noises, a high chair, a cape, a person they do not know. With a few small steps, the first haircut becomes a nice memory.' },
      { type: 'h2', text: 'Before you come' },
      { type: 'list', items: ['Choose a time when your child is rested, not close to nap time.', 'Tell them what will happen in simple words: “we will tidy your hair just like daddy’s”.', 'When you book, write in the notes that it is the first haircut.'] },
      { type: 'h2', text: 'At the barbershop' },
      { type: 'p', text: 'A parent can always stay close. We take it slowly and make pauses when needed: no rush, no pressure.' },
      { type: 'tip', text: 'A little toy or a cartoon on the phone helps a lot to keep still for a few minutes.' },
      { type: 'h2', text: 'After the haircut' },
      { type: 'p', text: 'Many parents keep a lock of hair from the first haircut. If you would like that, tell us before we start.' },
    ],
  },
  'barba-lama-forbici-panno-caldo': {
    title: 'Razor, scissors or hot towel: which beard service to choose',
    description: 'The differences between a straight-razor shave, a beard trim with scissors and a hot-towel treatment, to help you choose the right one.',
    imageAlt: 'A long, well-kept beard with defined edges',
    ctaLabel: 'See the beard services and prices',
    blocks: [
      { type: 'p', text: 'Three services, three different results. The choice depends on how you wear your beard and how much time you want to give it.' },
      { type: 'h2', text: 'Straight-razor shave' },
      { type: 'p', text: 'For those who want a clean face, or who keep a beard and want sharp edges on the cheeks and neck. It is the quickest service.' },
      { type: 'h2', text: 'Beard trim with scissors' },
      { type: 'p', text: 'For those who want to keep their beard, but neat. We shorten where needed, give it shape and tidy the edges without losing length.' },
      { type: 'h2', text: 'Hot-towel beard' },
      { type: 'p', text: 'The hot towel opens the pores and softens the hair. The shave is smoother and the skin is less irritated. It is also a real moment of relaxation.' },
      { type: 'tip', text: 'Sensitive skin or redness after shaving? Try the hot towel: it often makes the difference.' },
      { type: 'h2', text: 'Together with a haircut' },
      { type: 'p', text: 'You can add the beard to the haircut in the same booking. The system works out the total time by itself.' },
    ],
  },
  'sfumatura-alta-media-bassa': {
    title: 'High, mid or low fade: how to choose',
    description: 'What changes between a high, mid and low fade, and which one suits your face and your style best.',
    imageAlt: 'A fade seen from behind',
    ctaLabel: 'Book your haircut',
    blocks: [
      { type: 'p', text: 'A fade is the gradual change from very short hair to longer hair. The difference between high, mid and low is simple: it is the point on the head where it starts.' },
      { type: 'h2', text: 'Low fade' },
      { type: 'p', text: 'It starts just above the ear and the nape. It is discreet and clean. It suits almost everyone, even in the office.' },
      { type: 'h2', text: 'Mid fade' },
      { type: 'p', text: 'It starts halfway up the sides. It is the most versatile: modern but not extreme. It works well with longer hair on top.' },
      { type: 'h2', text: 'High fade' },
      { type: 'p', text: 'It starts high, close to the top of the head. The contrast is strong and the look is bold. It needs touch-ups more often.' },
      { type: 'h2', text: 'How to choose' },
      { type: 'list', items: ['Round face: a mid or high fade slims it.', 'Long face: a low fade is better, so it does not lengthen it further.', 'Little time for touch-ups: low or mid.'] },
      { type: 'tip', text: 'Not sure? Bring a photo and we will talk about it before we start. First we listen, then we cut.' },
    ],
  },
  'come-spiegare-il-taglio-al-barbiere': {
    title: 'How to explain the haircut you want to your barber',
    description: 'Five tips to get your point across to the barber and leave with the haircut you had in mind.',
    imageAlt: 'A man with medium-length hair combed to the side',
    ctaLabel: 'Read how the first visit works',
    blocks: [
      { type: 'p', text: '“Short on the sides and a bit on top” can mean ten different haircuts. Here is how to explain yourself clearly.' },
      { type: 'h2', text: '1. Bring a photo' },
      { type: 'p', text: 'It is the fastest way. Two or three photos are better, even from the side and from behind. Tell us what you do not like as well.' },
      { type: 'h2', text: '2. Tell us your routine' },
      { type: 'p', text: 'How much time do you have in the morning? Do you use wax or gel? A beautiful cut that needs 15 minutes of styling is not right for someone who rushes out the door.' },
      { type: 'h2', text: '3. Talk about length in centimetres' },
      { type: 'p', text: '“A finger’s width off” is clearer than “trim it a little”. For the sides you can give the clipper guard number, if you know it.' },
      { type: 'h2', text: '4. Show where you want the parting' },
      { type: 'p', text: 'Parting on the right, on the left, or no parting? Combed back or forward? These details change the result.' },
      { type: 'h2', text: '5. Stop us if something does not feel right' },
      { type: 'p', text: 'Better to say so straight away than at the end of the cut. That is perfectly normal for us: it is your haircut.' },
      { type: 'tip', text: 'You can also write your preferences in the booking notes: we read them before you arrive.' },
    ],
  },
};

/** L'articolo ha una traduzione inglese? (solo gli articoli di base; quelli scritti dall'admin no). */
export function hasEnglishArticle(slug: string, source?: 'base' | 'admin'): boolean {
  return source !== 'admin' && slug in JOURNAL_EN;
}

/**
 * Versione nella lingua richiesta di un articolo.
 * translated = false: l'articolo è disponibile solo in italiano (si mostra una nota).
 * Gli articoli dell'admin non hanno traduzione; un articolo admin con lo stesso indirizzo di uno base lo sostituisce.
 */
export function localizeArticle<T extends JournalArticle & { source?: 'base' | 'admin' }>(
  a: T,
  lang: Lang,
): { article: T; translated: boolean } {
  if (lang !== 'en') return { article: a, translated: true };
  const en = a.source === 'admin' ? undefined : JOURNAL_EN[a.slug];
  if (!en) return { article: { ...a, category: categoryName(lang, a.category) }, translated: false };
  return {
    article: {
      ...a,
      title: en.title,
      description: en.description,
      category: categoryName(lang, a.category),
      imageAlt: en.imageAlt,
      cta: { href: a.cta.href, label: en.ctaLabel },
      blocks: en.blocks,
    },
    translated: true,
  };
}

const APPLICATION_ERRORS_EN: Record<string, string> = {
  'Scrivi il tuo nome.': 'Please write your name.',
  'Scrivi un numero di telefono valido.': 'Please enter a valid phone number.',
  "Controlla l'email.": 'Please check the email address.',
  'Serve il consenso al trattamento dei dati per valutare la candidatura.': 'We need your consent to process your data in order to review your application.',
  'Il link deve iniziare con https:// oppure con @.': 'The link must start with https:// or with @.',
  'Hai appena inviato una candidatura. Riprova tra un minuto.': 'You have just sent an application. Please try again in a minute.',
  'Invio non riuscito. Riprova tra poco.': 'Sending failed. Please try again shortly.',
};

/** Errore dell'invio candidatura nella lingua giusta (il server risponde in italiano). */
export function applicationErrorText(lang: Lang, error: string | undefined | null): string {
  const it = error || 'Invio non riuscito. Riprova tra poco.';
  if (lang !== 'en') return it;
  return APPLICATION_ERRORS_EN[it] ?? 'Sending failed. Please try again shortly.';
}
