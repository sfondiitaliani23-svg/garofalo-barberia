/**
 * Testi inglesi per prenotazione e accesso (login, registrazione, reimposta password).
 * I messaggi di errore/successo delle server action arrivano in italiano: qui si traducono sul client.
 * La logica del server NON cambia (e i controlli sul testo italiano, es. "occupato", restano sul messaggio originale).
 */
import { enGB, it as itLocale } from 'date-fns/locale';
import type { Lang } from './index';

/** Lingua per date-fns (nomi di mesi e giorni). */
export function dfLocale(lang: Lang) {
  return lang === 'en' ? enGB : itLocale;
}

const MESSAGES_EN: Record<string, string> = {
  // Prenotazione (lib/actions/bookings.ts)
  'Prenotazione online temporaneamente non disponibile. Riprova tra poco.': 'Online booking is temporarily unavailable. Please try again shortly.',
  'Compila nome e telefono per confermare la prenotazione.': 'Please enter your name and phone number to confirm your booking.',
  'Inserisci un’email valida: è obbligatoria per ricevere la conferma della prenotazione.': 'Please enter a valid email address: we need it to send your booking confirmation.',
  'Usa la tua email personale per ricevere la conferma della prenotazione.': 'Please use your personal email address to receive your booking confirmation.',
  "Seleziona almeno un servizio, la data e l'orario prima di confermare.": 'Please choose at least one service, a date and a time before confirming.',
  'Servizi non trovati': 'Services not found',
  'Nessun barbiere disponibile in questo orario per tutti i servizi scelti.': 'No barber is available at this time for all the services you chose.',
  'I servizi di taglio sono gestiti da Luigi Garofalo. Seleziona Luigi Garofalo per completare la prenotazione del taglio.': 'Haircuts are handled by Luigi Garofalo. Please choose Luigi Garofalo to complete your haircut booking.',
  "Il barbiere selezionato non è disponibile per l'intera durata dei servizi scelti.": 'The barber you chose is not available for the whole duration of the services you selected.',
  'Questo orario è appena stato occupato. Scegline un altro.': 'This time slot has just been taken. Please choose another one.',
  'Questo orario è appena stato prenotato. Scegline un altro.': 'This time slot has just been booked. Please choose another one.',
  'Errore durante il salvataggio dei servizi. Riprova.': 'Something went wrong while saving your services. Please try again.',
  'Errore imprevisto durante la conferma. Ricarica la pagina e riprova.': 'Something unexpected went wrong. Please reload the page and try again.',
  'Le prenotazioni online per questo operatore sono riservate. Prenota con un collaboratore disponibile.': 'Online bookings for this barber are not open. Please book with an available team member.',
  // Messaggi del client (BookingWizard)
  'Impossibile confermare la prenotazione. Riprova.': 'We could not confirm your booking. Please try again.',
  // Promozioni (lib/actions/promotions.ts)
  'Database non configurato': 'Database not configured',
  'Database non configurato.': 'Database not configured.',
  'Servizio non trovato': 'Service not found',
  'Codice promozionale non valido': 'Invalid promo code',
  'Questa promozione non è più attiva': 'This promotion is no longer active',
  'Il codice non è valido per questo servizio': 'This code is not valid for this service',
  'Inserisci un codice promozionale': 'Please enter a promo code',
  // Accesso / registrazione / password (lib/actions/auth.ts)
  'Provider non valido': 'Invalid sign-in provider',
  'Inserisci un indirizzo email valido.': 'Please enter a valid email address.',
  'La password deve contenere almeno 6 caratteri.': 'The password must be at least 6 characters long.',
  // Accesso senza password (lib/actions/passwordless.ts)
  'Se il numero è collegato a un account, riceverai un codice su WhatsApp o, se WhatsApp non è disponibile, via email.': 'If this number is linked to an account, you will receive a code on WhatsApp or, if WhatsApp is not available, by email.',
  'Invio del codice non riuscito. Riprova tra poco o accedi con email e password.': 'We could not send the code. Please try again shortly or sign in with your email and password.',
  'Servizio momentaneamente non disponibile.': 'Service temporarily unavailable.',
  'Il codice ha 6 cifre.': 'The code has 6 digits.',
  'Codice non valido o scaduto.': 'Invalid or expired code.',
  'Codice scaduto. Chiedine uno nuovo.': 'This code has expired. Please ask for a new one.',
  'Troppi tentativi. Chiedi un nuovo codice.': 'Too many attempts. Please ask for a new code.',
  'Richiesta scaduta. Riprova.': 'Request expired. Please try again.',
  'Passkey non verificata.': 'Passkey could not be verified.',
  'Passkey non riconosciuta.': 'Passkey not recognised.',
  'Passkey non riconosciuta. Attivala dal tuo profilo.': 'Passkey not recognised. Please set it up from your profile.',
  'Accesso con Passkey non riuscito.': 'Passkey sign-in failed.',
  'Accedi di nuovo.': 'Please sign in again.',
  'Codice inviato su WhatsApp.': 'Code sent on WhatsApp.',
};

/** Messaggi con un numero o un nome dentro. */
const PATTERNS_EN: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^Attendi (\d+) secondi prima di chiedere un nuovo codice\.$/, (m) => `Please wait ${m[1]} seconds before asking for a new code.`],
  [/^Codice errato\. Tentativi rimasti: (\d+)\.$/, (m) => `Wrong code. Attempts left: ${m[1]}.`],
  [/^Accesso con (.+) non disponibile: database non configurato su Vercel\.$/, (m) => `Sign-in with ${m[1]} is not available right now.`],
  [/^Impossibile avviare (.+)\. Abilita il provider in Supabase.*$/, (m) => `Could not start sign-in with ${m[1]}. Please try another way to sign in.`],
];

/**
 * Traduce un messaggio italiano arrivato dal server. In italiano (o se manca la traduzione)
 * restituisce il messaggio com'è: non si perde mai il testo.
 */
export function translateMessage(lang: Lang, italianMessage: string): string {
  if (lang !== 'en' || !italianMessage) return italianMessage;
  const msg = italianMessage.trim();
  const hit = MESSAGES_EN[msg];
  if (hit) return hit;
  for (const [re, fn] of PATTERNS_EN) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return italianMessage;
}

/** Ruolo del barbiere (testo del database): traduce i pezzi noti, il resto resta uguale. */
const ROLE_PARTS_EN: Record<string, string> = {
  Titolare: 'Owner',
  'Barbiere professionista': 'Professional barber',
  Barbiere: 'Barber',
};

export function barberRole(lang: Lang, role: string): string {
  if (lang !== 'en') return role;
  return role
    .split('·')
    .map((part) => {
      const p = part.trim();
      return ROLE_PARTS_EN[p] ?? p;
    })
    .join(' · ');
}

/** Il nome mostrato quando non c'è un barbiere assegnato (testo fisso del codice). */
export function fallbackBarberLabel(lang: Lang): string {
  return lang === 'en' ? 'Team member' : 'Collaboratore di sala';
}
