/**
 * Eliseo — assistente virtuale di Barberia Garofalo.
 *
 * Motore deterministico: risponde SOLO con informazioni reali del sito
 * (SITE_CONFIG + servizi, barbieri e promozioni letti da Supabase).
 * Non inventa nulla: se non sa, rimanda a WhatsApp/telefono.
 */
import { SITE_CONFIG } from '@/lib/site-config';

// ─── Tipi ──────────────────────────────────────────────────────────────────────

export interface ChatService {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
}

export interface ChatBarber {
  name: string;
  role: string;
}

export interface ChatPromotion {
  title: string;
  description: string | null;
  code: string | null;
  discount_type: 'percent' | 'fixed' | string;
  discount_value: number;
  ends_at: string | null;
  serviceName?: string | null;
}

export interface ChatKnowledge {
  services: ChatService[];
  barbers: ChatBarber[];
  promotions: ChatPromotion[];
  now?: Date;
}

export interface ChatAction {
  label: string;
  href: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  replies: string[];
  actions: ChatAction[];
  suggestions: string[];
}

// ─── Utilità testo ─────────────────────────────────────────────────────────────

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9€\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/** Una parola del messaggio inizia con la radice indicata (match a inizio parola, mai a metà). */
function hasStem(tokens: string[], stem: string): boolean {
  return tokens.some((t) => t.startsWith(stem));
}

/** Frase intera, delimitata da spazi. */
function hasPhrase(norm: string, phrase: string): boolean {
  return ` ${norm} `.includes(` ${phrase} `);
}

const euro = (cents: number) =>
  `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')}`;

// ─── Dati fissi dal sito ───────────────────────────────────────────────────────

const PHONE = SITE_CONFIG.phoneDisplay;
const WA_LINK = `https://wa.me/${SITE_CONFIG.whatsapp}`;

const ACTIONS = {
  book: { label: 'Prenota ora', href: '/prenota' },
  services: { label: 'Servizi e prezzi', href: '/servizi' },
  whatsapp: { label: 'Scrivi su WhatsApp', href: WA_LINK },
  call: { label: `Chiama ${PHONE}`, href: `tel:${SITE_CONFIG.phone}` },
  maps: { label: 'Apri in Maps', href: SITE_CONFIG.googleMapsUrl },
  contacts: { label: 'Contatti', href: '/contatti' },
  about: { label: 'Chi siamo', href: '/chi-siamo' },
  gallery: { label: 'Galleria', href: '/galleria' },
  reviews: { label: 'Recensioni', href: '/recensioni' },
  login: { label: 'Accedi', href: '/login' },
  register: { label: 'Registrati', href: '/register' },
  appointments: { label: 'I miei appuntamenti', href: '/area-cliente/appuntamenti' },
  instagram: { label: 'Instagram', href: SITE_CONFIG.instagram },
  leaveReview: { label: 'Lascia una recensione', href: SITE_CONFIG.googleReviewUrl },
} satisfies Record<string, ChatAction>;

const DEFAULT_SUGGESTIONS = ['Orari', 'Prezzi', 'Come prenoto?', 'Dove siete?'];

// ─── Orari ─────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const DAY_STEMS = ['domenic', 'luned', 'marted', 'mercoled', 'gioved', 'venerd', 'sabat'];

type Period = { start: string; end: string };

function periodsForDay(dow: number): Period[] {
  const row = SITE_CONFIG.detailedHours.find((h) => normalize(h.day) === normalize(DAY_NAMES[dow]));
  if (!row || /chius/i.test(row.time)) return [];
  return row.time.split('·').map((chunk) => {
    const [start, end] = chunk.split(/[–-]/).map((s) => s.trim());
    return { start, end };
  });
}

function formatPeriods(periods: Period[]): string {
  if (periods.length === 0) return 'chiuso';
  return periods.map((p) => `${p.start}–${p.end}`).join(' e ');
}

/** Giorno della settimana e ora correnti a Foggia (Europe/Rome). */
function romeNow(now: Date): { dow: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { dow, hhmm: `${hour}:${get('minute')}` };
}

