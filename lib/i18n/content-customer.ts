/**
 * Testi inglesi dell'area cliente (app/area-cliente) e traduzione sul client dei messaggi italiani
 * che tornano dalle server action. La logica del server non cambia: qui si traduce solo il testo.
 * Le email e i promemoria inviati dal server restano in italiano.
 */
import { formatShopDateTimeLong, formatShopDateTimeShort } from '@/lib/utils/booking-datetime';
import { serviceName, dayName } from './content-en';
import type { Lang } from './index';

const SHOP_TIMEZONE = 'Europe/Rome';

/** Codice lingua per Intl / toLocaleDateString. */
export function dateLocale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : 'it-IT';
}

/** "Tuesday 14 July 2026 at 09:00" (in italiano: formato esistente). */
export function fmtDateTimeLong(lang: Lang, date: Date): string {
  if (lang !== 'en') return formatShopDateTimeLong(date);
  const d = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return `${d} at ${fmtTime(date)}`;
}

/** "Tuesday 14 July at 09:00" (in italiano: formato esistente). */
export function fmtDateTimeShort(lang: Lang, date: Date): string {
  if (lang !== 'en') return formatShopDateTimeShort(date);
  const d = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return `${d} at ${fmtTime(date)}`;
}

function fmtTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/** Nome servizio nella lingua giusta (include il testo di riserva "Servizio"). */
export function displayServiceName(lang: Lang, name: string): string {
  if (lang !== 'en') return name;
  // Più servizi in una prenotazione sono uniti con " + ": si traduce ogni parte.
  return name
    .split(' + ')
    .map((part) => (part === 'Servizio' ? 'Service' : serviceName(lang, part)))
    .join(' + ');
}

/** Nome barbiere nella lingua giusta (i nomi propri restano uguali; cambia solo il testo di riserva). */
export function displayBarberName(lang: Lang, name: string): string {
  if (lang === 'en' && name === 'Barbiere') return 'Barber';
  return name;
}

export function statusLabel(lang: Lang, status: string): string {
  const it: Record<string, string> = {
    confirmed: 'Confermato',
    completed: 'Completato',
    cancelled: 'Disdetto',
    no_show: 'Non presentato',
  };
  const en: Record<string, string> = {
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  };
  return (lang === 'en' ? en : it)[status] ?? status;
}

export { dayName };

/* ── Messaggi dalle server action ─────────────────────────────────────────── */

const MESSAGES_EN: Record<string, string> = {
  'Database non configurato': 'Database not configured',
  'Database non configurato.': 'Database not configured.',
  'Non autenticato': 'You are not signed in',
  'Appuntamento non trovato': 'Appointment not found',
  'Non autorizzato': 'Not authorised',
  'Errore cancellazione': 'Cancellation error',
  'Questo appuntamento non può essere modificato': 'This appointment cannot be changed',
  'Servizio non trovato': 'Service not found',
  'Scegli un orario futuro': 'Choose a time in the future',
  'Questo orario è appena stato prenotato. Scegline un altro.': 'This time slot has just been booked. Please choose another one.',
  'Errore durante la modifica. Riprova.': 'Something went wrong while saving your change. Please try again.',
  'Data o orario non validi': 'Invalid date or time',
  'Le prenotazioni online per questo operatore sono riservate. Prenota con un collaboratore disponibile.':
    'Online bookings for this barber are reserved. Please book with an available team member.',
  'Servizio momentaneamente non disponibile.': 'Service temporarily unavailable.',
  'Accedi prima di attivare una Passkey.': 'Please sign in before setting up a Passkey.',
  'Utente non trovato.': 'User not found.',
  'Richiesta scaduta. Riprova.': 'Request expired. Please try again.',
  'Passkey non verificata.': 'Passkey not verified.',
  'Attivazione non riuscita. Riprova.': 'Setup failed. Please try again.',
  'Accedi di nuovo.': 'Please sign in again.',
  'Passkey attivata.': 'Passkey activated.',
};

