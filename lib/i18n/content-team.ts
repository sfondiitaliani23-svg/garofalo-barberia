/**
 * Versioni inglesi dei testi di: Chi siamo, Team, Galleria, Recensioni, Feedback.
 * I testi dal database (biografie, recensioni dei clienti) restano nella lingua originale se manca la traduzione.
 */
import { formatBarberRole } from '@/lib/utils';
import type { Lang } from './index';

/* ───────────────────────── Ruoli ───────────────────────── */

const ROLES_EN: Record<string, string> = {
  titolare: 'Owner',
  barbiere: 'Barber',
  'barbiere professionista': 'Professional barber',
  'barbiere junior': 'Junior barber',
  'barbiere senior': 'Senior barber',
  'maestro barbiere': 'Master barber',
  'titolare e barbiere': 'Owner and barber',
  apprendista: 'Apprentice',
};

/** Ruolo del barbiere nella lingua giusta (se un ruolo non è in elenco resta in italiano). */
export function barberRole(lang: Lang, role: string): string {
  const clean = formatBarberRole(role);
  if (lang !== 'en') return clean;
  return clean
    .split(' · ')
    .map((part) => ROLES_EN[part.trim().toLowerCase()] ?? part)
    .join(' · ');
}

/* ───────────────────────── Chi siamo ───────────────────────── */

export const ABOUT_VALUES_EN = [
  {
    title: 'Craft first',
    text: 'Precise cuts, reliable shaves. Timing that respects the result, not the turnover.',
  },
  {
    title: 'Family-friendly',
    text: 'A space where families feel at home, even with the little ones in the chair.',
  },
  {
    title: 'Transparency',
    text: 'Clear prices, no hidden extras. What you see is what you pay.',
  },
];

export const ABOUT_STORY_EN = [
  'I’m Luigi Garofalo, and I started this work in 2012. Before making my dream of opening my own barbershop come true, I spent 13 years learning the trade, with refresher courses and plenty of lessons from my “masters”.',
  'I really wanted my surname to be the name of my barbershop, because it has to be a mark of recognition for our work, for better or for worse.',
  'I built a place where the barbershop belongs to everyone, from kids to grown-ups who want to relax, chat or have a laugh. A place where it feels good to be together!',
];

/* ───────────────────────── Team ───────────────────────── */

export const TEAM_EXTRA_EN: Record<string, { intro?: string; facts?: string[]; quote?: string }> = {
  'luigi-garofalo': {
    intro:
      'Owner of Barberia Garofalo. He started in 2012 and, before opening his own barbershop, spent 13 years learning the trade through refresher courses and lessons from the masters of the craft.',
    facts: ['In the barbershop since 2012', '13 years of training before opening', 'Gave his surname to the barbershop'],
    quote: 'The barbershop belongs to everyone, from kids to grown-ups: a place where it feels good to be together.',
  },
  'francesco-costantino': {
    intro:
      'Francesco has been a barber for 4 years. Steady hand and an eye for detail: he loves clean fades and sharp outlines, and he won’t leave the chair until the cut looks right from every side.',
    facts: ['In the barbershop for 4 years', 'Fades and outlines', 'Precision in the details'],
    quote: 'A cut is judged up close: that’s where the work shows.',
  },
  'vittorio-morlino': {
    intro:
      'Vittorio has been a barber for 2 years and works side by side with Luigi. Young, curious and always up to date with the styles of the moment: he listens to what you want and recommends the look that suits you.',
    facts: ['In the barbershop for 2 years', 'Trending styles', 'On the team with Luigi'],
    quote: 'First I listen, then I cut: the right look is the one you recognise yourself in.',
  },
};

/* ───────────────────────── Galleria ───────────────────────── */

export const GALLERY_FILTERS_EN: Record<string, string> = {
  tutti: 'All',
  uomo: 'Men',
  ragazzo: 'Teens',
  bimbo: 'Kids',
};

export interface GalleryCopyEn {
  alt: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
}