function openStatus(now: Date): string {
  const { dow, hhmm } = romeNow(now);
  const today = periodsForDay(dow);
  const current = today.find((p) => hhmm >= p.start && hhmm < p.end);
  if (current) return `🟢 **Adesso siamo aperti.** Oggi chiudiamo alle ${current.end}.`;

  const later = today.find((p) => hhmm < p.start);
  if (later) return `🔴 **Adesso siamo chiusi.** Oggi riapriamo alle ${later.start}.`;

  for (let i = 1; i <= 7; i++) {
    const d = (dow + i) % 7;
    const periods = periodsForDay(d);
    if (periods.length > 0) {
      const when = i === 1 ? 'domani' : DAY_NAMES[d].toLowerCase();
      return `🔴 **Adesso siamo chiusi.** Riapriamo ${when} alle ${periods[0].start}.`;
    }
  }
  return '🔴 **Adesso siamo chiusi.**';
}

function hoursTable(): string {
  return SITE_CONFIG.hours.map((h) => `• **${h.day}:** ${h.time.replace(/ – /g, '–')}`).join('\n');
}

// ─── Servizi ───────────────────────────────────────────────────────────────────

const CATEGORY_STEMS: Record<string, string[]> = {
  taglio: ['tagli', 'capell', 'sfumat', 'fade', 'rasta'],
  baby: ['baby', 'bimb', 'bambin', 'figli', 'piccol', 'neonat'],
  barba: ['barba', 'rasat', 'lama', 'baffi', 'pizzett'],
  styling: ['acconciat', 'piega', 'styling', 'shampoo', 'lavaggio'],
};

const STOPWORDS = new Set(['e', 'a', 'con', 'di', 'il', 'la', 'le', 'lo', 'per']);

/** Trova i servizi citati nel messaggio. Restituisce i più pertinenti. */
function findServices(tokens: string[], services: ChatService[]): ChatService[] {
  const scored = services
    .map((s) => {
      let score = 0;
      for (const w of tokenize(s.name)) {
        if (STOPWORDS.has(w) || w.length < 3) continue;
        const stem = w.length <= 5 ? w : w.slice(0, w.length - 2);
        if (hasStem(tokens, stem)) score += 2;
      }
      for (const stem of CATEGORY_STEMS[s.category] ?? []) {
        if (hasStem(tokens, stem)) score += 1;
      }
      // "taglio baby" vince su "taglio e shampoo" quando si parla di bimbi
      if (s.category === 'taglio' && CATEGORY_STEMS.baby.some((x) => hasStem(tokens, x))) score -= 2;
      return { s, score };
    })
    .filter((x) => x.score > 0);

  if (scored.length === 0) return [];
  const best = Math.max(...scored.map((x) => x.score));
  return scored.filter((x) => x.score === best).map((x) => x.s);
}

function serviceLine(s: ChatService): string {
  return `• ${s.name}: **${euro(s.price_cents)}** · ${s.duration_minutes} min`;
}

function priceList(services: ChatService[]): string {
  return services.map(serviceLine).join('\n');
}

// ─── Intenti ───────────────────────────────────────────────────────────────────

type IntentId =
  | 'hours'
  | 'openNow'
  | 'prices'
  | 'services'
  | 'duration'
  | 'booking'
  | 'cancel'
  | 'location'
  | 'contacts'
  | 'payment'
  | 'kids'
  | 'team'
  | 'account'
  | 'promo'
  | 'social'
  | 'reviews'
  | 'parking'
  | 'walkin'
  | 'site'
  | 'who'
  | 'greeting'
  | 'thanks'
  | 'howAreYou'
  | 'barber';

interface IntentDef {
  id: IntentId;
  stems?: string[];
  phrases?: string[];
  weight?: number;
}

