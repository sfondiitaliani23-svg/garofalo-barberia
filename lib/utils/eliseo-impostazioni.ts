// Impostazioni dell'area Eliseo, sul modello di Keplero (09/11/2026).
// Si salvano in site_content (chiave `eliseo:impostazioni`, is_active = false: privata). Nessuna migrazione.
// Qui solo calcoli puri: valori di partenza e pulizia dei dati in arrivo dal browser.

export const IMPOSTAZIONI_KEY = 'eliseo:impostazioni';

export type CanaleId = 'widget' | 'whatsapp' | 'messenger' | 'instagram' | 'email' | 'telefono';
export type AccountId = 'google_sheets' | 'google_calendar' | 'outlook' | 'facebook_leads' | 'email';

export type RegolaEscalation = {
  id: string;
  testo: string;
  assegna: string; // 'tutti' oppure id del barbiere
  attiva: boolean;
  predefinita?: boolean;
};

export type FasciaOperatori = { giorni: string[]; da: string; a: string };

export type EliseoImpostazioni = {
  generali: {
    widget: boolean;
    emailObbligatoria: boolean;
    telefonoObbligatorio: boolean;
    messaggiBolla: boolean;
    ritardoRisposta: boolean;
    chiusuraInattivita: boolean;
    minutiInattivita: number;
    chiusuraRisolto: boolean;
    promptImmagini: string;
  };
  lingua: {
    lingua: string;
    paese: string;
    fusoOrario: string;
    linguaNotifiche: string;
    privacyUrl: string;
    consensoMarketing: boolean;
    conservazioneGiorni: number; // 0 = senza limite
  };
  analisi: { recapSettimanale: boolean; tracciaLink: boolean };
  canali: Record<CanaleId, { attivo: boolean; riferimento: string }>;
  account: Record<AccountId, { collegato: boolean; riferimento: string }>;
  escalation: { regole: RegolaEscalation[]; orari: FasciaOperatori[] };
  profilo: {
    nome: string;
    cognome: string;
    telefono: string;
    azienda: string;
    settore: string;
    ruolo: string;
  };
  legale: { ragioneSociale: string; partitaIva: string; sedeLegale: string; terminiUrl: string; privacyUrl: string };
  assistenti: Record<'groq' | 'gemini' | 'claude' | 'grok', { attivo: boolean }>;
};

export const REGOLE_PREDEFINITE: RegolaEscalation[] = [
  { id: 'chiede-operatore', testo: "Quando l'utente vuole parlare con un operatore", assegna: 'tutti', attiva: true, predefinita: true },
  { id: 'senza-informazioni', testo: "Quando l'assistente non ha le informazioni per rispondere in modo soddisfacente all'utente", assegna: 'tutti', attiva: true, predefinita: true },
  { id: 'allegato', testo: "Quando l'utente invia un allegato che l'assistente non può elaborare", assegna: 'tutti', attiva: false, predefinita: true },
];

export const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;

export const LINGUE: Array<[string, string]> = [
  ['it', '🇮🇹 Italiano'], ['en', '🇬🇧 English'], ['es', '🇪🇸 Español'], ['fr', '🇫🇷 Français'], ['de', '🇩🇪 Deutsch'],
  ['pt', '🇵🇹 Português'], ['nl', '🇳🇱 Nederlands'], ['pl', '🇵🇱 Polski'], ['ro', '🇷🇴 Română'], ['sq', '🇦🇱 Shqip'],
  ['uk', '🇺🇦 Українська'], ['ru', '🇷🇺 Русский'], ['el', '🇬🇷 Ελληνικά'], ['tr', '🇹🇷 Türkçe'], ['ar', '🇸🇦 العربية'],
  ['zh', '🇨🇳 中文'], ['ja', '🇯🇵 日本語'], ['ko', '🇰🇷 한국어'], ['hi', '🇮🇳 हिन्दी'], ['bn', '🇧🇩 বাংলা'],
  ['ur', '🇵🇰 اردو'], ['fa', '🇮🇷 فارسی'], ['he', '🇮🇱 עברית'], ['sv', '🇸🇪 Svenska'], ['no', '🇳🇴 Norsk'],
  ['da', '🇩🇰 Dansk'], ['fi', '🇫🇮 Suomi'], ['cs', '🇨🇿 Čeština'], ['sk', '🇸🇰 Slovenčina'], ['hu', '🇭🇺 Magyar'],
  ['hr', '🇭🇷 Hrvatski'], ['sr', '🇷🇸 Srpski'], ['bg', '🇧🇬 Български'], ['tl', '🇵🇭 Filipino'], ['vi', '🇻🇳 Tiếng Việt'],
  ['th', '🇹🇭 ไทย'], ['id', '🇮🇩 Bahasa Indonesia'], ['ms', '🇲🇾 Bahasa Melayu'], ['sw', '🇰🇪 Kiswahili'], ['wo', '🇸🇳 Wolof'],
];

