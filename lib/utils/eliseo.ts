/**
 * Eliseo CRM · Regole pure, tipi e utility (Barberia Garofalo).
 * Supporta sia la console Keplero completa di Maurizio Barber Shop,
 * sia le funzioni di calcolo e normalizzazione dagli appuntamenti.
 */

import { normalizeItalianPhone } from '@/lib/utils/phone';

// Fasi CRM Keplero & Console
export const FASI = [
  ['nuovo', 'Nuovo'],
  ['contattato', 'Contattato'],
  ['cliente', 'Cliente'],
  ['da_richiamare', 'Da richiamare'],
  ['perso', 'Perso'],
] as const;

export type Fase = (typeof FASI)[number][0];

export const FASE_LABEL: Record<string, string> = {
  prenotato: 'Prenotato',
  nuovo: 'Nuovo',
  contattato: 'Contattato',
  abituale: 'Abituale',
  cliente: 'Cliente',
  da_richiamare: 'Da richiamare',
  perso: 'Perso',
};

export const FASE_HINT: Record<string, string> = {
  prenotato: 'Ha già un appuntamento in arrivo',
  nuovo: 'Una sola visita o contatto nuovo',
  contattato: 'Contattato, in attesa di risposta',
  abituale: 'Almeno 3 visite in un anno, nei tempi',
  cliente: 'Torna regolarmente',
  da_richiamare: 'È passato il tempo giusto e non ha prenotato',
  perso: 'Non viene da più di 90 giorni',
};

export const FONTI = [
  ['sito', 'Sito'],
  ['whatsapp', 'WhatsApp'],
  ['instagram', 'Instagram'],
  ['negozio', 'In negozio'],
  ['passaparola', 'Passaparola'],
  ['treatwell', 'Treatwell'],
  ['altro', 'Altro'],
] as const;

export type Fonte = (typeof FONTI)[number][0];

export const CATEGORIE = [
  ['benvenuto', 'Benvenuto'],
  ['promemoria', 'Promemoria'],
  ['follow_up', 'Dopo il servizio'],
  ['feedback', 'Feedback'],
  ['recensione', 'Recensione'],
  ['ritorno', 'Ritorno del cliente'],
  ['upsell', 'Servizio in più'],
  ['altro', 'Altro'],
] as const;

export type Categoria = (typeof CATEGORIE)[number][0];

export const PAGES = [
  ['/', 'Home'],
  ['/prenota', 'Prenota appuntamento'],
  ['/servizi', 'Servizi'],
  ['/offerte', 'Offerte'],
  ['/journal', 'Journal'],
  ['/contatti', 'Orari e contatti'],
  ['/galleria', 'Galleria'],
] as const;

export const RITORNO_GIORNI = { baby: 42, taglio: 35, other: 21 } as const;
export const PERSO_GIORNI = 90;
const ABITUALE_VISITE = 3;
const PLACEHOLDER = /^(chiusura|chiuso|pausa|ferie|blocco|bloccato|riservato|occupato|test|prova)\b/i;

export type Contatto = {
  id: string;
  nome: string;
  email: string | null;
  telefono: string | null;
  fonte: Fonte;
  fase: Fase;
  barbiere: string | null;
  consenso_marketing: boolean;
  consenso_il: string | null;
  note: string | null;
  etichette: string[];
  user_id?: string | null;
  creato_il: string;
  aggiornato_il: string;
  // Campi compatibilità per appuntamenti
  key?: string;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  visite?: number;
  assenze?: number;
  giorniDa?: number | null;
  ritornoGiorni?: number;
  prossimo?: string | null;
  ultimoServizio?: string | null;
  storico?: Visita[];
};

export type Visita = { starts_at: string; servizio: string | null; barbiere: string | null; stato: string };

export type Modello = {
  id: string;
  nome: string;
  categoria: Categoria;
  testo: string;
  creato_il?: string;
  aggiornato_il?: string;
};

export type Campagna = {
  id: string;
  nome: string;
  titolo: string;
  testo: string;
  url: string;
  fasi: string[];
  destinatari: number;
  inviati: number;
  falliti: number;
  creato_il: string;
};

export type CasellaItem = {
  tipo: 'chat' | 'richiesta';
  rif: string;
  nome: string;
  quando: string;
  nuovo: boolean;
  messaggio?: string;
  contatto?: string;
  motivo?: 'informazioni' | 'formazione' | 'lavoro' | 'regalo' | string;
  stato: 'aperta' | 'in_corso' | 'chiusa';
  assegnato: string | null;
  contatto_id: string | null;
};