const INTENTS: IntentDef[] = [
  {
    id: 'hours',
    stems: ['orar', 'apert', 'aprit', 'apre', 'apro', 'chius', 'chiud', 'festiv', 'pausa', 'weekend'],
    phrases: ['a che ora', 'che ore', 'fino a che ora', 'fino a quando', 'che giorni', 'quali giorni', 'quando siete'],
  },
  {
    id: 'openNow',
    phrases: ['siete aperti', 'siete aperti adesso', 'aperti ora', 'aperti adesso', 'aperto adesso', 'aperto ora', 'oggi siete aperti', 'aperti oggi', 'adesso', 'in questo momento'],
    weight: 2,
  },
  {
    id: 'prices',
    stems: ['prezz', 'tariff', 'listin'],
    phrases: ['quanto', 'costa', 'costo', 'costi', 'costano', 'si paga', 'quanto pago', 'quanto viene', 'quanto si spende', 'quanti soldi', 'quanti euro', 'euro', '€'],
  },
  {
    id: 'services',
    stems: ['serviz', 'trattament'],
    phrases: ['cosa fate', 'che fate', 'cosa offrite', 'che servizi', 'fate anche', 'fate la', 'fate il', 'si puo fare'],
  },
  {
    id: 'duration',
    stems: ['dur'],
    phrases: ['quanto tempo', 'quanto ci vuole', 'quanto ci mette', 'quanti minuti', 'tempo ci vuole'],
    weight: 2,
  },
  {
    id: 'booking',
    stems: ['prenot', 'appuntament', 'riserv', 'disponibil', 'book'],
    phrases: ['fissare', 'posto libero', 'c e posto', 'ce posto', 'avete posto', 'venire oggi', 'venire domani'],
  },
  {
    id: 'cancel',
    stems: ['cancell', 'disdi', 'disdett', 'annull', 'rimand', 'posticip', 'spost', 'modific', 'ritard'],
    phrases: ['non posso venire', 'cambiare orario', 'cambiare appuntamento'],
    weight: 2,
  },
  {
    id: 'location',
    stems: ['indirizz', 'posizion', 'raggiung', 'mappa', 'maps', 'navigator', 'sede', 'via'],
    phrases: ['dove', 'dove siete', 'dove si trova', 'come arrivo', 'come arrivare', 'vi trovo'],
  },
  {
    id: 'contacts',
    stems: ['telefon', 'chiam', 'numer', 'contatt', 'whatsapp', 'email', 'mail', 'cellular'],
    phrases: ['scrivervi', 'vi scrivo', 'come vi contatto'],
  },
  {
    id: 'payment',
    stems: ['pagament', 'pagar', 'pago', 'carta', 'carte', 'contant', 'bancomat', 'cash', 'satispay', 'bonific', 'anticip'],
    phrases: ['pos'],
    weight: 2,
  },
  {
    id: 'kids',
    stems: ['bambin', 'bimb', 'figli', 'piccol', 'neonat'],
    phrases: ['primo taglio', 'mio figlio', 'mia figlia', 'taglio baby'],
  },
  {
    id: 'team',
    stems: ['barbier', 'staff', 'team', 'luigi', 'vittorio', 'francesco', 'titolar', 'personale', 'collaborat'],
    phrases: ['chi lavora', 'chi taglia', 'quanti siete', 'chi siete'],
  },
  {
    id: 'account',
    stems: ['account', 'registr', 'login', 'password', 'profil', 'iscriv', 'passkey', 'credenzial'],
    phrases: ['area cliente', 'accedere', 'accedo', 'entrare nel sito'],
  },
  {
    id: 'promo',
    stems: ['promo', 'scont', 'offert', 'coupon', 'codic'],
    weight: 2,
  },
  {
    id: 'social',
    stems: ['instagram', 'social', 'foto', 'galleri', 'gallery'],
    phrases: ['ig', 'insta', 'lavori fatti'],
  },
  {
    id: 'reviews',
    stems: ['recension', 'opinion', 'stelle', 'feedback', 'giudiz'],
  },
  {
    id: 'parking',
    stems: ['parchegg', 'postegg', 'macchin', 'auto', 'moto', 'bus', 'autobus'],
  },
  {
    id: 'walkin',
    phrases: ['senza appuntamento', 'senza prenotare', 'senza prenotazione', 'passare direttamente', 'posso passare', 'vengo direttamente', 'fila', 'attesa'],
    weight: 2,
  },
  {
    id: 'site',
    phrases: ['chi ha fatto il sito', 'chi ha creato il sito', 'chi ha realizzato il sito', 'sito fatto da', 'grafica del sito'],
    weight: 3,
  },
  {
    id: 'who',
    stems: ['eliseo', 'robot', 'umano'],
    phrases: ['chi sei', 'sei un bot', 'sei una persona', 'sei vero', 'come ti chiami', 'cosa sai fare', 'cosa puoi fare', 'intelligenza artificiale'],
    weight: 2,
  },
  {
    id: 'greeting',
    stems: ['ciao', 'salve', 'buongiorno', 'buonasera', 'buonpomeriggio', 'hey', 'hello', 'hola'],
    phrases: ['buon giorno', 'buona sera', 'buon pomeriggio'],
  },
  {
    id: 'thanks',
    stems: ['grazie', 'grazi', 'arrivederci', 'bye', 'gentilissim'],
    phrases: ['a presto', 'alla prossima', 'ok grazie', 'perfetto', 'ottimo', 'va bene'],
  },
  {
    id: 'howAreYou',
    phrases: ['come stai', 'come va', 'tutto bene', 'che si dice', 'come butta'],
    weight: 2,
  },
];

