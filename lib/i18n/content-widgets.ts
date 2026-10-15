/**
 * Testi dei widget condivisi del sito pubblico (cookie, chat, installazione app, barra app, ecc.).
 * Italiano = testo originale invariato. Inglese = traduzione fedele.
 */
import { L, type Lang } from './index';
import { dayName } from './content-en';

export function cookieText(lang: Lang) {
  return {
    ariaLabel: L(lang, 'Informativa cookie', 'Cookie notice'),
    title: 'Cookie',
    intro: L(
      lang,
      'Cookie tecnici sempre attivi; statistiche e preferenze solo se acconsenti.',
      'Technical cookies are always on; statistics and preferences only if you agree.',
    ),
    privacy: 'Privacy',
    acceptAll: L(lang, 'Accetta tutti', 'Accept all'),
    necessaryOnly: L(lang, 'Solo necessari', 'Necessary only'),
    customize: L(lang, 'Personalizza', 'Customise'),
    prefsTitle: L(lang, 'Preferenze cookie', 'Cookie preferences'),
    prefsIntro: L(
      lang,
      'Scegli quali categorie autorizzare. I cookie necessari sono sempre attivi.',
      'Choose which categories to allow. Necessary cookies are always on.',
    ),
    necessary: L(lang, 'Necessari', 'Necessary'),
    necessaryDesc: L(lang, 'Sessione, sicurezza e funzioni essenziali del sito.', 'Session, security and essential site functions.'),
    analytics: L(lang, 'Analitici', 'Analytics'),
    analyticsDesc: L(lang, 'Statistiche anonime su visite e utilizzo del sito.', 'Anonymous statistics on visits and how the site is used.'),
    preferences: L(lang, 'Preferenze', 'Preferences'),
    preferencesDesc: L(lang, 'Salvataggio di scelte come il sondaggio visitatori.', 'Saving choices such as the visitor survey.'),
    save: L(lang, 'Salva preferenze', 'Save preferences'),
    back: L(lang, 'Indietro', 'Back'),
  };
}

export const WHATSAPP_DEFAULT_MESSAGE: Record<Lang, string> = {
  it: 'Ciao! Vorrei prenotare un appuntamento a Garofalo Barberia. Potete aiutarmi?',
  en: 'Hello! I’d like to book an appointment at Garofalo Barberia. Can you help me?',
};

export function tabBarText(lang: Lang) {
  return {
    nav: L(lang, 'Navigazione app', 'App navigation'),
    home: 'Home',
    book: L(lang, 'Prenota', 'Book'),
    contact: L(lang, 'Contatti', 'Contact'),
  };
}

export function installText(lang: Lang) {
  return {
    close: L(lang, 'Chiudi', 'Close'),
    title: L(lang, 'Garofalo sul tuo telefono', 'Garofalo on your phone'),
    text: L(
      lang,
      'Prenota in un tocco, come un’app. Gratis, senza store, occupa pochissimo spazio.',
      'Book in one tap, like an app. Free, no app store, takes up very little space.',
    ),
    install: L(lang, 'Installa l’app', 'Install the app'),
    notNow: L(lang, 'Non ora', 'Not now'),
    gotIt: L(lang, 'Ho capito', 'Got it'),
    share: L(lang, 'Condividi', 'Share'),
    tapShare1: L(lang, 'Tocca', 'Tap'),
    tapShare2: L(lang, 'in basso nella barra di Safari', 'at the bottom of the Safari bar'),
    choose: L(lang, 'Scegli', 'Choose'),
    addHome: L(lang, 'Aggiungi alla schermata Home', 'Add to Home Screen'),
    iosTitle: L(lang, 'Installa l’app su iPhone', 'Install the app on iPhone'),
    menuOpen1: L(lang, 'Apri il menu del browser', 'Open the browser menu'),
    menuOpen2: L(lang, 'in alto a destra', 'at the top right'),
    installApp: L(lang, 'Installa app', 'Install app'),
    or: L(lang, 'oppure', 'or'),
    addHomeAlt: L(lang, 'Aggiungi a schermata Home', 'Add to Home screen'),
    noEntry: L(lang, 'Se non vedi la voce, apri barberiagarofalo.it con Chrome.', 'If you don’t see the option, open barberiagarofalo.it in Chrome.'),
  };
}

