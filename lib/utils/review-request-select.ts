/**
 * Chi riceve l'email "com'è andata?": solo clienti con un appuntamento COMPLETATO ieri (o l'altro ieri,
 * se un giorno è saltato), con email, che non hanno detto "non inviarmele più" e che non hanno già
 * ricevuto una richiesta negli ultimi 30 giorni. Funzione pura: niente database, si prova nei test.
 */

export type ReviewRow = {
  customer_name: string | null;
  customer_email: string | null;
  starts_at: string;
  status: string;
  barber: { name: string } | { name: string }[] | null;
};

export type ReviewCandidate = {
  email: string;
  name: string;
  visitDay: string; // YYYY-MM-DD
  barberName: string;
  key: string;
};

const PLACEHOLDER = /^(chiusura|chiuso|pausa|ferie|blocco|bloccato|riservato|occupato|test|prova)\b/i;
export const REVIEW_MIN_DAYS = 1;
export const REVIEW_MAX_DAYS = 2;
export const REVIEW_PAUSE_DAYS = 30;

export function romeDate(d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}

function dayMs(day: string) {
  return Date.parse(`${day}T12:00:00Z`);
}

export function pickReviewCandidates(
  rows: ReviewRow[],
  opts: { now: Date; marks: Set<string>; hashOf: (email: string) => string }
): { candidates: ReviewCandidate[]; skipped: Record<string, number> } {
  const skipped: Record<string, number> = { optout: 0, recent: 0, sent: 0, notInWindow: 0 };
  const today = romeDate(opts.now);
  const latest = new Map<string, { day: string; name: string; barber: string }>();

  for (const r of rows) {
    if (r.status !== 'completed') continue;
    const email = (r.customer_email ?? '').trim().toLowerCase();
    if (!email.includes('@') || PLACEHOLDER.test(r.customer_name ?? '')) continue;
    const day = romeDate(new Date(r.starts_at));
    const daysSince = Math.round((dayMs(today) - dayMs(day)) / 86_400_000);
    if (daysSince < REVIEW_MIN_DAYS || daysSince > REVIEW_MAX_DAYS) {
      skipped.notInWindow++;
      continue;
    }
    const b = Array.isArray(r.barber) ? r.barber[0] : r.barber;
    const prev = latest.get(email);
    if (!prev || day >= prev.day) latest.set(email, { day, name: r.customer_name ?? '', barber: b?.name ?? '' });
  }

  const candidates: ReviewCandidate[] = [];
  for (const [email, v] of latest) {
    const h = opts.hashOf(email);
    if (opts.marks.has(`optout-rec:${h}`)) {
      skipped.optout++;
      continue;
    }
    const key = `reviewreq:${h}:${v.day}`;
    if (opts.marks.has(key)) {
      skipped.sent++;
      continue;
    }
    let recent = false;
    for (let i = 0; i <= REVIEW_PAUSE_DAYS; i++) {
      const d = romeDate(new Date(dayMs(today) - i * 86_400_000));
      if (opts.marks.has(`reviewreq:${h}:${d}`)) {
        recent = true;
        break;
      }
    }
    if (recent) {
      skipped.recent++;
      continue;
    }
    candidates.push({ email, name: (v.name || 'cliente').trim().split(/\s+/)[0], visitDay: v.day, barberName: v.barber, key });
  }
  return { candidates, skipped };
}
