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

function detectIntent(message: string, isFriendMode: boolean): { replies: string[]; isFriendMode: boolean } {
  // Normalize character accents and punctuation
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Check if user wants to start or enter friend mode
  if (lower.includes('tranquilla chiacchierat') || lower.includes('chiacchierat') || lower.includes('amico') || lower.includes('parlare un po') || lower.includes('chiacchierare')) {
    return {
      replies: [
        "Ok ok! Allora rilassati, mettiti comodo... immagina di essere al bar con me davanti a una birra fresca. 🍻\n\nDimmi un po', come stai? Che si dice di bello?",
      ],
      isFriendMode: true,
    };
  }

  // 2. If already in friend mode
  if (isFriendMode) {
    // If the user wants to stop/exit
    if (lower.includes('basta') || lower.includes('esci') || lower.includes('fine') || lower.includes('stop') || lower.includes('ferma') || lower.includes('grazie')) {
      return {
        replies: [
          "Va benissimo! 💈 Se hai bisogno di info su orari, servizi o prenotazioni, chiedimi pure in qualsiasi momento. Alla prossima!",
        ],
        isFriendMode: false,
      };
    }

    // Check utility questions inside friend mode
    if (['orar', 'apert', 'chius', 'orari'].some(p => lower.includes(p))) {
      return {
        replies: [
          `⏰ **Orari del salone:**\n\n• Lunedì: Chiuso\n• Martedì – Venerdì: 09:00–13:00 e 14:00–19:30\n• Sabato: 09:00–13:00 e 14:00–18:00\n• Domenica: Chiuso`,
          "Comunque, tornando alla nostra chiacchierata... dove eravamo rimasti? Che stavi dicendo di bello? 😄"
        ],
        isFriendMode: true,
      };
    }

    if (['prezz', 'cost', 'tariff', 'listin', 'quanto cost', 'si paga'].some(p => lower.includes(p))) {
      return {
        replies: [
          `💈 **Listino prezzi:**\n\n• Taglio e shampoo: **€17**\n• Taglio baby (bimbi): **€13**\n• Barba con panno caldo: **€10**\n• Barba modellata a forbici: **€8**\n• Shampoo e acconciatura: **€8**\n• Barba rasata / lama: **€6**`,
          "Comunque, tornando alla nostra chiacchierata... dove eravamo rimasti? Che mi raccontavi di bello? 😄"
        ],
        isFriendMode: true,
      };
    }

    if (['prenot', 'appuntament', 'fiss', 'riserv'].some(p => lower.includes(p))) {
      return {
        replies: [
          `📅 **Come prenotare:**\n\nPuoi farlo direttamente sul sito cliccando su **"Prenota"** nel menu principale, oppure puoi scriverci su WhatsApp al **${PHONE}** e ti aiutiamo noi!`,
          "Comunque, tornando a noi... che si dice di bello? Ti va una chiacchierata? 😄"
        ],
        isFriendMode: true,
      };
    }

    if (['dove', 'indirizz', 'trov', 'posizion', 'mappa', 'maps'].some(p => lower.includes(p))) {
      return {
        replies: [
          `📍 **Dove siamo:**\n\n🏠 Viale Ignazio d'Addedda, 236 - 71122 Foggia (FG)\n🗺️ Google Maps: ${MAPS}`,
          "Comunque, tornando a noi... che mi racconti di bello? Come stai? 😄"
        ],
        isFriendMode: true,
      };
    }

    // Conversational topics
    if (['come stai', 'tutto bene', 'come va', 'che si dice', 'che fai', 'novita', 'tutto apposto', 'tutto ok'].some(p => lower.includes(p))) {
      const answers = [
        "Io alla grande! Sto curando i post social e sistemando alcune grafiche per il salone, c'è sempre qualcosa da fare per rendere tutto perfetto. 💻 Tu invece come stai? Tutto bene?",
        "Tutto a posto! Si programma, si pensa a nuove idee grafiche e ci si prepara per i prossimi clienti. 💈 Tu invece? Che fai di bello oggi? Lavoro o relax?",
        "Si tira avanti benissimo, tra una grafica e l'altra! 🎨 In salone c'è una bella atmosfera oggi. Tu che mi racconti? Com'è andata la giornata?"
      ];
      const random = answers[Math.floor(Math.random() * answers.length)];
      return { replies: [random], isFriendMode: true };
    }

    if (['chi sei', 'tuo ruolo', 'eliseo', 'cosa fai', 'ti occupi', 'creatore', 'gestore', 'grafico'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Sono Eliseo! 😊 Oltre ad aver creato e sviluppato questo sito, mi occupo di tutta l'immagine grafica e dei canali social di Barberia Garofalo. Insomma, faccio in modo che il salone abbia stile sia online che offline! Tu invece di cosa ti occupi? Lavori o studi?"
        ],
        isFriendMode: true,
      };
    }

    if (['inter', 'squadra', 'calcio', 'lautaro', 'partita', 'tifo', 'tifare'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Ah, se parliamo di Inter e di Lautaro sfondi una porta aperta! 🖤💙 Da buon nerazzurro, per me c'è solo una squadra. Tu per chi fai il tifo? Spero che non siamo rivali calcistici! 😂"
        ],
        isFriendMode: true,
      };
    }

    if (['birra', 'bere', 'bar', 'pub', 'drink', 'offro', 'bicchiere'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Magari potessimo berla davvero adesso! 🍺 Una bella bionda fresca ghiacciata ci starebbe tutta. La prossima volta che passi in Viale d'Addedda, ci facciamo una bella chiacchierata dal vivo. Tu che birra bevi di solito?"
        ],
        isFriendMode: true,
      };
    }

    if (['lavoro', 'studio', 'scuola', 'universita', 'ufficio', 'pc', 'programma', 'codice'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Capisco perfettamente! Ci sta metterci impegno nel proprio percorso. Ricordati però di prenderti sempre delle pause per staccare... e magari farti un bel taglio per rinfrescare lo stile! 😂 Che lavoro/studio fai di preciso?"
        ],
        isFriendMode: true,
      };
    }

    if (['tempo', 'meteo', 'caldo', 'freddo', 'pioggia', 'estate', 'clima'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Qui a Foggia quando arriva l'estate si fa sentire sul serio! 🔥 Per fortuna in salone si sta freschi con l'aria condizionata. Da te com'è la situazione meteo oggi?"
        ],
        isFriendMode: true,
      };
    }

    if (['bravo', 'complimenti', 'bello', 'grande', 'mitico', 'super'].some(p => lower.includes(p))) {
      return {
        replies: [
          "Grazie di cuore, troppo gentile! Ci metto sempre un sacco di passione in quello che faccio. 😊 Dimmi, ti piace come abbiamo impostato il sito?"
        ],
        isFriendMode: true,
      };
    }

    const generalReplies = [
      "Ci sta! Alla fine la vita è fatta anche di queste chiacchiere semplici davanti a un bancone immaginario. 🍺 Ma dimmi, che programmi hai per stasera o per il weekend?",
      "Ahahah, ci sta! Comunque è sempre bello fare due chiacchiere per staccare dal caos quotidiano. A proposito, sei di Foggia o abiti nei dintorni?",
      "Interessante! Mi fa piacere confrontarmi. Senti, ma hai già dato un'occhiata alla nostra Galleria dei tagli sul sito? Ci sono dei lavori pazzeschi di Luigi!",
      "Capisco! E dimmi, qual è la cosa che ti fa rilassare di più dopo una giornata intensa?"
    ];
    const randIdx = Math.floor(Math.random() * generalReplies.length);
    return { replies: [generalReplies[randIdx]], isFriendMode: true };
  }

  // 3. Regular informative mode
  const suffix = "Basta così? Vuoi sapere qualcos'altro? O vuoi fare una tranquilla chiacchierata?";

  // 1. Check greeting
  const greetingIntent = INTENTS[0];
  const greetingNormalised = greetingIntent.patterns.map(p => p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  if (greetingNormalised.some(pattern => lower.includes(pattern))) {
    return { replies: [greetingIntent.response()], isFriendMode: false };
  }

  // 2. Check goodbye
  const goodbyeIntent = INTENTS[INTENTS.length - 1];
  const goodbyeNormalised = goodbyeIntent.patterns.map(p => p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  if (goodbyeNormalised.some(pattern => lower.includes(pattern))) {
    return { replies: [goodbyeIntent.response()], isFriendMode: false };
  }

  // 3. Check all other intents
  for (let i = 1; i < INTENTS.length - 1; i++) {
    const intent = INTENTS[i];
    const normalised = intent.patterns.map(p =>
      p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    if (normalised.some(pattern => lower.includes(pattern))) {
      return { replies: [intent.response(), suffix], isFriendMode: false };
    }
  }

  // Fallback
  return {
    replies: [
      `Non ho capito la domanda 😅\n\nChiedimi informazioni su:\n• ⏰ Orari di apertura\n• 💈 Servizi e prezzi\n• 📅 Come prenotare\n• 📍 Dove siamo\n• 📞 Contatti\n\nOppure scrivici su WhatsApp al **${PHONE}** e ti risponderemo subito! 📱`,
      suffix
    ],
    isFriendMode: false
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body?.message ?? '';
    const isFriendMode: boolean = !!body?.isFriendMode;

    if (!message.trim()) {
      return NextResponse.json({ replies: ['Scrivi un messaggio per iniziare! 😊'], isFriendMode: false });
    }

    // Small artificial delay for a more natural feel
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const { replies, isFriendMode: newFriendMode } = detectIntent(message, isFriendMode);
    return NextResponse.json({ replies, isFriendMode: newFriendMode });
  } catch {
    return NextResponse.json(
      { replies: [`Mi dispiace, si è verificato un errore. Contattaci su WhatsApp al ${SITE_CONFIG.phoneDisplay}. 📱`], isFriendMode: false },
      { status: 500 }
    );
  }
}
