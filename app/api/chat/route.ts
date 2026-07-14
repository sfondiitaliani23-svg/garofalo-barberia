import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/site-config';

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge-base: each intent has patterns (Italian keywords) + a response fn
// ─────────────────────────────────────────────────────────────────────────────

const PHONE = SITE_CONFIG.phoneDisplay;
const WA    = SITE_CONFIG.whatsapp;
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
      `Ciao! 😊 Benvenuto da **Barberia Garofalo**!\n\nSono Eliseo, il tuo assistente virtuale. Come posso aiutarti?\n\nPosso risponderti su orari, servizi, prezzi, prenotazioni e molto altro!`,
  },

  // ── HOURS ─────────────────────────────────────────────────────────────────
  {
    patterns: ['orari', 'orario', 'quando aprite', 'aperto', 'apertura', 'chiuso', 'chiude', 'apre', 'a che ora', 'orari di apertura', 'disponibile', 'weekend', 'sabato', 'domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'festivo'],
    response: () =>
      `⏰ **Orari di apertura:**\n\n🔴 Lunedì — Chiuso\n🟢 Martedì – Venerdì — 09:00–13:00 · 14:00–19:30\n🟡 Sabato — 09:00–13:00 · 14:00–18:00\n🔴 Domenica — Chiuso\n\nPer prenotare o per info, scrivici su WhatsApp al **${PHONE}**! 📱`,
  },

  // ── PRICES ────────────────────────────────────────────────────────────────
  {
    patterns: ['prezzi', 'prezzo', 'costo', 'costa', 'quanto', 'tariffe', 'tariffa', 'listino', 'economico', 'costoso', 'cifra', 'soldi', 'euro', '€', 'prezzario', 'quanto si paga', 'quanto costa'],
    response: () =>
      `💈 **Listino prezzi:**\n\n✂️ Taglio e shampoo — **€17**\n👶 Taglio baby — **€13**\n🌡️ Barba con panno caldo — **€10**\n✂️ Barba modellata a forbici — **€8**\n💧 Shampoo e acconciatura — **€8**\n🪒 Barba rasata / lama — **€6**\n\nPrezzi fissi, chiari e trasparenti. Nessuna sorpresa in cassa! 😊`,
  },

  // ── BOOKING ───────────────────────────────────────────────────────────────
  {
    patterns: ['prenota', 'prenotare', 'prenotazione', 'appuntamento', 'fissare', 'fissa', 'riservare', 'riservo', 'voglio venire', 'posso venire', 'book'],
    response: () =>
      `📅 **Come prenotare:**\n\n1️⃣ Vai su **"Prenota"** nel menu del sito\n2️⃣ Scegli il servizio desiderato\n3️⃣ Seleziona il barbiere e l'orario\n4️⃣ Inserisci i tuoi dati e conferma\n\nIn alternativa, scrivici su **WhatsApp al ${PHONE}** e ti aiutiamo noi! 📱\n\nLa cancellazione è gratuita fino a **30 minuti** prima dell'appuntamento.`,
  },

  // ── SERVICES ──────────────────────────────────────────────────────────────
  {
    patterns: ['servizi', 'servizio', 'cosa fate', 'cosa offrite', 'trattamenti', 'specialità', 'capelli', 'taglio capelli', 'barba', 'shampoo', 'acconciatura', 'lama', 'rasatura', 'panno caldo'],
    response: () =>
      `💈 **I nostri servizi:**\n\n✂️ Taglio e shampoo\n👶 Taglio baby\n🪒 Barba rasata / lama\n✂️ Barba modellata a forbici\n🌡️ Barba con panno caldo\n💧 Shampoo e acconciatura\n\nVuoi sapere il prezzo di un servizio specifico? Chiedimi pure! 😊`,
  },

  // ── ADDRESS / LOCATION ────────────────────────────────────────────────────
  {
    patterns: ['dove', 'indirizzo', 'trovate', 'trovare', 'posizione', 'come arrivarci', 'come si arriva', 'arrivare', 'raggiungere', 'dove siete', 'sede', 'zona', 'quartiere', 'città', 'foggia', 'viale', 'strada', 'mappa', 'maps', 'navigatore'],
    response: () =>
      `📍 **Dove siamo:**\n\n🏠 Viale Ignazio d'Addedda, 236\n71122 Foggia (FG)\n\n🗺️ Apri su Google Maps:\n${MAPS}\n\nSiamo facilmente raggiungibili in auto o con i mezzi pubblici. Se hai dubbi, chiamaci! 📞`,
  },

  // ── CONTACT ───────────────────────────────────────────────────────────────
  {
    patterns: ['telefono', 'chiamare', 'chiamo', 'numero', 'contatto', 'contatti', 'whatsapp', 'messaggio', 'scrivere', 'email', 'mail', 'come contattarvi'],
    response: () =>
      `📞 **Contatti:**\n\n📱 Telefono / WhatsApp: **${PHONE}**\n📧 Email: ${EMAIL}\n📸 Instagram: ${IG}\n\nRispondiamo sempre il prima possibile! 😊`,
  },

  // ── CANCELLATION ──────────────────────────────────────────────────────────
  {
    patterns: ['cancellare', 'cancellazione', 'disdire', 'annullare', 'cancello', 'disdico', 'rimandare', 'posticipare'],
    response: () =>
      `❌ **Cancellazione appuntamento:**\n\nPuoi cancellare il tuo appuntamento fino a **30 minuti prima** dell'orario fissato, senza alcuna penale.\n\n**Come cancellare:**\n1. Accedi alla tua **Area cliente**\n2. Vai in **"Storico prenotazioni"**\n3. Clicca su **"Cancella"**\n\nOppure scrivici su WhatsApp al **${PHONE}** e lo facciamo noi! 📱`,
  },

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  {
    patterns: ['pagamento', 'pagare', 'carta', 'contanti', 'bancomat', 'cash', 'carte', 'pay', 'satispay', 'pos', 'bonifico', 'credito', 'debito'],
    response: () =>
      `💳 **Modalità di pagamento:**\n\nAccettiamo:\n✅ Contanti\n✅ Carta di credito / debito\n✅ Bancomat (POS)\n\nIl pagamento avviene direttamente in salone al termine del servizio. Nessuna sorpresa sui prezzi! 😊`,
  },

  // ── PARKING ───────────────────────────────────────────────────────────────
  {
    patterns: ['parcheggio', 'parchegg', 'macchina', 'auto', 'posteggio', 'posteggiare', 'parcheggiare', 'moto'],
    response: () =>
      `🚗 **Parcheggio:**\n\nNella zona di Viale Ignazio d'Addedda sono disponibili parcheggi pubblici nelle immediate vicinanze del salone.\n\nPer indicazioni precise usa Google Maps:\n${MAPS}`,
  },

  // ── KIDS / CHILDREN ───────────────────────────────────────────────────────
  {
    patterns: ['bambini', 'bambino', 'bambina', 'bimbo', 'bimba', 'figlio', 'figli', 'figlie', 'baby', 'piccoli', 'piccolo', 'primo taglio', 'ragazzi'],
    response: () =>
      `👶 **Servizi per bambini:**\n\nSiamo specializzati anche nei tagli per i più piccoli!\n\n✂️ **Taglio baby** — **€13**\n\nEseguito con massima cura, pazienza e professionalità, in un ambiente accogliente e confortevole.\n\nDal papà al nonno, dal ragazzo al bambino: ogni maschio trova il suo posto da Barberia Garofalo! 💈`,
  },

  // ── TEAM / BARBERS ────────────────────────────────────────────────────────
  {
    patterns: ['barbiere', 'barbieri', 'staff', 'team', 'chi siete', 'chi sono', 'chi lavora', 'personale', 'garofalo', 'professionisti', 'quante persone', 'esperienza'],
    response: () =>
      `👨‍💈 **Il nostro team:**\n\nLa **Barberia Garofalo** è un salone nel cuore di Foggia, nato come punto di riferimento per l'uomo di ogni età.\n\nOffriamo tagli precisi, rasature perfette, barbe curate e primi tagli per i piccoli eroi — eseguiti con dedizione, tecnica e massimo comfort.\n\nVisita la sezione **"Chi siamo"** per conoscerci meglio! 😊`,
  },

  // ── ACCOUNT / LOGIN ───────────────────────────────────────────────────────
  {
    patterns: ['account', 'registrarmi', 'registrazione', 'accedere', 'login', 'password', 'profilo', 'area cliente', 'accesso', 'iscrivermi', 'iscrizione'],
    response: () =>
      `👤 **Area Cliente:**\n\nPuoi registrarti **gratuitamente** per:\n• Vedere e gestire i tuoi appuntamenti\n• Consultare lo storico prenotazioni\n• Salvare le tue preferenze di taglio\n• Accedere più facilmente in futuro\n\nClicca su **"Accedi"** in alto a destra nel menu del sito! 🔐`,
  },

  // ── INSTAGRAM / SOCIAL ────────────────────────────────────────────────────
  {
    patterns: ['instagram', 'social', 'foto', 'fotografie', 'gallery', 'galleria', 'seguire', 'follow', 'post', 'stories'],
    response: () =>
      `📸 **Seguici su Instagram!**\n\n${IG}\n${IG_URL}\n\nPublichiamo i nostri ultimi lavori, novità e promozioni. Vieni a darci uno sguardo! 🌟`,
  },

  // ── WAIT TIME / QUEUE ─────────────────────────────────────────────────────
  {
    patterns: ['attesa', 'fila', 'coda', 'aspettare', 'tempo di attesa', 'quando libero', 'senza prenotazione', 'senza appuntamento'],
    response: () =>
      `⏳ **Tempi di attesa:**\n\nCon la prenotazione online puoi scegliere il tuo slot e **evitare qualsiasi attesa** !\n\nSe vuoi passare senza prenotazione, ti consigliamo di chiamarci prima al **${PHONE}** per verificare la disponibilità. 📱`,
  },

  // ── PROMOTIONS / DISCOUNT ─────────────────────────────────────────────────
  {
    patterns: ['sconto', 'sconti', 'promozione', 'promo', 'offerta', 'offerte', 'coupon', 'codice', 'convenzione', 'abbonamento'],
    response: () =>
      `🎁 **Promozioni:**\n\nDi tanto in tanto lanciamo promozioni esclusive!\n\nPer restare aggiornato:\n📸 Seguici su Instagram: ${IG}\n📱 O scrivici su WhatsApp al **${PHONE}**\n\nNon perdere le nostre novità! 🌟`,
  },

  // ── SITE PROBLEM ──────────────────────────────────────────────────────────
  {
    patterns: ['problema', 'problemi', 'errore', 'non funziona', 'bug', 'crash', 'sito down', 'non carica', 'tecnico', 'non riesco', 'non riesce', 'impossibile prenotare'],
    response: () =>
      `⚠️ **Problema tecnico:**\n\nMi dispiace per l'inconveniente! Il nostro sistema di monitoraggio è già al lavoro per rilevare e risolvere il problema.\n\nNel frattempo, contattaci direttamente:\n📱 WhatsApp: **${PHONE}**\n📧 Email: ${EMAIL}\n\nTi risponderemo immediatamente! 🔧`,
  },

  // ── GOODBYE ───────────────────────────────────────────────────────────────
  {
    patterns: ['grazie', 'ok grazie', 'perfetto grazie', 'arrivederci', 'ciao ciao', 'alla prossima', 'bye', 'a presto', 'saluti'],
    response: () =>
      `Prego! 😊 È stato un piacere aiutarti.\n\n**A presto da Barberia Garofalo!** ✂️\n\nRicorda: puoi sempre prenotare online o contattarci al **${PHONE}**!`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Intent detection: case-insensitive substring match
// ─────────────────────────────────────────────────────────────────────────────
function detectIntent(message: string): string {
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
  return `Non ho capito perfettamente la domanda 😅\n\nPosso aiutarti con:\n• ⏰ Orari di apertura\n• 💈 Servizi e prezzi\n• 📅 Come prenotare\n• 📍 Dove siamo\n• 📞 Contatti\n\nOppure scrivici su WhatsApp al **${PHONE}** e ti risponderemo subito! 📱`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────
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
