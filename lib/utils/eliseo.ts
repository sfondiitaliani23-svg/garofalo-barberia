/**
 * Eliseo · rubrica clienti costruita dagli appuntamenti (niente tabelle nuove).
 * Ogni persona è un contatto (stesso telefono = stessa persona). La fase si calcola da sola:
 * prenotato, nuovo, abituale, cliente, da richiamare, perso.
 * Funzioni pure: niente database, niente rete. Le usa `lib/actions/eliseo.ts`.
 */

import { normalizeItalianPhone } from '@/lib/utils/phone';

export const FASI = ['prenotato', 'nuovo', 'abituale', 'cliente', 'da_richiamare', 'perso'] as const;
export type Fase = (typeof FASI)[number];

export const FASE_LABEL: Record<Fase, string> = {
  prenotato: 'Prenotato',
  nuovo: 'Nuovo',
  abituale: 'Abituale',
  cliente: 'Cliente',
  da_richiamare: 'Da richiamare',
  perso: 'Perso',
};

export const FASE_HINT: Record<Fase, string> = {
  prenotato: 'Ha già un appuntamento in arrivo',
  nuovo: 'Una sola visita, ancora nei tempi',
  abituale: 'Almeno 3 visite in un anno, nei tempi',
  cliente: 'Torna regolarmente',
  da_richiamare: 'È passato il tempo giusto e non ha prenotato',
  perso: 'Non viene da più di 90 giorni',
};

/** Giorni dopo cui un cliente "dovrebbe" tornare (come le email «è ora di tornare»). */
export const RITORNO_GIORNI = { baby: 42, taglio: 35, other: 21 } as const;
/** Oltre questi giorni senza visite il contatto è "perso". */
export const PERSO_GIORNI = 90;
const ABITUALE_VISITE = 3;

const PLACEHOLDER = /^(chiusura|chiuso|pausa|ferie|blocco|bloccato|riservato|occupato|test|prova)\b/i;

export type ApptRow = {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  starts_at: string;
  status: string;
  barber: { name: string } | { name: string }[] | null;
  service: { name: string; category: string } | { name: string; category: string }[] | null;
};

export type Contatto = {
  key: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_id: string | null;
  visite: number;
  assenze: number;
  ultimaVisita: string | null;
  prossimo: string | null;
  giorniDa: number | null;
  ritornoGiorni: number;
  barbiere: string | null;
  ultimoServizio: string | null;
  fase: Fase;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

function romeDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}
function daysBetween(fromDay: string, toDay: string) {
  return Math.round((Date.parse(`${toDay}T12:00:00Z`) - Date.parse(`${fromDay}T12:00:00Z`)) / 86_400_000);
}

/** Chiave della persona: telefono normalizzato, poi email, poi id dell'account. */
export function contactKey(r: Pick<ApptRow, 'customer_phone' | 'customer_email' | 'customer_id'>): string | null {
  const tel = r.customer_phone ? normalizeItalianPhone(r.customer_phone) : null;
  if (tel) return `tel:${tel}`;
  const email = (r.customer_email ?? '').trim().toLowerCase();
  if (email.includes('@')) return `email:${email}`;
  return r.customer_id ? `id:${r.customer_id}` : null;
}

export function faseDi(c: { visite: number; giorniDa: number | null; ritornoGiorni: number; prossimo: string | null; visiteAnno: number }): Fase {
  if (c.prossimo) return 'prenotato';
  if (c.giorniDa === null) return 'perso';
  if (c.giorniDa > PERSO_GIORNI) return 'perso';
  if (c.giorniDa >= c.ritornoGiorni) return 'da_richiamare';
  if (c.visite <= 1) return 'nuovo';
  if (c.visiteAnno >= ABITUALE_VISITE) return 'abituale';
  return 'cliente';
}