export const CANALI: Array<{ id: CanaleId; nome: string; nota: string }> = [
  { id: 'widget', nome: 'Widget chat web', nota: 'La chat di Eliseo sul sito.' },
  { id: 'whatsapp', nome: 'WhatsApp', nota: 'Numero del negozio collegato con il QR (Conversazioni → ⋮).' },
  { id: 'messenger', nome: 'Messenger', nota: 'Pagina Facebook del negozio.' },
  { id: 'instagram', nome: 'Instagram', nota: 'Account Instagram professionale del negozio.' },
  { id: 'email', nome: 'Email', nota: 'Casella del negozio: leggere e rispondere da Conversazioni.' },
  { id: 'telefono', nome: 'Telefono', nota: 'Agente vocale per le chiamate.' },
];

export const ACCOUNT_COLLEGATI: Array<{ id: AccountId; nome: string; nota: string }> = [
  { id: 'google_sheets', nome: 'Google Sheets', nota: 'Fogli che Eliseo legge per rispondere.' },
  { id: 'google_calendar', nome: 'Google Calendar', nota: 'Copia degli appuntamenti nel calendario Google.' },
  { id: 'outlook', nome: 'Calendario Outlook', nota: 'Copia degli appuntamenti in Outlook.' },
  { id: 'facebook_leads', nome: 'Facebook Leads', nota: 'Contatti dai moduli delle inserzioni Meta.' },
  { id: 'email', nome: 'Email', nota: 'Indirizzo da cui partono campagne e risposte.' },
];