/** Chiave = nome del file della foto (come in lib/data/gallery.ts). */
export const GALLERY_EN: Record<string, GalleryCopyEn> = {
  '1000313543': { alt: 'Teen with a back fade', eyebrow: 'Since 2012', title: 'Every fade', accent: 'has a story.', text: 'Luigi has been doing this work since 2012. Every fade that leaves his chair carries all that experience with it.' },
  '1000313544': { alt: 'Man with curly hair and a beard', eyebrow: 'Learning the trade', title: 'Thirteen years', accent: 'before opening.', text: 'Before opening his own barbershop, Luigi spent 13 years learning the trade, with refresher courses and lessons from the masters of the craft.' },
  '1000313545': { alt: 'Man with wavy hair and a moustache', eyebrow: 'A name, a signature', title: 'Our surname', accent: 'is our signature.', text: 'The barbershop carries the Garofalo name: every cut is a mark of recognition, for better or for worse.' },
  '1000313546': { alt: 'Slick back with a short beard', eyebrow: 'The right pace', title: 'The result', accent: 'before the clock.', text: 'Precise cuts and reliable shaves, with timing that respects the result, not the turnover.' },
  '1000313547': { alt: 'Kid’s haircut with highlights', eyebrow: 'Families', title: 'Little ones', accent: 'feel at home here.', text: 'A space where families feel at home, even with the little ones in the chair.' },
  '1000313548': { alt: 'Man’s hair styled with spray', eyebrow: 'The finishing touch', title: 'Styling', accent: 'makes the difference.', text: 'Shampoo and styling advice are included with every haircut. You leave ready to go, not just trimmed.' },
  '1000313549': { alt: 'Man with long hair, side view', eyebrow: 'Listening', title: 'First we listen,', accent: 'then we cut.', text: 'Every style starts from what you tell us: how you wear your hair, how much time you have, how you see yourself.' },
  '1000313550': { alt: 'Teen’s haircut with a side parting', eyebrow: 'Precision', title: 'A parting', accent: 'can’t be improvised.', text: 'Parting, fade, finishing: it’s the small details that keep a cut looking clean for days.' },
  '1000313551': { alt: 'Low fade on a blond teen', eyebrow: 'Everyone’s place', title: 'From kids', accent: 'to grown-ups.', text: 'Luigi built a barbershop for everyone: from the youngest to the oldest, each with their own cut.' },
  '1000313552': { alt: 'Slick back on a teen with glasses', eyebrow: 'Atmosphere', title: 'Relax,', accent: 'you’re in the barbershop.', text: 'Here you relax, chat for a bit and have a laugh. A place where it feels good to be together.' },
  '1000313553': { alt: 'Pompadour on a teen, side view', eyebrow: 'Trends', title: 'The style', accent: 'that suits you.', text: 'Pompadour, texture and trending cuts: we recommend the right look and create it with care.' },
  '1000313554': { alt: 'Elegant man’s haircut with a beard', eyebrow: 'The team', title: 'Three professionals,', accent: 'one level of care.', text: 'Luigi, Vittorio and Francesco: the same attention on every cut and every beard.' },
  '1000313555': { alt: 'Kid’s fade haircut', eyebrow: 'No rush', title: 'The first haircut,', accent: 'nice and calm.', text: 'No rush, no pressure: we take all the time needed. If it’s the first time, mention it in the notes when you book.' },
  '1000313556': { alt: 'Kid’s skin fade seen from above', eyebrow: 'Details', title: 'Seen up close,', accent: 'it’s all clean.', text: 'A fade is judged up close. We work every step until it’s even.' },
  '1000313557': { alt: 'Shaved man with a long beard', eyebrow: 'Beard', title: 'A beard', accent: 'that stands out.', text: 'Straight-razor shave, scissor-trimmed or with a hot towel: beards have their own dedicated services.' },
  '1000313558': { alt: 'Teen’s textured haircut', eyebrow: 'Clear prices', title: 'What you see', accent: 'is what you pay.', text: 'Transparent price list, no hidden extras. And you pay at the barbershop, after the service.' },
  '1000313559': { alt: 'Man with a shaved skin fade', eyebrow: 'Viale d’Addedda, Foggia', title: 'We’re waiting', accent: 'for you in the chair.', text: 'We’re at Viale Ignazio d’Addedda 236, in Foggia. Book online and choose your own time.' },
};

/** Testi della foto nella lingua giusta (in italiano restano quelli di lib/data/gallery.ts). */
export function galleryEn(src: string): GalleryCopyEn | null {
  const id = src.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') ?? '';
  return GALLERY_EN[id] ?? null;
}

/* ───────────────────────── Messaggi dei form (dalle server action, in italiano) ───────────────────────── */

const GENERIC_ERROR_EN = 'Something went wrong. Please try again shortly.';

const REVIEW_ERRORS_EN: Record<string, string> = {
  'Database non configurato': 'The service is temporarily unavailable. Please try again shortly.',
  'Compila tutti i campi obbligatori': 'Please fill in all required fields.',
  'La valutazione deve essere compresa tra 1 e 5 stelle': 'The rating must be between 1 and 5 stars.',
  "Errore durante l'inserimento della recensione.": 'Something went wrong while saving your review.',
  'Errore imprevisto': GENERIC_ERROR_EN,
};

const FEEDBACK_ERRORS_EN: Record<string, string> = {
  'Scegli un voto da 1 a 5.': 'Please choose a rating from 1 to 5.',
  'Hai appena inviato un feedback. Riprova tra un minuto.': 'You just sent some feedback. Please try again in a minute.',
  'Invio non riuscito. Riprova tra poco.': 'Sending failed. Please try again shortly.',
};

/** Errore della server action `createReview` nella lingua giusta (messaggio sconosciuto: testo generico in inglese). */
export function reviewErrorText(lang: Lang, error: string | undefined | null): string {
  if (lang !== 'en') return error || "Errore durante l'invio.";
  return (error && REVIEW_ERRORS_EN[error]) || GENERIC_ERROR_EN;
}

/** Errore della server action `submitFeedbackAction` nella lingua giusta. */
export function feedbackErrorText(lang: Lang, error: string): string {
  if (lang !== 'en') return error;
  return FEEDBACK_ERRORS_EN[error] ?? GENERIC_ERROR_EN;
}
