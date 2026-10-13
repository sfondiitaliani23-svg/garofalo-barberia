import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_CONFIG } from '@/lib/site-config';
import { SITE_URL } from '@/lib/seo';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { escapeHtml, renderEmailTemplate } from '@/lib/utils/email-templates';
import { barberSlug, firstName } from '@/lib/utils/barber-slug';

/**
 * Promemoria "è ora di tornare": un'email gentile qualche settimana dopo l'ultima visita,
 * solo a chi non ha già un appuntamento in futuro. Una sola email per visita.
 * Chi non la vuole più si cancella con un clic (link firmato in fondo all'email).
 */

const PLACEHOLDER = /^(chiusura|chiuso|pausa|ferie|blocco|bloccato|riservato|occupato|test|prova)\b/i;
/** Giorni dopo l'ultima visita, per tipo di servizio. */
const AFTER_DAYS = { baby: 42, taglio: 35, other: 21 } as const;
/** Finestra di invio: se il momento giusto è passato da più di così, non scriviamo (niente email a vecchi clienti). */
const WINDOW_DAYS = 10;
/** Tetto giornaliero, per restare nel piano gratuito dell'email. */
const DAILY_CAP = 40;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET ?? 'garofalo';
}
export function emailHash(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}
function sign(email: string) {
  return createHmac('sha256', secret()).update(`stop:${email.trim().toLowerCase()}`).digest('base64url').slice(0, 32);
}
export function verifyStopToken(email: string, token: string) {
  const a = Buffer.from(sign(email));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function stopUrl(email: string) {
  const e = Buffer.from(email.trim().toLowerCase()).toString('base64url');
  return `${SITE_URL}/api/promemoria/stop?e=${e}&t=${sign(email)}`;
}

function romeParts(d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hhmm: `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}` };
}

type Row = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  starts_at: string;
  status: string;
  barber: { name: string } | { name: string }[] | null;
  service: { name: string; category: string } | { name: string; category: string }[] | null;
};
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export type ComebackCandidate = {
  email: string;
  name: string;
  lastVisit: string; // YYYY-MM-DD
  daysSince: number;
  barberName: string;
  services: string[];
  key: string;
};