function scoreIntents(norm: string, tokens: string[]): { id: IntentId; score: number }[] {
  return INTENTS.map((def) => {
    let score = 0;
    for (const stem of def.stems ?? []) if (hasStem(tokens, stem)) score += 1;
    for (const phrase of def.phrases ?? []) if (hasPhrase(norm, phrase)) score += phrase.includes(' ') ? 1.5 : 1;
    return { id: def.id, score: score * (def.weight ?? 1) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

const SOCIAL_ONLY: IntentId[] = ['greeting', 'thanks', 'howAreYou'];

// ─── Risposte ──────────────────────────────────────────────────────────────────

class Reply {
  parts: string[] = [];
  actions: ChatAction[] = [];
  suggestions: string[] = [];
  add(text: string, ...actions: ChatAction[]) {
    this.parts.push(text);
    for (const a of actions) if (!this.actions.some((x) => x.href === a.href)) this.actions.push(a);
  }
  suggest(...s: string[]) {
    for (const x of s) if (!this.suggestions.includes(x)) this.suggestions.push(x);
  }
}

function cutBookingNote(): string {
  return 'I **tagli** (anche baby) si prenotano online con **Luigi**. Per i servizi **barba** puoi scegliere il barbiere che preferisci.';
}

function answer(id: IntentId, ctx: Ctx, r: Reply) {
  const { k, tokens, norm, mentioned } = ctx;
  const now = k.now ?? new Date();

  switch (id) {
    case 'hours': {
      const askedDays = DAY_STEMS.map((s, i) => (hasStem(tokens, s) ? i : -1)).filter((i) => i >= 0);
      if (hasPhrase(norm, 'oggi')) askedDays.push(romeNow(now).dow);
      if (hasPhrase(norm, 'domani')) askedDays.push((romeNow(now).dow + 1) % 7);
      const unique = [...new Set(askedDays)];
      if (unique.length > 0 && unique.length <= 2) {
        const lines = unique.map((d) => {
          const p = periodsForDay(d);
          return p.length ? `• **${DAY_NAMES[d]}:** ${formatPeriods(p)}` : `• **${DAY_NAMES[d]}:** chiuso`;
        });
        r.add(`⏰ ${lines.join('\n')}`);
      } else {
        r.add(`⏰ **Orari del salone:**\n\n${hoursTable()}`);
      }
      r.add(openStatus(now), ACTIONS.book);
      r.suggest('Come prenoto?', 'Dove siete?');
      return;
    }

    case 'openNow': {
      r.add(openStatus(now));
      r.add(`Orari completi:\n${hoursTable()}`, ACTIONS.book);
      r.suggest('Come prenoto?', 'Dove siete?');
      return;
    }

    case 'prices': {
      if (mentioned.length > 0) {
        r.add(`💈 ${mentioned.length === 1 ? 'Prezzo' : 'Prezzi'}:\n\n${priceList(mentioned)}`, ACTIONS.book);
      } else {
        r.add(`💈 **Listino prezzi:**\n\n${priceList(k.services)}\n\nShampoo e consulenza styling inclusi con ogni taglio. Nessun supplemento nascosto.`, ACTIONS.services, ACTIONS.book);
      }
      if (k.promotions.length > 0) r.add(`🎁 Ci sono **promozioni attive**: scrivi "promozioni" per i dettagli.`);
      r.suggest('Come prenoto?', 'Orari');
      return;
    }

    case 'services': {
      if (mentioned.length > 0) {
        r.add(`Sì, lo facciamo! ✂️\n\n${priceList(mentioned)}`, ACTIONS.book);
      } else {
        r.add(`💈 **I nostri servizi:**\n\n${priceList(k.services)}`, ACTIONS.services, ACTIONS.book);
      }
      r.suggest('Come prenoto?', 'Chi sono i barbieri?');
      return;
    }

    case 'duration': {
      const list = mentioned.length > 0 ? mentioned : k.services;
      r.add(`⏱️ **Durata indicativa:**\n\n${list.map((s) => `• ${s.name}: **${s.duration_minutes} min**`).join('\n')}`, ACTIONS.book);
      r.suggest('Prezzi', 'Come prenoto?');
      return;
    }

    case 'booking': {
      r.add(
        `📅 **Come prenotare:**\n\n1. Vai su **Prenota**\n2. Scegli servizio, giorno e orario libero\n3. Inserisci i tuoi dati e conferma\n\nRicevi la conferma via email. Nessun pagamento anticipato: paghi in salone.\n\n${cutBookingNote()}`,
        ACTIONS.book
      );
      r.add(`Preferisci farlo a voce? Scrivici su WhatsApp al **${PHONE}**.`, ACTIONS.whatsapp);
      r.suggest('Posso disdire?', 'Orari');
      return;
    }

    case 'cancel': {
      r.add(
        `🔁 **Modifica o disdetta:**\n\nÈ gratuita fino a **${SITE_CONFIG.cancellationMinutes} minuti prima** dell'appuntamento.\n\n• Dall'**Area Cliente** → "Appuntamenti" → "Modifica" o "Disdici"\n• Oppure su WhatsApp al **${PHONE}**\n\nSe sei in ritardo, avvisaci su WhatsApp così ci organizziamo.`,
        ACTIONS.appointments,
        ACTIONS.whatsapp
      );
      r.suggest('Come prenoto?');
      return;
    }

    case 'location': {
      r.add(`📍 **Dove siamo:**\n\n${SITE_CONFIG.addressShort}\n${SITE_CONFIG.addressCity}`, ACTIONS.maps);
      r.suggest('Orari', 'Parcheggio?');
      return;
    }

    case 'contacts': {
      r.add(
        `📞 **Contatti:**\n\n• **Telefono / WhatsApp:** ${PHONE}\n• **Email:** ${SITE_CONFIG.email}\n• **Instagram:** ${SITE_CONFIG.instagramHandle}`,
        ACTIONS.whatsapp,
        ACTIONS.call
      );
      r.suggest('Orari', 'Dove siete?');
      return;
    }

    case 'payment': {
      r.add(
        `💳 **Pagamento:**\n\nPaghi in salone **dopo il servizio**: contanti, bancomat o carta.\nNessun pagamento anticipato quando prenoti online.`
      );
      r.suggest('Prezzi', 'Come prenoto?');
      return;
    }

    case 'kids': {
      const baby = k.services.filter((s) => s.category === 'baby');
      const line = baby.length ? `\n\n${priceList(baby)}` : '';
      r.add(
        `👶 **Bambini:**\n\nQui i bimbi sono di casa. Prendiamo tutto il tempo necessario: niente fretta, niente pressione.${line}\n\nSe è il **primo taglio**, scrivilo nelle note quando prenoti.`,
        ACTIONS.book
      );
      r.suggest('Orari', 'Come prenoto?');
      return;
    }

    case 'team': {
      const list = k.barbers.map((b) => `• **${b.name}** — ${b.role}`).join('\n');
      r.add(
        `👨‍💈 **Il team:**\n\n${list}\n\nLuigi fa questo lavoro dal 2012 e ha aperto la sua Barberia dopo 13 anni di gavetta.\n\n${cutBookingNote()}`,
        ACTIONS.about,
        ACTIONS.book
      );
      r.suggest('Prezzi', 'Come prenoto?');
      return;
    }

    case 'barber': {
      const b = k.barbers.find((x) => hasStem(tokens, normalize(x.name).split(' ')[0]));
      if (!b) return;
      const first = b.name.split(' ')[0];
      const isLuigi = /luigi/i.test(b.name);
      r.add(
        isLuigi
          ? `✂️ **${b.name}** è il titolare. Con lui prenoti online **tutti i servizi**, tagli compresi.`
          : `✂️ Con **${first}** puoi prenotare online i servizi **barba**.\nI **tagli** si prenotano online con **Luigi**. Se vuoi il taglio con ${first}, scrivici su WhatsApp al **${PHONE}**.`,
        ACTIONS.book,
        ACTIONS.whatsapp
      );
      r.suggest('Prezzi', 'Orari');
      return;
    }

    case 'account': {
      r.add(
        `👤 **Area Cliente:**\n\nCon un account puoi:\n• vedere e gestire i tuoi appuntamenti\n• modificare o disdire\n• consultare lo storico dei tagli\n• entrare con Passkey (impronta o volto)\n\nPassword dimenticata? Usa "Password dimenticata" nella pagina di accesso.`,
        ACTIONS.login,
        ACTIONS.register
      );
      r.suggest('Come prenoto?');
      return;
    }

    case 'promo': {
      if (k.promotions.length === 0) {
        r.add(`🎁 Al momento non ci sono promozioni attive.\nSeguici su Instagram **${SITE_CONFIG.instagramHandle}** per non perderti le prossime.`, ACTIONS.instagram);
      } else {
        const lines = k.promotions.map((p) => {
          const value = p.discount_type === 'percent' ? `-${p.discount_value}%` : `-${euro(p.discount_value)}`;
          const on = p.serviceName ? ` su ${p.serviceName}` : '';
          const code = p.code ? ` · codice **${p.code}**` : '';
          const until = p.ends_at ? ` · fino al ${new Date(p.ends_at).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}` : '';
          return `• **${p.title}** (${value}${on})${code}${until}`;
        });
        r.add(`🎁 **Promozioni attive:**\n\n${lines.join('\n')}`, ACTIONS.services, ACTIONS.book);
      }
      r.suggest('Prezzi');
      return;
    }

    case 'social': {
      r.add(`📸 Guarda i nostri lavori nella **Galleria** e su Instagram **${SITE_CONFIG.instagramHandle}**.`, ACTIONS.gallery, ACTIONS.instagram);
      r.suggest('Prezzi', 'Come prenoto?');
      return;
    }

    case 'reviews': {
      r.add(`⭐ Leggi cosa dicono i nostri clienti nella pagina **Recensioni**.\nSei già stato da noi? Ci fa piacere un tuo parere!`, ACTIONS.reviews, ACTIONS.leaveReview);
      return;
    }

    case 'parking': {
      r.add(
        `🚗 Ci trovi in **${SITE_CONFIG.addressShort}**, Foggia.\nPer info su parcheggio e come arrivare, scrivici su WhatsApp al **${PHONE}**.`,
        ACTIONS.maps,
        ACTIONS.whatsapp
      );
      return;
    }

    case 'walkin': {
      r.add(
        `Ti consigliamo di **prenotare**: così hai il tuo orario garantito, senza attese.\nPer sapere se c'è posto subito, scrivici su WhatsApp al **${PHONE}**.`,
        ACTIONS.book,
        ACTIONS.whatsapp
      );
      r.add(openStatus(now));
      return;
    }

    case 'site': {
      r.add(`💻 Sito e grafica sono stati realizzati da **Eliseo Miraglia** (IG @eliseomiraglia).`, { label: '@eliseomiraglia', href: 'https://www.instagram.com/eliseomiraglia' });
      return;
    }

    case 'who': {
      r.add(
        `Sono **Eliseo**, l'assistente virtuale della Barberia Garofalo 🤖✂️\n\nTi aiuto con orari, servizi, prezzi, prenotazioni e contatti.\nPer tutto il resto c'è lo staff su WhatsApp al **${PHONE}**.`
      );
      r.suggest(...DEFAULT_SUGGESTIONS);
      return;
    }

    case 'greeting': {
      r.add(`Ciao! 👋 Sono **Eliseo**, l'assistente della Barberia Garofalo.\nCome posso aiutarti?`);
      r.suggest(...DEFAULT_SUGGESTIONS);
      return;
    }

    case 'howAreYou': {
      r.add(`Tutto bene, grazie! 😊 Sono qui per aiutarti. Cosa ti serve?`);
      r.suggest(...DEFAULT_SUGGESTIONS);
      return;
    }

    case 'thanks': {
      r.add(`Figurati! 😊 Se ti serve altro, sono qui. A presto da Barberia Garofalo ✂️`, ACTIONS.book);
      return;
    }
  }
}

interface Ctx {
  k: ChatKnowledge;
  tokens: string[];
  norm: string;
  mentioned: ChatService[];
}

// ─── Entry point ───────────────────────────────────────────────────────────────

export function respond(message: string, history: ChatHistoryItem[], k: ChatKnowledge): ChatResult {
  const norm = normalize(message);
  const tokens = norm.split(' ').filter(Boolean);
  const r = new Reply();

  if (!norm) {
    return { replies: ['Scrivi pure la tua domanda 😊'], actions: [], suggestions: DEFAULT_SUGGESTIONS };
  }

  let mentioned = findServices(tokens, k.services);
  let ranked = scoreIntents(norm, tokens);

  // Domanda di seguito ("e la barba?", "quanto?") → riusa il contesto dell'ultima domanda.
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isShortFollowUp = tokens.length <= 5;
  if (isShortFollowUp && lastUser) {
    const prevTokens = tokenize(lastUser);
    const prevNorm = normalize(lastUser);
    const prevIntents = scoreIntents(prevNorm, prevTokens).filter((x) => !SOCIAL_ONLY.includes(x.id));
    const onlySocialOrNone = ranked.every((x) => SOCIAL_ONLY.includes(x.id));

    if (onlySocialOrNone && mentioned.length > 0 && prevIntents.length > 0) {
      // "e la barba?" dopo "quanto costa un taglio?"
      ranked = [{ id: prevIntents[0].id, score: 1 }, ...ranked];
    } else if (onlySocialOrNone && DAY_STEMS.some((s) => hasStem(tokens, s)) && prevIntents.some((x) => x.id === 'hours' || x.id === 'openNow')) {
      // "e sabato?" dopo una domanda sugli orari
      ranked = [{ id: 'hours', score: 1 }, ...ranked];
    }
    if (mentioned.length === 0 && ranked.some((x) => ['prices', 'duration'].includes(x.id))) {
      mentioned = findServices(prevTokens, k.services);
    }
  }

  // Un servizio citato senza domanda esplicita ("fate le sfumature?") → sì, con prezzo.
  if (ranked.every((x) => SOCIAL_ONLY.includes(x.id)) && mentioned.length > 0) {
    ranked = [{ id: 'services', score: 1 }, ...ranked];
  }

  // Un giorno della settimana da solo ("sabato?") → orari.
  if (ranked.length === 0 && DAY_STEMS.some((s) => hasStem(tokens, s))) {
    ranked = [{ id: 'hours', score: 1 }];
  }

  // "bambini" + prezzo → basta il listino baby, senza doppione.
  if (ranked.some((x) => x.id === 'kids') && ranked.some((x) => x.id === 'prices')) {
    ranked = ranked.filter((x) => x.id !== 'prices');
  }
  // "domenica siete aperti?" → orari di quel giorno, non "adesso".
  const namesDay = DAY_STEMS.some((st) => hasStem(tokens, st)) || hasPhrase(norm, 'domani');
  if (namesDay && ranked.some((x) => x.id === 'openNow')) {
    ranked = ranked.filter((x) => x.id !== 'openNow');
    if (!ranked.some((x) => x.id === 'hours')) ranked = [{ id: 'hours', score: 1 }, ...ranked];
  }
  // "aperti adesso" → non ripetere anche gli orari completi.
  if (ranked.some((x) => x.id === 'openNow')) ranked = ranked.filter((x) => x.id !== 'hours');
  // Bambini: la risposta dedicata include già il servizio baby.
  if (ranked.some((x) => x.id === 'kids')) ranked = ranked.filter((x) => x.id !== 'services');
  // Barbiere citato per nome → risposta su quel barbiere.
  const namedBarber = k.barbers.find((b) => hasStem(tokens, normalize(b.name).split(' ')[0]));
  if (namedBarber) {
    ranked = [{ id: 'barber' as IntentId, score: 9 }, ...ranked.filter((x) => !['team', 'booking'].includes(x.id))];
  }
  // Disdetta/modifica parla di appuntamenti: non serve anche "come prenotare".
  if (ranked.some((x) => x.id === 'cancel')) ranked = ranked.filter((x) => x.id !== 'booking');
  // Senza appuntamento → risposta dedicata.
  if (ranked.some((x) => x.id === 'walkin')) ranked = ranked.filter((x) => x.id !== 'booking');
  // "Quanto dura?" → durata, non listino.
  if (ranked.some((x) => x.id === 'duration') && !hasStem(tokens, 'prezz') && !['costa', 'costo', 'costi'].some((w) => tokens.includes(w))) {
    ranked = ranked.filter((x) => x.id !== 'prices');
  }
  // Prezzo + servizi elencati: una sola risposta.
  if (ranked.some((x) => x.id === 'prices')) ranked = ranked.filter((x) => x.id !== 'services');
  // "Pago con carta?" → pagamento, non listino.
  if (ranked.some((x) => x.id === 'payment') && !hasStem(tokens, 'prezz') && !hasStem(tokens, 'cost') && mentioned.length === 0) {
    ranked = ranked.filter((x) => x.id !== 'prices');
  }

  const business = ranked.filter((x) => !SOCIAL_ONLY.includes(x.id));
  const chosen: IntentId[] = business.length > 0 ? business.slice(0, 3).map((x) => x.id) : ranked.slice(0, 1).map((x) => x.id);

  if (chosen.length === 0) {
    r.add(
      `Su questo non ho informazioni 😅\n\nPosso aiutarti con:\n• ⏰ Orari\n• 💈 Servizi e prezzi\n• 📅 Prenotazioni e disdette\n• 📍 Dove siamo\n• 📞 Contatti\n\nPer altro, scrivi allo staff su WhatsApp al **${PHONE}**.`,
      ACTIONS.whatsapp
    );
    r.suggest(...DEFAULT_SUGGESTIONS);
  } else {
    // Saluto + domanda ("ciao, quanto costa la barba?") → rispondi direttamente.
    for (const id of chosen) answer(id, { k, tokens, norm, mentioned }, r);
  }

  return {
    replies: r.parts,
    actions: r.actions.slice(0, 3),
    suggestions: r.suggestions.slice(0, 4),
  };
}
