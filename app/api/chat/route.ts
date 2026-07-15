import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/site-config';

const PHONE = SITE_CONFIG.phoneDisplay;
const EMAIL = SITE_CONFIG.email;
const MAPS  = SITE_CONFIG.googleMapsUrl;
const IG    = SITE_CONFIG.instagramHandle;
const IG_URL = SITE_CONFIG.instagram;

interface Intent {
  patterns: string[];
  response: () => string;
}

const INTENTS: Intent[] = [
  // ── GREETING ──────────────────────────────────────────────────────────────
  {
    patterns: ['ciao', 'salve', 'buongiorno', 'buonasera', 'buon pomeriggio', 'hey', 'hello', 'buona sera', 'buon giorno'],
    response: () =>
      `Ciao! 😊 Sono **Eliseo**, l'assistente virtuale di Barberia Garofalo.\n\nCome posso aiutarti? Chiedimi pure informazioni su orari, servizi, prezzi, prenotazioni o contatti.`,
  },

  // ── HOURS ─────────────────────────────────────────────────────────────────
  {
    patterns: ['orar', 'quand aprite', 'apert', 'aprit', 'chius', 'chiud', 'a che ora', 'weekend', 'sabato', 'domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'festiv'],
    response: () =>
      `⏰ **Orari del salone:**\n\n• **Lunedì:** Chiuso\n• **Martedì – Venerdì:** 09:00–13:00 e 14:00–19:30\n• **Sabato:** 09:00–13:00 e 14:00–18:00\n• **Domenica:** Chiuso`,
  },

  // ── PRICES ────────────────────────────────────────────────────────────────
  {
    patterns: ['prezz', 'cost', 'tariff', 'listin', 'quant', 'cifra', 'soldi', 'euro', '€', 'quant si paga', 'si paga'],
    response: () =>
      `💈 **Listino prezzi:**\n\n• Taglio e shampoo: **€17**\n• Taglio baby (bimbi): **€13**\n• Barba con panno caldo: **€10**\n• Barba modellata a forbici: **€8**\n• Shampoo e acconciatura: **€8**\n• Barba rasata / lama: **€6**`,
  },

  // ── BOOKING ───────────────────────────────────────────────────────────────
  {
    patterns: ['prenot', 'appuntament', 'fiss', 'riserv', 'venire', 'book'],
    response: () =>
      `📅 **Come prenotare:**\n\nPuoi prenotare in totale autonomia direttamente sul sito:\n1. Clicca su **"Prenota"** nel menu principale o in home\n2. Scegli il servizio, il barbiere e l'orario\n3. Inserisci i tuoi dati e conferma.\n\nSe preferisci, scrivici direttamente su **WhatsApp al ${PHONE}** e fisseremo noi l'appuntamento per te!`,
  },

  // ── SERVICES ──────────────────────────────────────────────────────────────
  {
    patterns: ['serviz', 'cosa fate', 'cosa offrite', 'trattament', 'specialita', 'capell', 'barba', 'shampoo', 'acconciatur', 'lama', 'rasatur', 'panno caldo'],
    response: () =>
      `💈 **I nostri servizi:**\n\n• Taglio e shampoo\n• Taglio baby (bambini)\n• Barba rasata / lama\n• Barba modellata a forbici\n• Barba con panno caldo (trattamento completo)\n• Shampoo e acconciatura\n\nPer conoscere il prezzo di un singolo servizio, chiedimi pure "prezzi" o "listino"!`,
  },

  // ── ADDRESS / LOCATION ────────────────────────────────────────────────────
  {
    patterns: ['dove', 'indirizz', 'trov', 'posizion', 'arriv', 'raggiung', 'sede', 'zona', 'quartier', 'citta', 'foggia', 'viale', 'strada', 'mappa', 'maps', 'navigator'],
    response: () =>
      `📍 **Dove siamo:**\n\n🏠 **Indirizzo:** Viale Ignazio d'Addedda, 236 - 71122 Foggia (FG)\n\n🗺️ **Google Maps:** ${MAPS}`,
  },

  // ── CONTACT ───────────────────────────────────────────────────────────────
  {
    patterns: ['telefon', 'chiam', 'numer', 'contatt', 'whatsapp', 'messaggi', 'scriv', 'email', 'mail'],
    response: () =>
      `📞 **Contatti ufficiali:**\n\n• **Telefono / WhatsApp:** ${PHONE}\n• **Email:** ${EMAIL}\n• **Instagram:** ${IG}`,
  },

  // ── CANCELLATION ──────────────────────────────────────────────────────────
  {
    patterns: ['cancell', 'disdi', 'annull', 'rimand', 'posticip'],
    response: () =>
      `❌ **Cancellazione appuntamento:**\n\nLa cancellazione o modifica è gratuita fino a **30 minuti prima** dell'appuntamento.\n\nPuoi farlo autonomamente dall'**Area Cliente** nella sezione "Appuntamenti" cliccando su "Modifica" o "Disdici", oppure inviandoci un messaggio su WhatsApp al **${PHONE}**.`,
  },

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  {
    patterns: ['pagam', 'pagar', 'carta', 'carte', 'contant', 'bancomat', 'cash', 'pay', 'satispay', 'pos', 'bonific', 'credit', 'debit'],
    response: () =>
      `💳 **Metodi di pagamento accettati in salone:**\n\n• Contanti\n• Carte di credito / debito\n• Bancomat (POS)`,
  },

  // ── PARKING ───────────────────────────────────────────────────────────────
  {
    patterns: ['parchegg', 'macchin', 'auto', 'postegg', 'moto'],
    response: () =>
      `🚗 **Parcheggio:**\n\nSono disponibili numerosi posti auto pubblici e gratuiti lungo la strada e nelle immediate vicinanze del salone in Viale Ignazio d'Addedda.`,
  },

  // ── KIDS / CHILDREN ───────────────────────────────────────────────────────
  {
    patterns: ['bambin', 'bimb', 'figli', 'figlie', 'figlio', 'figlia', 'figliolo', 'figliola', 'baby', 'piccol', 'primo taglio', 'ragazz'],
    response: () =>
      `👶 **Bambini e ragazzi:**\n\nSiamo specializzati nei tagli per ragazzi e bambini di ogni età. Il servizio dedicato **Taglio baby** ha un costo di **€13** ed è eseguito con massima cura e delicatezza per garantire un'esperienza serena al piccolo.`,
  },

  // ── TEAM / BARBERS ────────────────────────────────────────────────────────
  {
    patterns: ['barbier', 'staff', 'team', 'chi siete', 'chi sono', 'chi lavora', 'personal', 'garofalo', 'professionist', 'quante persone', 'esperienz'],
    response: () =>
      `👨‍💈 **Lo Staff:**\n\nIl salone è guidato da professionisti del capello e della barba. Offriamo tagli moderni, rasature tradizionali e modellatura barba curati nei minimi dettagli. Visita la sezione **"Chi siamo"** per scoprire la nostra storia!`,
  },

  // ── ACCOUNT / LOGIN ───────────────────────────────────────────────────────
  {
    patterns: ['account', 'registr', 'acced', 'login', 'password', 'profil', 'accesso', 'iscriv'],
    response: () =>
      `👤 **Area Cliente:**\n\nRegistrandoti sul nostro sito puoi:\n• Monitorare e gestire i tuoi appuntamenti attivi\n• Consultare lo storico dei tuoi tagli precedenti\n• Accedere rapidamente con Passkey (impronta/volto)\n\nClicca su **"Accedi"** in alto a destra per entrare o registrarti!`,
  },

  // ── INSTAGRAM / SOCIAL ────────────────────────────────────────────────────
  {
    patterns: ['instagram', 'social', 'foto', 'fotograf', 'gallery', 'galleri', 'seguir', 'follow', 'post', 'stories'],
    response: () =>
      `📸 **Instagram:**\n\nSeguici sul nostro profilo ufficiale **${IG}** per vedere le foto dei nostri tagli e rimanere sempre aggiornato su novità e promozioni:\n👉 ${IG_URL}`,
  },

  // ── GOODBYE ───────────────────────────────────────────────────────────────
  {
    patterns: ['grazie', 'ok grazie', 'perfetto grazie', 'arriveder', 'ciao ciao', 'alla prossi', 'bye', 'a presto', 'saluti'],
    response: () =>
      `Prego! 😊 Se hai altre domande sono qui per aiutarti. Buona giornata da Barberia Garofalo! ✂️`,
  },
];

function detectIntent(message: string): string {
  // Normalize character accents and punctuation
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const intent of INTENTS) {
    const normalised = intent.patterns.map(p =>
      p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    if (normalised.some(pattern => lower.includes(pattern))) {
      return intent.response();
    }
  }

  // Fallback
  return `Non ho capito la domanda 😅\n\nChiedimi informazioni su:\n• ⏰ Orari di apertura\n• 💈 Servizi e prezzi\n• 📅 Come prenotare\n• 📍 Dove siamo\n• 📞 Contatti\n\nOppure scrivici su WhatsApp al **${PHONE}** e ti risponderemo subito! 📱`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body?.message ?? '';

    if (!message.trim()) {
      return NextResponse.json({ reply: 'Scrivi un messaggio per iniziare! 😊' });
    }

    // Small artificial delay for a more natural feel
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const reply = detectIntent(message);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: `Mi dispiace, si è verificato un errore. Contattaci su WhatsApp al ${SITE_CONFIG.phoneDisplay}. 📱` },
      { status: 500 }
    );
  }
}