const MESSAGE_PATTERNS_EN: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [
    /^Modifica o disdetta possibile solo fino a (\d+) minuti prima dell'appuntamento$/,
    (m) => `You can only edit or cancel up to ${m[1]} minutes before the appointment`,
  ],
  [/^Attendi (\d+) secondi prima di chiedere un nuovo codice\.$/, (m) => `Please wait ${m[1]} seconds before asking for a new code.`],
  [/^Codice errato\. Tentativi rimasti: (\d+)\.$/, (m) => `Wrong code. Attempts left: ${m[1]}.`],
];

/**
 * Traduce sul client un messaggio italiano restituito da una server action.
 * In italiano (o se il messaggio non è nell'elenco) torna il testo originale.
 */
export function translateMessage(lang: Lang, italianMessage: string | undefined | null): string {
  const msg = italianMessage ?? '';
  if (lang !== 'en' || !msg) return msg;
  const exact = MESSAGES_EN[msg];
  if (exact) return exact;
  for (const [re, fn] of MESSAGE_PATTERNS_EN) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return msg;
}

/* ── Assistenza: domande frequenti ────────────────────────────────────────── */

export interface CareFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_EN: CareFaq[] = [
  {
    id: '1',
    category: 'prenotazioni',
    question: 'How can I edit or cancel a booking?',
    answer:
      'You can edit or cancel an appointment yourself up to 30 minutes before the service starts, directly from your account area, in the "Appointments" section. Pick the appointment and click "Edit" or "Cancel". For urgent changes close to the appointment time, please call the shop directly.',
  },
  {
    id: '2',
    category: 'prenotazioni',
    question: 'Can I book for more than one person at the same time?',
    answer:
      'At the moment the online booking system supports one booking at a time, so that our barbers\' time is allocated correctly. If you want to book for yourself and your son or a friend, you can make two separate bookings or call us to plan the times together.',
  },
  {
    id: '3',
    category: 'account',
    question: 'What is quick sign-in with a Passkey?',
    answer:
      'A Passkey lets you sign in to your account securely and very quickly using face recognition or the fingerprint on your phone or computer, with no password to type. Turn it on from your Profile, in the "Quick sign-in with Passkey" section, once for each device.',
  },
  {
    id: '4',
    category: 'account',
    question: 'Are my personal data and my history safe?',
    answer:
      'Absolutely. We use Supabase as a secure backend with data encryption and two-level authentication. Your personal data, your haircut history and your preferences will never be shared with third parties.',
  },
  {
    id: '5',
    category: 'servizi',
    question: 'Do you do haircuts for children and teenagers?',
    answer:
      'Yes, Barberia Garofalo welcomes men of every age! We have special prices and dedicated services for teenagers (modern style and trendy fades) and kids (haircuts with care, patience and a calm setting to put the little ones at ease).',
  },
  {
    id: '6',
    category: 'servizi',
    question: 'How can I get discounts and promotions?',
    answer:
      'All active promotions and personal discount codes are shown in the "Promotions" section of your account area or sent through our dedicated channels. Also, by signing up you automatically join our loyalty programme.',
  },
  {
    id: '7',
    category: 'contatti',
    question: 'What are your opening hours and where are you?',
    answer:
      'We are in Foggia, at Viale Ignazio D\'Addedda, 236. We are open Tuesday to Friday from 08:30 to 13:00 and from 15:30 to 20:30, and on Saturday from 08:30 to 13:30 and from 14:30 to 20:00. We are closed on Monday and Sunday.',
  },
  {
    id: '8',
    category: 'contatti',
    question: 'How can I contact you if I have a problem with my booking?',
    answer:
      'You can click the instant WhatsApp support button at the bottom left to write to us right away, or you can call the shop directly on +39 0881 XXXXXX. We will be happy to help you sort out any problem.',
  },
];