export async function findComebackCandidates(now = new Date()): Promise<{ candidates: ComebackCandidate[]; skipped: Record<string, number> }> {
  const supabase = await createServiceClient();
  const skipped: Record<string, number> = { future: 0, optout: 0, sent: 0, notYet: 0, tooOld: 0 };
  if (!supabase) return { candidates: [], skipped };

  const since = new Date(now.getTime() - (AFTER_DAYS.baby + WINDOW_DAYS + 2) * 86_400_000).toISOString();
  const rows: Row[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data } = await supabase
      .from('appointments')
      .select('id, customer_name, customer_email, starts_at, status, barber:barbers(name), service:services(name, category)')
      .gte('starts_at', since)
      .in('status', ['confirmed', 'completed'])
      .not('customer_email', 'is', null)
      .neq('customer_email', '')
      .order('starts_at', { ascending: true })
      .range(from, from + 999);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  // Ultima visita passata e prossimo appuntamento futuro per email
  const byEmail = new Map<string, { past: Row[]; future: boolean; name: string }>();
  for (const r of rows) {
    const email = (r.customer_email ?? '').trim().toLowerCase();
    if (!email.includes('@') || PLACEHOLDER.test(r.customer_name ?? '')) continue;
    const entry = byEmail.get(email) ?? { past: [], future: false, name: r.customer_name ?? '' };
    if (new Date(r.starts_at) > now) entry.future = true;
    else entry.past.push(r);
    if (r.customer_name) entry.name = r.customer_name;
    byEmail.set(email, entry);
  }

  const { data: marks } = await supabase.from('site_content').select('key').or('key.like.optout:%,key.like.comeback:%').limit(10000);
  const markSet = new Set((marks ?? []).map((m) => m.key as string));

  const today = romeParts(now).date;
  const candidates: ComebackCandidate[] = [];
  for (const [email, e] of byEmail) {
    if (e.past.length === 0) continue;
    const h = emailHash(email);
    if (e.future) {
      skipped.future++;
      continue;
    }
    if (markSet.has(`optout:${h}`)) {
      skipped.optout++;
      continue;
    }
    const last = e.past[e.past.length - 1];
    const lastDay = romeParts(new Date(last.starts_at)).date;
    const visit = e.past.filter((r) => romeParts(new Date(r.starts_at)).date === lastDay);
    const cats = new Set(visit.map((r) => one(r.service)?.category ?? ''));
    const after = cats.has('baby') ? AFTER_DAYS.baby : cats.has('taglio') ? AFTER_DAYS.taglio : AFTER_DAYS.other;
    const daysSince = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastDay}T12:00:00Z`)) / 86_400_000);
    if (daysSince < after) {
      skipped.notYet++;
      continue;
    }
    if (daysSince > after + WINDOW_DAYS) {
      skipped.tooOld++;
      continue;
    }
    const key = `comeback:${h}:${lastDay}`;
    if (markSet.has(key)) {
      skipped.sent++;
      continue;
    }
    candidates.push({
      email,
      name: (e.name || 'cliente').split(/\s+/)[0],
      lastVisit: lastDay,
      daysSince,
      barberName: one(last.barber)?.name ?? '',
      services: [...new Set(visit.map((r) => one(r.service)?.name).filter(Boolean) as string[])],
      key,
    });
  }
  return { candidates, skipped };
}

export function renderComebackEmail(c: ComebackCandidate) {
  const weeks = Math.round(c.daysSince / 7);
  const barber = c.barberName ? firstName(c.barberName) : '';
  const params = new URLSearchParams();
  if (c.barberName) params.set('barber', barberSlug(c.barberName));
  if (c.services.length) params.set('service', c.services.join(','));
  params.set('utm_source', 'email');
  params.set('utm_campaign', 'torna');
  const bookUrl = `${SITE_URL}/prenota?${params.toString()}`;
  const html = renderEmailTemplate({
    preheader: `Sono passate ${weeks} settimane: prenota il prossimo appuntamento in pochi secondi.`,
    badge: 'È ora di tornare',
    eyebrow: 'Ti aspettiamo',
    title: `Ciao ${escapeHtml(c.name)},`,
    intro: `sono passate circa <strong style="color:#ffb949;">${weeks} settimane</strong> dal tuo ultimo appuntamento. È il momento giusto per rimettere in ordine taglio e barba.`,
    detailRows: [
      ...(c.services.length ? [{ label: 'Ultima volta', value: escapeHtml(c.services.join(' + ')) }] : []),
      ...(barber ? [{ label: 'Con', value: escapeHtml(c.barberName) }] : []),
      { label: 'Dove siamo', value: escapeHtml(SITE_CONFIG.address) },
    ],
    cta: { href: bookUrl, label: barber ? `Prenota con ${escapeHtml(barber)}` : 'Prenota ora' },
    footerNote:
      `Hai già prenotato o non vuoi più ricevere questi promemoria? ` +
      `<a href="${stopUrl(c.email)}" style="color:#ffb949;">Non inviarmeli più</a>.`,
  });
  const text =
    `Ciao ${c.name}, sono passate circa ${weeks} settimane dal tuo ultimo appuntamento da ${SITE_CONFIG.name}.\n` +
    `Prenota qui: ${bookUrl}\n\nNon vuoi più questi promemoria? ${stopUrl(c.email)}`;
  return { html, text, subject: `${c.name}, è ora di un nuovo taglio?` };
}

/**
 * Invio giornaliero (una volta al giorno, tra le 10:30 e le 10:59 di Roma).
 * dry = true: calcola solo chi riceverebbe l'email, senza inviare né salvare.
 */
export async function processComebackReminders(opts: { dry?: boolean; force?: boolean } = {}) {
  const now = new Date();
  const { hhmm } = romeParts(now);
  if (!opts.dry && !opts.force && !(hhmm >= '10:30' && hhmm < '11:00')) {
    return { ok: true as const, skipped: 'fuori_orario', at: hhmm };
  }
  if (process.env.COMEBACK_EMAILS === 'off') return { ok: true as const, skipped: 'disattivato' };

  const { candidates, skipped } = await findComebackCandidates(now);
  if (opts.dry) {
    return {
      ok: true as const,
      dry: true,
      count: candidates.length,
      skipped,
      preview: candidates.slice(0, 20).map((c) => ({ name: c.name, lastVisit: c.lastVisit, daysSince: c.daysSince, barber: c.barberName, services: c.services })),
    };
  }
  if (!resend) return { ok: false as const, error: 'Email non configurata' };

  const supabase = await createServiceClient();
  if (!supabase) return { ok: false as const, error: 'Database non configurato' };

  let sent = 0;
  let failed = 0;
  const { data: profs } = await supabase.from('profiles').select('id, email').not('email', 'is', null).limit(5000);
  const profileByEmail = new Map((profs ?? []).map((p) => [String(p.email).toLowerCase(), p.id as string]));
  for (const c of candidates.slice(0, DAILY_CAP)) {
    // Segno prima di inviare: se il job parte due volte, nessuno riceve due email.
    const { error: markErr } = await supabase
      .from('site_content')
      .insert({ key: c.key, title: 'comeback', body: JSON.stringify({ at: now.toISOString() }), is_active: false, updated_at: now.toISOString() });
    if (markErr) continue; // già segnato (chiave unica)
    const { html, text, subject } = renderComebackEmail(c);
    const payload = buildTransactionalEmail({ to: c.email, subject, html, text });
    if (!payload) continue;
    try {
      const { error } = await resend.emails.send({
        ...payload,
        headers: { ...payload.headers, 'List-Unsubscribe': `<${stopUrl(c.email)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      if (error) {
        failed++;
        await supabase.from('site_content').delete().eq('key', c.key);
      } else {
        sent++;
        // Anche sul telefono, se il cliente ha l'account e le notifiche attive.
        const uid = profileByEmail.get(c.email);
        if (uid) {
          const { sendPushToUser } = await import('@/lib/utils/push');
          await sendPushToUser(uid, {
            title: `${c.name}, è ora di tornare?`,
            body: c.barberName ? `Prenota il prossimo appuntamento con ${firstName(c.barberName)} in un tocco.` : 'Prenota il prossimo appuntamento in un tocco.',
            url: '/prenota',
            tag: 'torna',
          }).catch(() => 0);
        }
      }
    } catch {
      failed++;
      await supabase.from('site_content').delete().eq('key', c.key);
    }
  }
  return { ok: true as const, sent, failed, waiting: Math.max(0, candidates.length - DAILY_CAP), skipped };
}

export async function optOutEmail(email: string) {
  const supabase = await createServiceClient();
  if (!supabase) return false;
  const key = `optout:${emailHash(email)}`;
  const { data } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();
  if (data) return true;
  const { error } = await supabase.from('site_content').insert({ key, title: 'optout', body: '{}', is_active: false, updated_at: new Date().toISOString() });
  return !error;
}

export type ComebackStats = {
  sent30: number;
  sent90: number;
  booked90: number;
  rate90: number; // percentuale
  optouts: number;
  nextRun: number;
  recent: { day: string; sent: number; booked: number }[];
};
