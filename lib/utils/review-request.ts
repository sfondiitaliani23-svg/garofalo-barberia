import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_CONFIG } from '@/lib/site-config';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { renderReviewRequestEmailHtml, reviewPageUrl } from '@/lib/utils/email-templates';
import { emailHash, stopUrl } from '@/lib/utils/comeback';
import { firstName } from '@/lib/utils/barber-slug';
import { pickReviewCandidates, romeDate, type ReviewRow } from '@/lib/utils/review-request-select';

/**
 * Email "com'è andata?" il giorno dopo la visita, con cinque stelle che portano alla pagina recensioni.
 * È SPENTA finché in Vercel non c'è REVIEW_EMAILS=on. Con ?dry=1 si vede chi la riceverebbe, senza inviare.
 * Una sola richiesta per cliente ogni 30 giorni; chi dice "non inviarmele più" non la riceve più.
 * Nei log mai nomi né email dei clienti.
 */

const DAILY_CAP = 20;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function romeHhmm(d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
}

export function renderReviewRequestEmail(c: { email: string; name: string; barberName: string }) {
  const html = renderReviewRequestEmailHtml({
    customerName: c.name,
    barberName: c.barberName || undefined,
    unsubscribeUrl: stopUrl(c.email, 'rec'),
  });
  const text =
    `Ciao ${c.name}, com'è andata da ${SITE_CONFIG.name}? Ci aiuta molto sapere cosa ne pensi.\n` +
    `Lascia una recensione: ${reviewPageUrl()}\n\n` +
    `Non vuoi più queste richieste? ${stopUrl(c.email, 'rec')}`;
  return { html, text, subject: `${c.name}, com'è andata da ${SITE_CONFIG.name}?` };
}

export async function processReviewRequests(opts: { dry?: boolean; force?: boolean } = {}) {
  const now = new Date();
  if (!opts.dry && process.env.REVIEW_EMAILS !== 'on') return { ok: true as const, skipped: 'disattivato' };
  const hhmm = romeHhmm(now);
  if (!opts.dry && !opts.force && !(hhmm >= '10:30' && hhmm < '11:00')) return { ok: true as const, skipped: 'fuori_orario', at: hhmm };

  const supabase = await createServiceClient();
  if (!supabase) return { ok: false as const, error: 'Database non configurato' };

  const since = new Date(now.getTime() - 4 * 86_400_000).toISOString();
  const { data } = await supabase
    .from('appointments')
    .select('customer_name, customer_email, starts_at, status, barber:barbers(name)')
    .gte('starts_at', since)
    .lte('starts_at', now.toISOString())
    .eq('status', 'completed')
    .not('customer_email', 'is', null)
    .neq('customer_email', '')
    .limit(2000);
  const { data: marks } = await supabase.from('site_content').select('key').or('key.like.optout-rec:%,key.like.reviewreq:%').limit(10000);

  const { candidates, skipped } = pickReviewCandidates((data ?? []) as ReviewRow[], {
    now,
    marks: new Set((marks ?? []).map((m) => m.key as string)),
    hashOf: emailHash,
  });

  if (opts.dry) {
    return { ok: true as const, dry: true, count: candidates.length, skipped, today: romeDate(now), preview: candidates.slice(0, 20).map((c) => ({ visitDay: c.visitDay, barber: c.barberName ? firstName(c.barberName) : '' })) };
  }
  if (!resend) return { ok: false as const, error: 'Email non configurata' };

  let sent = 0;
  let failed = 0;
  for (const c of candidates.slice(0, DAILY_CAP)) {
    // Segno prima di inviare: se il job parte due volte, nessuno riceve due email.
    const { error: markErr } = await supabase
      .from('site_content')
      .insert({ key: c.key, title: 'reviewreq', body: JSON.stringify({ at: now.toISOString() }), is_active: false, updated_at: now.toISOString() });
    if (markErr) continue;
    const { html, text, subject } = renderReviewRequestEmail(c);
    const payload = buildTransactionalEmail({ to: c.email, subject, html, text });
    if (!payload) continue;
    try {
      const { error } = await resend.emails.send({
        ...payload,
        headers: { ...payload.headers, 'List-Unsubscribe': `<${stopUrl(c.email, 'rec')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      if (error) {
        failed++;
        await supabase.from('site_content').delete().eq('key', c.key);
      } else sent++;
    } catch {
      failed++;
      await supabase.from('site_content').delete().eq('key', c.key);
    }
  }
  return { ok: true as const, sent, failed, waiting: Math.max(0, candidates.length - DAILY_CAP), skipped };
}