export const MOTIVI_MAP: Record<string, string> = {
  informazioni: 'Informazioni',
  formazione: 'Formazione',
  lavoro: 'Lavoro',
  regalo: 'Regalo',
};

export const MODELLI_KEY = 'eliseo:modelli';
export const ETICHETTE_KEY = 'eliseo:etichette';

export const MODELLI_INIZIALI: Modello[] = [
  { id: 'm-promemoria', nome: 'Promemoria appuntamento', categoria: 'promemoria', testo: 'Ciao {nome}, ti ricordiamo il tuo appuntamento da Barberia Garofalo. Ti aspettiamo volentieri 👍' },
  { id: 'm-follow', nome: 'Come ti trovi?', categoria: 'follow_up', testo: 'Ciao {nome}, come ti stai trovando con il taglio o il trattamento fatto da noi a Barberia Garofalo?' },
  { id: 'm-feedback', nome: 'Feedback', categoria: 'feedback', testo: 'Ciao {nome}, come ti sei trovato l’ultima volta con {barbiere}? Per noi il tuo parere è prezioso.' },
  { id: 'm-recensione', nome: 'Recensione', categoria: 'recensione', testo: 'Ciao {nome}, grazie per essere passato da noi! Se ti va, lasciaci una recensione su Google: ci aiuta tanto.' },
  { id: 'm-ritorno', nome: 'È ora di tornare', categoria: 'ritorno', testo: 'Ciao {nome}, è passato un po’ dall’ultima visita da Barberia Garofalo. Vuoi che ti teniamo un posto con {barbiere}?' },
  { id: 'm-upsell', nome: 'Servizio barba', categoria: 'upsell', testo: 'Ciao {nome}, al tuo prossimo appuntamento possiamo aggiungere anche il rituale barba con panno caldo.' },
];

export function cleanContact(raw: Partial<Contatto>): {
  row: Omit<Contatto, 'id' | 'creato_il' | 'aggiornato_il' | 'consenso_il'>;
  errors: Record<string, string>;
  ok: boolean;
} {
  const s = (v: unknown, max: number) =>
    String(v ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);

  const nome = s(raw.nome || raw.customer_name, 120);
  const email = s(raw.email || raw.customer_email, 200).toLowerCase();
  const telefono = s(raw.telefono || raw.customer_phone, 40);
  const errors: Record<string, string> = {};

  if (!nome) errors.nome = 'Scrivi il nome.';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Email non valida.';
  if (telefono && !/^[0-9 +().-]+$/.test(telefono)) errors.telefono = 'Solo numeri, spazi e + ( ) . -';

  const fonte = (FONTI.some(([k]) => k === raw.fonte) ? raw.fonte : 'altro') as Fonte;
  const fase = (FASI.some(([k]) => k === raw.fase) ? raw.fase : 'nuovo') as Fase;
  const note = String(raw.note ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 500);

  const row = {
    nome,
    email: email || null,
    telefono: telefono || null,
    fonte,
    fase,
    barbiere: s(raw.barbiere, 60) || null,
    consenso_marketing: raw.consenso_marketing === true,
    note: note || null,
    etichette: cleanTags(raw.etichette ?? []),
    user_id: raw.user_id || null,
  };

  return { row, errors, ok: Object.keys(errors).length === 0 };
}

export function filterContacts(
  rows: Contatto[],
  { q = '', fase = '', fonte = '', etichetta = '' } = {}
): Contatto[] {
  const k = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (fase && r.fase !== fase) return false;
    if (fonte && r.fonte !== fonte) return false;
    if (etichetta && !(r.etichette || []).includes(etichetta)) return false;
    if (!k) return true;
    return (
      (r.nome && r.nome.toLowerCase().includes(k)) ||
      (r.email && r.email.toLowerCase().includes(k)) ||
      (r.telefono && r.telefono.includes(k))
    );
  });
}

export function summary(rows: Contatto[], now = Date.now()) {
  const week = now - 7 * 864e5;
  return {
    totale: rows.length,
    consenso: rows.filter((r) => r.consenso_marketing).length,
    nuovi: rows.filter((r) => new Date(r.creato_il).getTime() >= week).length,
    richiamare: rows.filter((r) => r.fase === 'da_richiamare').length,
  };
}