export function defaultImpostazioni(base: { azienda?: string; privacyUrl?: string; terminiUrl?: string } = {}): EliseoImpostazioni {
  return {
    generali: {
      widget: true,
      emailObbligatoria: false,
      telefonoObbligatorio: false,
      messaggiBolla: true,
      ritardoRisposta: false,
      chiusuraInattivita: false,
      minutiInattivita: 60,
      chiusuraRisolto: true,
      promptImmagini: '',
    },
    lingua: {
      lingua: 'it',
      paese: 'IT',
      fusoOrario: 'Europe/Rome',
      linguaNotifiche: 'it',
      privacyUrl: base.privacyUrl || '',
      consensoMarketing: false,
      conservazioneGiorni: 0,
    },
    analisi: { recapSettimanale: false, tracciaLink: false },
    canali: {
      widget: { attivo: true, riferimento: '' },
      whatsapp: { attivo: false, riferimento: '' },
      messenger: { attivo: false, riferimento: '' },
      instagram: { attivo: false, riferimento: '' },
      email: { attivo: false, riferimento: '' },
      telefono: { attivo: false, riferimento: '' },
    },
    account: {
      google_sheets: { collegato: false, riferimento: '' },
      google_calendar: { collegato: false, riferimento: '' },
      outlook: { collegato: false, riferimento: '' },
      facebook_leads: { collegato: false, riferimento: '' },
      email: { collegato: false, riferimento: '' },
    },
    escalation: {
      regole: REGOLE_PREDEFINITE.map((r) => ({ ...r })),
      orari: [{ giorni: [...GIORNI], da: '09:00', a: '20:00' }],
    },
    profilo: { nome: '', cognome: '', telefono: '', azienda: base.azienda || '', settore: 'Barberia', ruolo: '' },
    legale: {
      ragioneSociale: 'M×E Barber Lab',
      partitaIva: '04564070714',
      sedeLegale: '',
      terminiUrl: base.terminiUrl || '',
      privacyUrl: base.privacyUrl || '',
    },
    assistenti: { groq: { attivo: true }, gemini: { attivo: false }, claude: { attivo: false }, grok: { attivo: false } },
  };
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const num = (v: unknown, d: number, min: number, max: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
const ora = (v: unknown, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const url = (v: unknown) => {
  const s = str(v, 500);
  if (!s) return '';
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Unisce i dati salvati (o in arrivo dal browser) con i valori di partenza, scartando tutto ciò che non torna. */
export function cleanImpostazioni(raw: unknown, base?: Parameters<typeof defaultImpostazioni>[0]): EliseoImpostazioni {
  const d = defaultImpostazioni(base);
  const r = obj(raw);
  const g = obj(r.generali);
  const l = obj(r.lingua);
  const a = obj(r.analisi);
  const c = obj(r.canali);
  const ac = obj(r.account);
  const e = obj(r.escalation);
  const p = obj(r.profilo);
  const lg = obj(r.legale);
  const as = obj(r.assistenti);

  const lingueOk = new Set(LINGUE.map(([k]) => k));

  const canali = { ...d.canali };
  for (const k of Object.keys(canali) as CanaleId[]) {
    const v = obj(c[k]);
    canali[k] = { attivo: bool(v.attivo, d.canali[k].attivo), riferimento: str(v.riferimento, 200) };
  }
  const account = { ...d.account };
  for (const k of Object.keys(account) as AccountId[]) {
    const v = obj(ac[k]);
    account[k] = { collegato: bool(v.collegato, false), riferimento: str(v.riferimento, 500) };
  }

  // Regole: le tre predefinite ci sono sempre (si può cambiare solo a chi vanno e se sono attive).
  const inRegole = Array.isArray(e.regole) ? e.regole.map(obj) : [];
  const regole: RegolaEscalation[] = REGOLE_PREDEFINITE.map((pr) => {
    const saved = inRegole.find((x) => x.id === pr.id);
    return saved
      ? { ...pr, assegna: str(saved.assegna, 60) || 'tutti', attiva: bool(saved.attiva, pr.attiva) }
      : { ...pr };
  });
  for (const x of inRegole) {
    const id = str(x.id, 60);
    const testo = str(x.testo, 300);
    if (!id || !testo || REGOLE_PREDEFINITE.some((pr) => pr.id === id) || regole.length >= 30) continue;
    regole.push({ id, testo, assegna: str(x.assegna, 60) || 'tutti', attiva: bool(x.attiva, true) });
  }

  const giorniOk = new Set<string>(GIORNI);
  const orari = (Array.isArray(e.orari) ? e.orari.map(obj) : [])
    .map((f) => ({
      giorni: (Array.isArray(f.giorni) ? f.giorni : []).filter((x): x is string => typeof x === 'string' && giorniOk.has(x)),
      da: ora(f.da, '09:00'),
      a: ora(f.a, '20:00'),
    }))
    .filter((f) => f.giorni.length > 0)
    .slice(0, 14);

  return {
    generali: {
      widget: bool(g.widget, d.generali.widget),
      emailObbligatoria: bool(g.emailObbligatoria, d.generali.emailObbligatoria),
      telefonoObbligatorio: bool(g.telefonoObbligatorio, d.generali.telefonoObbligatorio),
      messaggiBolla: bool(g.messaggiBolla, d.generali.messaggiBolla),
      ritardoRisposta: bool(g.ritardoRisposta, d.generali.ritardoRisposta),
      chiusuraInattivita: bool(g.chiusuraInattivita, d.generali.chiusuraInattivita),
      minutiInattivita: num(g.minutiInattivita, d.generali.minutiInattivita, 5, 10080),
      chiusuraRisolto: bool(g.chiusuraRisolto, d.generali.chiusuraRisolto),
      promptImmagini: str(g.promptImmagini, 2000),
    },
    lingua: {
      lingua: lingueOk.has(str(l.lingua, 5)) ? str(l.lingua, 5) : d.lingua.lingua,
      paese: /^[A-Z]{2}$/.test(str(l.paese, 2)) ? str(l.paese, 2) : d.lingua.paese,
      fusoOrario: /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(str(l.fusoOrario, 60)) ? str(l.fusoOrario, 60) : d.lingua.fusoOrario,
      linguaNotifiche: lingueOk.has(str(l.linguaNotifiche, 5)) ? str(l.linguaNotifiche, 5) : d.lingua.linguaNotifiche,
      privacyUrl: url(l.privacyUrl) || d.lingua.privacyUrl,
      consensoMarketing: bool(l.consensoMarketing, d.lingua.consensoMarketing),
      conservazioneGiorni: [0, 30, 90, 180, 365, 730].includes(num(l.conservazioneGiorni, 0, 0, 730)) ? num(l.conservazioneGiorni, 0, 0, 730) : 0,
    },
    analisi: { recapSettimanale: bool(a.recapSettimanale, false), tracciaLink: bool(a.tracciaLink, false) },
    canali,
    account,
    escalation: { regole, orari: orari.length ? orari : d.escalation.orari },
    profilo: {
      nome: str(p.nome, 80),
      cognome: str(p.cognome, 80),
      telefono: str(p.telefono, 30),
      azienda: str(p.azienda, 120) || d.profilo.azienda,
      settore: str(p.settore, 80) || d.profilo.settore,
      ruolo: str(p.ruolo, 80),
    },
    legale: {
      ragioneSociale: str(lg.ragioneSociale, 120) || d.legale.ragioneSociale,
      partitaIva: /^\d{11}$/.test(str(lg.partitaIva, 11)) ? str(lg.partitaIva, 11) : '',
      sedeLegale: str(lg.sedeLegale, 200),
      terminiUrl: url(lg.terminiUrl) || d.legale.terminiUrl,
      privacyUrl: url(lg.privacyUrl) || d.legale.privacyUrl,
    },
    assistenti: {
      groq: { attivo: bool(obj(as.groq).attivo, true) },
      gemini: { attivo: false }, // spento di proposito (CLAUDE.md, «Chat IA»)
      claude: { attivo: bool(obj(as.claude).attivo, false) },
      grok: { attivo: bool(obj(as.grok).attivo, false) },
    },
  };
}

/** Testo leggibile di una fascia oraria: «lun–dom 09:00–20:00», «lun, mer 10:00–13:00». */
export function fasciaLabel(f: FasciaOperatori): string {
  const idx = f.giorni.map((g) => GIORNI.indexOf(g as (typeof GIORNI)[number])).sort((x, y) => x - y);
  const contigui = idx.length > 2 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const giorni = contigui ? `${GIORNI[idx[0]]}–${GIORNI[idx[idx.length - 1]]}` : idx.map((i) => GIORNI[i]).join(', ');
  return `${giorni} ${f.da}–${f.a}`;
}
