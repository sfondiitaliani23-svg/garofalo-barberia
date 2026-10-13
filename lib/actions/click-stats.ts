'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

/** Clic importanti degli ultimi N giorni: totali per tipo e pagine che li generano. */
export async function getClickStatsAction(days = 30): Promise<{
  totals: Record<string, number>;
  prev: Record<string, number>;
  topPages: Record<string, { path: string; n: number }[]>;
}> {
  await requireAdmin();
  const empty = { totals: {}, prev: {}, topPages: {} };
  const supabase = await createServiceClient();
  if (!supabase) return empty;
  const dayStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const now = Date.now();
  const from = dayStr(new Date(now - (days * 2 - 1) * 86_400_000));
  const mid = dayStr(new Date(now - (days - 1) * 86_400_000));
  const { data } = await supabase.from('site_content').select('key, body').gte('key', `evt:${from}`).lte('key', 'evt:9999').like('key', 'evt:%').limit(200);
  const totals: Record<string, number> = {};
  const prev: Record<string, number> = {};
  const pages: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const day = (row.key as string).slice(4);
    let c: { t?: Record<string, number>; p?: Record<string, number> } = {};
    try {
      c = JSON.parse(row.body ?? '{}');
    } catch {
      continue;
    }
    const current = day >= mid;
    for (const [k, v] of Object.entries(c.t ?? {})) {
      const bucket = current ? totals : prev;
      bucket[k] = (bucket[k] ?? 0) + v;
    }
    if (current) {
      for (const [k, v] of Object.entries(c.p ?? {})) {
        const [name, path] = k.split('|');
        pages[name] ??= {};
        pages[name][path] = (pages[name][path] ?? 0) + v;
      }
    }
  }
  const topPages: Record<string, { path: string; n: number }[]> = {};
  for (const [name, m] of Object.entries(pages)) {
    topPages[name] = Object.entries(m)
      .map(([path, n]) => ({ path, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
  }
  return { totals, prev, topPages };
}