export function cleanTags(v: unknown): string[] {
  const list = Array.isArray(v) ? v : String(v ?? '').split(',');
  const out: string[] = [];
  list.forEach((t) => {
    const x = String(t)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .slice(0, 30);
    if (x && !out.includes(x) && out.length < 10) out.push(x);
  });
  return out;
}

export const allTags = (rows: Contatto[]) =>
  [...new Set(rows.flatMap((r) => r.etichette || []))].sort((a, b) => a.localeCompare(b, 'it'));

export function parseCsv(text: string): string[][] {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const first = src.split(/\r?\n/).find((l) => l.trim()) || '';
  const sep = [';', '\t', ',']
    .map((c) => [c, first.split(c).length] as [string, number])
    .sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const COL: Record<string, RegExp> = {
  nome: /^(nome( e cognome)?|name|full ?name|contatto|cliente)$/i,
  cognome: /^(cognome|last ?name|surname)$/i,
  email: /^(e-?mail|indirizzo email)$/i,
  telefono: /^(telefono|tel|cellulare|phone|mobile|numero|whatsapp)$/i,
  note: /^(note|notes)$/i,
};

const telKey = (t: string | null) => {
  const d = String(t || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-10) : '';
};

export function mapImport(
  table: string[][],
  existing: Contatto[] = [],
  { fonte = 'altro', etichetta = '' }: { fonte?: Fonte; etichetta?: string } = {}
) {
  const [head = [], ...lines] = table;
  const idx: Record<string, number> = {};
  head.forEach((hd, i) => {
    const k = Object.keys(COL).find((c) => COL[c].test(String(hd).trim()));
    if (k && idx[k] === undefined) idx[k] = i;
  });

  const res: {
    nuovi: Array<Omit<Contatto, 'id' | 'creato_il' | 'aggiornato_il' | 'consenso_il'>>;
    doppi: number;
    scartati: number;
    colonne: string[];
    errore?: string;
  } = { nuovi: [], doppi: 0, scartati: 0, colonne: Object.keys(idx) };

  if (idx.nome === undefined && idx.email === undefined && idx.telefono === undefined) {
    return {
      ...res,
      scartati: lines.length,
      errore: 'Non trovo le colonne: servono almeno Nome, Email o Telefono nella prima riga.',
    };
  }

  const seenE = new Set(existing.map((r) => (r.email || '').toLowerCase()).filter(Boolean));
  const seenT = new Set(existing.map((r) => telKey(r.telefono)).filter(Boolean));
  const tags = cleanTags(etichetta);

  lines.forEach((l) => {
    const g = (k: string) => (idx[k] === undefined ? '' : String(l[idx[k]] ?? '').trim());
    const telRaw = g('telefono').replace(/[^0-9 +().-]/g, '');
    const nome = [g('nome'), g('cognome')].filter(Boolean).join(' ') || g('email').split('@')[0] || telRaw;

    const { row, ok } = cleanContact({
      nome,
      email: g('email'),
      telefono: telRaw,
      fonte,
      fase: 'nuovo',
      note: g('note'),
    });

    if (!ok || (!row.email && !row.telefono)) {
      res.scartati++;
      return;
    }
    const e = (row.email || '').toLowerCase();
    const t = telKey(row.telefono);
    if ((e && seenE.has(e)) || (t && seenT.has(t))) {
      res.doppi++;
      return;
    }
    if (e) seenE.add(e);
    if (t) seenT.add(t);
    res.nuovi.push({
      ...row,
      consenso_marketing: false,
      ...(tags.length ? { etichette: tags } : {}),
    });
  });

  return res;
}

export function fillTemplate(
  testo: string,
  c: { nome?: string; customer_name?: string | null; barbiere?: string | null } = {},
  prenotaUrl = 'https://barberiagarofalo.it/prenota'
) {
  const nome = String(c.nome || c.customer_name || '').trim().split(/\s+/)[0] || '';
  const n = nome === 'Senza' ? '' : nome;
  const barb = String(c.barbiere || '').trim().split(/\s+/)[0] || 'noi';
  return String(testo || '')
    .replace(/\{nome\}/g, n)
    .replace(/\{barbiere\}/g, barb)
    .replace(/\{prenota\}/g, prenotaUrl)
    .replace(/ +,/g, ',')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function cleanTemplate(raw: { nome?: string; categoria?: string; testo?: string }): {
  row: { nome: string; categoria: Categoria; testo: string };
  ok: boolean;
  errors: Record<string, string>;
} {
  const nome = String(raw.nome ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const testo = String(raw.testo ?? '').trim().slice(0, 1000);
  const categoria = (CATEGORIE.some(([k]) => k === raw.categoria) ? raw.categoria : 'altro') as Categoria;
  const errors: Record<string, string> = {};

  if (!nome) errors.nome = 'Scrivi il nome del modello.';
  if (!testo) errors.testo = 'Scrivi il testo del modello.';

  return {
    row: { nome, categoria, testo },
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function cleanModelli(raw: unknown): { ok: true; modelli: Modello[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'Dati non validi.' };
  if (raw.length > 40) return { ok: false, error: 'Al massimo 40 modelli.' };
  const out: Modello[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const { row, ok } = cleanTemplate(r || {});
    if (!ok) return { ok: false, error: 'Ogni modello ha bisogno di nome e testo.' };
    const id = r?.id && /^[a-z0-9-]{1,40}$/.test(String(r.id)) ? String(r.id) : `m-${i}-${row.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`;
    out.push({ id, ...row });
  }
  return { ok: true, modelli: out };
}

export const isContactKey = (k: unknown): k is string =>
  typeof k === 'string' && k.length <= 140 && /^(tel:\d{6,20}|email:[^\s@]+@[^\s@]+|id:[0-9a-f-]{36})$/.test(k);

export function contactKey(r: { customer_phone?: string | null; customer_email?: string | null; customer_id?: string | null }): string | null {
  const tel = r.customer_phone ? normalizeItalianPhone(r.customer_phone) : null;
  if (tel) return `tel:${tel}`;
  const email = (r.customer_email ?? '').trim().toLowerCase();
  if (email.includes('@')) return `email:${email}`;
  return r.customer_id ? `id:${r.customer_id}` : null;
}

export function faseDi(c: { visite: number; giorniDa: number | null; ritornoGiorni: number; prossimo: string | null; visiteAnno?: number }): Fase {
  if (c.prossimo) return 'prenotato' as Fase;
  if (c.giorniDa === null) return 'perso';
  if (c.giorniDa > PERSO_GIORNI) return 'perso';
  if (c.giorniDa >= c.ritornoGiorni) return 'da_richiamare';
  if (c.visite <= 1) return 'nuovo';
  if ((c.visiteAnno ?? 0) >= ABITUALE_VISITE) return 'abituale' as Fase;
  return 'cliente';
}

function romeDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}
function daysBetween(fromDay: string, toDay: string) {
  return Math.round((Date.parse(`${toDay}T12:00:00Z`) - Date.parse(`${fromDay}T12:00:00Z`)) / 86_400_000);
}

export function buildContatti(rows: Array<{
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  starts_at: string;
  status: string;
  barber?: { name: string } | Array<{ name: string }> | null;
  service?: { name: string; category?: string } | Array<{ name: string; category?: string }> | null;
}>, now = new Date()): Contatto[] {
  const today = romeDay(now.toISOString());
  const yearAgo = now.getTime() - 365 * 86_400_000;
  type Acc = {
    rows: typeof rows;
    name: string;
    phone: string | null;
    email: string | null;
    id: string | null;
    future: string | null;
    noShow: number;
    all: typeof rows;
  };
  const map = new Map<string, Acc>();
  const sorted = [...rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const r of sorted) {
    if (PLACEHOLDER.test((r.customer_name ?? '').trim())) continue;
    if (r.status === 'cancelled') continue;
    const key = contactKey(r);
    if (!key) continue;
    const acc = map.get(key) ?? { rows: [], name: '', phone: null, email: null, id: null, future: null, noShow: 0, all: [] };
    if (r.customer_name?.trim()) acc.name = r.customer_name.trim();
    if (r.customer_phone?.trim()) acc.phone = r.customer_phone.trim();
    if (r.customer_email?.includes('@')) acc.email = r.customer_email.trim().toLowerCase();
    if (r.customer_id) acc.id = r.customer_id;
    const future = new Date(r.starts_at).getTime() > now.getTime();
    acc.all.push(r);
    if (r.status === 'no_show') acc.noShow++;
    else if (future && r.status === 'confirmed') acc.future ??= r.starts_at;
    else if (!future) acc.rows.push(r);
    map.set(key, acc);
  }

  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const out: Contatto[] = [];
  for (const [key, a] of map) {
    const last = a.rows[a.rows.length - 1] ?? null;
    const lastDay = last ? romeDay(last.starts_at) : null;
    const days = new Set(a.rows.map((r) => romeDay(r.starts_at)));
    const daysYear = new Set(a.rows.filter((r) => new Date(r.starts_at).getTime() >= yearAgo).map((r) => romeDay(r.starts_at)));
    const lastVisit = lastDay ? a.rows.filter((r) => romeDay(r.starts_at) === lastDay) : [];
    const cats = new Set(lastVisit.map((r) => one(r.service)?.category ?? ''));
    const ritorno = cats.has('baby') ? RITORNO_GIORNI.baby : cats.has('taglio') ? RITORNO_GIORNI.taglio : RITORNO_GIORNI.other;
    const barberCount = new Map<string, number>();
    for (const r of a.rows) {
      const n = one(r.barber)?.name;
      if (n) barberCount.set(n, (barberCount.get(n) ?? 0) + 1);
    }
    const barbiere = [...barberCount.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
    const giorniDa = lastDay ? daysBetween(lastDay, today) : null;
    if (!last && !a.future) continue;
    out.push({
      id: key,
      key,
      nome: a.name || 'Senza nome',
      customer_name: a.name || 'Senza nome',
      telefono: a.phone,
      customer_phone: a.phone,
      email: a.email,
      customer_email: a.email,
      fonte: 'negozio',
      fase: faseDi({ visite: days.size, giorniDa, ritornoGiorni: ritorno, prossimo: a.future, visiteAnno: daysYear.size }),
      barbiere,
      consenso_marketing: false,
      consenso_il: null,
      note: null,
      etichette: [],
      creato_il: last?.starts_at ?? a.future ?? new Date().toISOString(),
      aggiornato_il: last?.starts_at ?? a.future ?? new Date().toISOString(),
      visite: days.size,
      assenze: a.noShow,
      giorniDa,
      ritornoGiorni: ritorno,
      prossimo: a.future,
      ultimoServizio: last ? one(last.service)?.name ?? null : null,
      storico: a.all
        .slice(-12)
        .reverse()
        .map((r) => ({ starts_at: r.starts_at, servizio: one(r.service)?.name ?? null, barbiere: one(r.barber)?.name ?? null, stato: r.status })),
    });
  }
  return out;
}

export function filtraContatti(list: Contatto[], f: { q?: string; fase?: string; barbiere?: string; etichetta?: string }): Contatto[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  return list.filter((c) => {
    if (f.fase && c.fase !== f.fase) return false;
    if (f.barbiere && c.barbiere !== f.barbiere) return false;
    if (f.etichetta && !(c.etichette ?? []).includes(f.etichetta)) return false;
    if (!q) return true;
    if ((c.nome || c.customer_name || '').toLowerCase().includes(q)) return true;
    if ((c.email || c.customer_email || '').toLowerCase().includes(q)) return true;
    return qDigits.length >= 3 && (c.telefono || c.customer_phone || '').replace(/\D/g, '').includes(qDigits);
  });
}

export function ordinaDaRichiamare(list: Contatto[]): Contatto[] {
  return list
    .filter((c) => c.fase === 'da_richiamare')
    .sort((a, b) => ((a.giorniDa ?? 0) - (a.ritornoGiorni ?? 35)) - ((b.giorniDa ?? 0) - (b.ritornoGiorni ?? 35)));
}

export function riepilogo(list: Contatto[]) {
  const perFase: Record<string, number> = {};
  let nuovi30 = 0;
  for (const c of list) {
    perFase[c.fase] = (perFase[c.fase] ?? 0) + 1;
    if (c.visite === 1 && c.giorniDa !== null && c.giorniDa !== undefined && c.giorniDa <= 30) nuovi30++;
  }
  return { totale: list.length, perFase, daRichiamare: perFase['da_richiamare'] ?? 0, nuovi30 };
}

export function testoRichiamo(c: { customer_name?: string | null; barbiere?: string | null }, prenotaUrl: string): string {
  const nome = (c.customer_name ?? '').trim().split(/\s+/)[0] ?? '';
  const saluto = nome && nome !== 'Senza' ? `Ciao ${nome}` : 'Ciao';
  const con = c.barbiere ? ` con ${c.barbiere.trim().split(/\s+/)[0]}` : '';
  return `${saluto}, è passato un po' dalla tua ultima visita da Barberia Garofalo. Se vuoi ti teniamo un posto${con}: prenoti qui ${prenotaUrl}`;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const tel = phone ? normalizeItalianPhone(phone) : null;
  return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(text)}` : null;
}