/** Raggruppa gli appuntamenti per persona e calcola visite, ultima visita, barbiere preferito e fase. */
export function buildContatti(rows: ApptRow[], now = new Date()): Contatto[] {
  const today = romeDay(now.toISOString());
  const yearAgo = now.getTime() - 365 * 86_400_000;
  type Acc = {
    rows: ApptRow[];
    name: string;
    phone: string | null;
    email: string | null;
    id: string | null;
    future: string | null;
    noShow: number;
  };
  const map = new Map<string, Acc>();
  const sorted = [...rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const r of sorted) {
    if (PLACEHOLDER.test((r.customer_name ?? '').trim())) continue;
    if (r.status === 'cancelled') continue;
    const key = contactKey(r);
    if (!key) continue;
    const acc = map.get(key) ?? { rows: [], name: '', phone: null, email: null, id: null, future: null, noShow: 0 };
    if (r.customer_name?.trim()) acc.name = r.customer_name.trim();
    if (r.customer_phone?.trim()) acc.phone = r.customer_phone.trim();
    if (r.customer_email?.includes('@')) acc.email = r.customer_email.trim().toLowerCase();
    if (r.customer_id) acc.id = r.customer_id;
    const future = new Date(r.starts_at).getTime() > now.getTime();
    if (r.status === 'no_show') acc.noShow++;
    else if (future && r.status === 'confirmed') acc.future ??= r.starts_at;
    else if (!future) acc.rows.push(r);
    map.set(key, acc);
  }

  const out: Contatto[] = [];
  for (const [key, a] of map) {
    const last = a.rows[a.rows.length - 1] ?? null;
    const lastDay = last ? romeDay(last.starts_at) : null;
    // Visite = giorni diversi (taglio + barba lo stesso giorno = una visita).
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
    if (!last && !a.future) continue; // solo assenze: non è un contatto utile
    out.push({
      key,
      customer_name: a.name || 'Senza nome',
      customer_phone: a.phone,
      customer_email: a.email,
      customer_id: a.id,
      visite: days.size,
      assenze: a.noShow,
      ultimaVisita: last?.starts_at ?? null,
      prossimo: a.future,
      giorniDa,
      ritornoGiorni: ritorno,
      barbiere,
      ultimoServizio: last ? one(last.service)?.name ?? null : null,
      fase: faseDi({ visite: days.size, giorniDa, ritornoGiorni: ritorno, prossimo: a.future, visiteAnno: daysYear.size }),
    });
  }
  return out.sort((x, y) => (y.ultimaVisita ?? y.prossimo ?? '').localeCompare(x.ultimaVisita ?? x.prossimo ?? ''));
}

export type Riepilogo = { totale: number; perFase: Record<Fase, number>; daRichiamare: number; nuovi30: number };

export function riepilogo(list: Contatto[]): Riepilogo {
  const perFase = Object.fromEntries(FASI.map((f) => [f, 0])) as Record<Fase, number>;
  let nuovi30 = 0;
  for (const c of list) {
    perFase[c.fase]++;
    if (c.visite === 1 && c.giorniDa !== null && c.giorniDa <= 30) nuovi30++;
  }
  return { totale: list.length, perFase, daRichiamare: perFase.da_richiamare, nuovi30 };
}

export function filtraContatti(list: Contatto[], f: { q?: string; fase?: Fase | ''; barbiere?: string }): Contatto[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  return list.filter((c) => {
    if (f.fase && c.fase !== f.fase) return false;
    if (f.barbiere && c.barbiere !== f.barbiere) return false;
    if (!q) return true;
    if (c.customer_name.toLowerCase().includes(q)) return true;
    if ((c.customer_email ?? '').includes(q)) return true;
    return qDigits.length >= 3 && (c.customer_phone ?? '').replace(/\D/g, '').includes(qDigits);
  });
}

/** Ordine per "da richiamare": prima chi è in ritardo da meno tempo (più facile che torni). */
export function ordinaDaRichiamare(list: Contatto[]): Contatto[] {
  return list
    .filter((c) => c.fase === 'da_richiamare')
    .sort((a, b) => (a.giorniDa ?? 0) - a.ritornoGiorni - ((b.giorniDa ?? 0) - b.ritornoGiorni));
}

/** Messaggio WhatsApp già scritto: lo manda a mano chi è in negozio (nessun invio automatico). */
export function testoRichiamo(c: Pick<Contatto, 'customer_name' | 'barbiere'>, prenotaUrl: string): string {
  const nome = c.customer_name.trim().split(/\s+/)[0] ?? '';
  const saluto = nome && nome !== 'Senza' ? `Ciao ${nome}` : 'Ciao';
  const con = c.barbiere ? ` con ${c.barbiere.trim().split(/\s+/)[0]}` : '';
  return `${saluto}, è passato un po' dalla tua ultima visita da Barberia Garofalo. Se vuoi ti teniamo un posto${con}: prenoti qui ${prenotaUrl}`;
}

export function whatsappUrl(phone: string | null, text: string): string | null {
  const tel = phone ? normalizeItalianPhone(phone) : null;
  return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(text)}` : null;
}