const FAQ_IT: CareFaq[] = [
  {
    id: '1',
    category: 'prenotazioni',
    question: 'Come posso modificare o cancellare una prenotazione?',
    answer: 'Puoi modificare o disdire un appuntamento autonomamente fino a 30 minuti prima dall\'inizio del servizio direttamente dalla tua Area Cliente, nella sezione "Appuntamenti". Seleziona l\'appuntamento desiderato e clicca su "Modifica" o "Disdici". Per modifiche urgenti a ridosso dell\'orario, ti preghiamo di chiamarci direttamente al salone.',
  },
  {
    id: '2',
    category: 'prenotazioni',
    question: 'Posso prenotare per più persone contemporaneamente?',
    answer: 'Attualmente il sistema di prenotazione online supporta una prenotazione alla volta per garantire la corretta allocazione dei tempi dei nostri barbieri. Se desideri prenotare per te e per tuo figlio o un amico, puoi effettuare due prenotazioni separate o contattarci telefonicamente per pianificare al meglio gli orari.',
  },
  {
    id: '3',
    category: 'account',
    question: 'Cos\'è il login rapido tramite Passkey?',
    answer: 'La Passkey ti consente di accedere al tuo account in modo sicuro e ultra-rapido utilizzando il riconoscimento facciale o l\'impronta digitale del tuo telefono o computer, senza dover digitare alcuna password. Attivala dal tuo Profilo, nella sezione "Accesso rapido con Passkey", una volta per ogni dispositivo.',
  },
  {
    id: '4',
    category: 'account',
    question: 'I miei dati personali e il mio storico sono al sicuro?',
    answer: 'Assolutamente sì. Utilizziamo Supabase come backend sicuro con crittografia dei dati e autenticazione a doppio livello. I tuoi dati personali, il tuo storico dei tagli e le tue preferenze non verranno mai condivisi con terze parti.',
  },
  {
    id: '5',
    category: 'servizi',
    question: 'Offrite tagli per bambini e ragazzi?',
    answer: 'Sì, la Barberia Garofalo accoglie l\'uomo di ogni età! Abbiamo tariffe speciali e servizi dedicati per Ragazzi (stile moderno e sfumature trend) e Bimbi (tagli con cura, pazienza e un ambiente sereno per far sentire i piccoli a proprio agio).',
  },
  {
    id: '6',
    category: 'servizi',
    question: 'Come posso usufruire di sconti e promozioni?',
    answer: 'Tutte le promozioni attive e i codici sconto personali vengono mostrati nella sezione "Promozioni" dell\'area riservata o inviati tramite i nostri canali dedicati. Inoltre, registrandoti partecipi automaticamente al nostro programma fedeltà.',
  },
  {
    id: '7',
    category: 'contatti',
    question: 'Quali sono gli orari di apertura e dove vi trovate?',
    answer: 'Siamo a Foggia in Viale Ignazio D\'Addedda, 236. Siamo aperti dal Martedì al Venerdì dalle 08:30 alle 13:00 e dalle 15:30 alle 20:30, e il Sabato dalle 08:30 alle 13:30 e dalle 14:30 alle 20:00. Lunedì e Domenica siamo chiusi.',
  },
  {
    id: '8',
    category: 'contatti',
    question: 'Come posso contattarvi se ho un problema con la prenotazione?',
    answer: 'Puoi cliccare sul pulsante di assistenza immediata WhatsApp in basso a sinistra per scriverci un messaggio istantaneo, oppure puoi chiamarci direttamente al numero di telefono del salone (+39 0881 XXXXXX). Saremo felici di aiutarti a risolvere qualsiasi imprevisto.',
  },
];

export function careFaqs(lang: Lang): CareFaq[] {
  return lang === 'en' ? FAQ_EN : FAQ_IT;
}

export function careCategoryLabel(lang: Lang, id: string): string {
  const it: Record<string, string> = {
    all: 'Tutti i temi',
    prenotazioni: 'Gestione Prenotazioni',
    account: 'Account & Sicurezza',
    servizi: 'Listino & Trattamenti',
  };
  const en: Record<string, string> = {
    all: 'All topics',
    prenotazioni: 'Managing bookings',
    account: 'Account & security',
    servizi: 'Prices & treatments',
  };
  return (lang === 'en' ? en : it)[id] ?? id;
}