export function scrollTopLabel(lang: Lang) {
  return L(lang, 'Torna in alto', 'Back to top');
}

export function imageProtectionText(lang: Lang) {
  return {
    title: L(lang, '🔒 Immagine e Contenuti Protetti da Privacy', '🔒 Images and content are protected'),
    description: L(
      lang,
      'Per questioni di riservatezza e diritto d’autore, non è possibile scaricare, copiare o salvare le immagini del sito.',
      'For privacy and copyright reasons, the images on this site can’t be downloaded, copied or saved.',
    ),
  };
}

/** Traduce l'etichetta di "Aperto ora" (prodotta in italiano da getOpenStatus). */
export function openLabel(lang: Lang, label: string): string {
  if (lang !== 'en') return label;
  let m = label.match(/^Aperto · chiude alle (\d{2}:\d{2})$/);
  if (m) return `Open · closes at ${m[1]}`;
  m = label.match(/^Chiuso · apre alle (\d{2}:\d{2})$/);
  if (m) return `Closed · opens at ${m[1]}`;
  m = label.match(/^Chiuso · apre (.+) alle (\d{2}:\d{2})$/);
  if (m) {
    if (m[1] === 'domani') return `Closed · opens tomorrow at ${m[2]}`;
    const day = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return `Closed · opens ${dayName(lang, day)} at ${m[2]}`;
  }
  if (label === 'Chiuso') return 'Closed';
  return label;
}

export function chatText(lang: Lang) {
  return {
    welcome: L(
      lang,
      'Ciao! 👋 Sono **Eliseo**, l\'assistente virtuale della Barberia Garofalo.\n\nPosso aiutarti con:\n• Orari e prenotazioni\n• Servizi e prezzi\n• Disdette e modifiche\n• Come raggiungerci',
      'Hi! 👋 I’m **Eliseo**, the virtual assistant of Barberia Garofalo.\n\nI can help you with:\n• Opening hours and bookings\n• Services and prices\n• Cancellations and changes\n• How to find us',
    ),
    quick: L(
      lang,
      ['Quali sono gli orari?', 'Quanto costa un taglio?', 'Come prenoto?', 'Dove siete?'],
      ['What are your opening hours?', 'How much is a haircut?', 'How do I book?', 'Where are you?'],
    ),
    subtitle: L(lang, 'Assistente Barberia Garofalo', 'Barberia Garofalo assistant'),
    newChat: L(lang, 'Nuova chat', 'New chat'),
    closeAssistant: L(lang, 'Chiudi assistente', 'Close assistant'),
    placeholder: L(lang, 'Scrivi un messaggio...', 'Write a message...'),
    send: L(lang, 'Invia messaggio', 'Send message'),
    disclaimer: L(lang, 'Risposte automatiche, anche con AI. Non scrivere dati personali · ', 'Automatic replies, partly AI-powered. Please don’t write personal data · '),
    privacy: 'Privacy',
    closeEliseo: L(lang, 'Chiudi assistente Eliseo', 'Close the Eliseo assistant'),
    openEliseo: L(lang, 'Apri assistente Eliseo', 'Open the Eliseo assistant'),
    askPrefix: L(lang, 'Chiedi a ', 'Ask '),
    retry: L(lang, 'Mi dispiace, riprova tra poco.', 'Sorry, please try again in a moment.'),
    errorMsg: (phone: string) =>
      L(
        lang,
        `Scusami, si è verificato un errore. Contattaci su WhatsApp al **${phone}** 📱`,
        `Sorry, something went wrong. Contact us on WhatsApp at **${phone}** 📱`,
      ),
    errorAction: L(lang, 'Scrivi su WhatsApp', 'Message us on WhatsApp'),
  };
}
