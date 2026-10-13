'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { emailHash, findComebackCandidates, type ComebackStats } from '@/lib/utils/comeback';



/**
 * Numeri dei promemoria "è ora di tornare".
 * Una email conta come "tornato" se lo stesso indirizzo prenota entro 30 giorni dall'invio.
 */
export async function getComebackStatsAction(): Promise<ComebackStats> {
  await requireAdmin();
  const empty: ComebackStats = { sent30: 0, sent90: 0, booked90: 0, rate90: 0, optouts: 0, nextRun: 0, recent: [] };
  const supabase = await createServiceClient();
  if (!supabase) return empty;

  const now = Date.now();
  const since90 = new Date(now - 90 * 86_400_000).toISOString();

  const [{ data: marks }, { count: optouts }, { data: appts }, next] = await Promise.all([
    supabase.from('site_content').select('key, updated_at').like('key', 'comeback:%').gte('updated_at', since90).limit(5000),
    supabase.from('site_content').select('id', { head: true, count: 'exact' }).like('key', 'optout:%'),
    supabase
      .from('appointments')
      .select('customer_email, created_at')
      .gte('created_at', since90)
      .not('customer_email', 'is', null)
      .neq('customer_email', '')
      .limit(10000),
    findComebackCandidates(new Date()).catch(() => ({ candidates: [] as unknown[] })),
  ]);

  const bookingsByHash = new Map<string, number[]>();
  for (const a of appts ?? []) {
    const h = emailHash(a.customer_email as string);
    const list = bookingsByHash.get(h) ?? [];
    list.push(new Date(a.created_at as string).getTime());
    bookingsByHash.set(h, list);
  }

  let sent30 = 0;
  let booked90 = 0;
  const byDay = new Map<string, { sent: number; booked: number }>();
  for (const m of marks ?? []) {
    const at = new Date(m.updated_at as string).getTime();
    const hash = (m.key as string).split(':')[1];
    if (now - at <= 30 * 86_400_000) sent30++;
    const back = (bookingsByHash.get(hash) ?? []).some((t) => t > at && t - at <= 30 * 86_400_000);
    if (back) booked90++;
    const day = new Date(at).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }); // YYYY-MM-DD, ordinabile
    const d = byDay.get(day) ?? { sent: 0, booked: 0 };
    d.sent++;
    if (back) d.booked++;
    byDay.set(day, d);
  }
  const sent90 = marks?.length ?? 0;

  return {
    sent30,
    sent90,
    booked90,
    rate90: sent90 ? Math.round((booked90 / sent90) * 100) : 0,
    optouts: optouts ?? 0,
    nextRun: next.candidates.length,
    recent: [...byDay.entries()]
      .sort((x, y) => y[0].localeCompare(x[0]))
      .slice(0, 10)
      .map(([day, v]) => ({
        day: new Date(`${day}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
        ...v,
      })),
  };
}
