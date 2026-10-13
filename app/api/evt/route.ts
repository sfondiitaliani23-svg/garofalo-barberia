import { createServiceClient } from '@/lib/supabase/server';
import { CLICK_EVENTS, type ClickEvent } from '@/lib/utils/click-events';

export const dynamic = 'force-dynamic';

/**
 * Conta un clic importante. Un solo record per giorno (site_content "evt:YYYY-MM-DD", privato).
 * Corpo: { e: "prenota", p: "/servizi" }. Solo nomi e pagine, niente dati personali.
 */
export async function POST(request: Request) {
  let body: { e?: string; p?: string } = {};
  try {
    body = JSON.parse((await request.text()).slice(0, 500));
  } catch {
    return new Response(null, { status: 204 });
  }
  const name = body.e as ClickEvent;
  if (!name || !(name in CLICK_EVENTS)) return new Response(null, { status: 204 });
  const path = String(body.p ?? '/').split('?')[0].slice(0, 80).replace(/[^a-z0-9/_-]/gi, '') || '/';
  if (path.startsWith('/admin')) return new Response(null, { status: 204 });

  const supabase = await createServiceClient();
  if (!supabase) return new Response(null, { status: 204 });
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const key = `evt:${day}`;

  // Due tentativi: se due clic arrivano insieme, il secondo rilegge e somma.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row } = await supabase.from('site_content').select('id, body').eq('key', key).maybeSingle();
    let counts: { t: Record<string, number>; p: Record<string, number> } = { t: {}, p: {} };
    try {
      if (row?.body) counts = JSON.parse(row.body);
    } catch {
      /* riga non valida: si riparte */
    }
    counts.t[name] = (counts.t[name] ?? 0) + 1;
    const pk = `${name}|${path}`;
    if (Object.keys(counts.p).length < 400 || pk in counts.p) counts.p[pk] = (counts.p[pk] ?? 0) + 1;
    const payload = { body: JSON.stringify(counts), updated_at: new Date().toISOString() };
    const { error } = row
      ? await supabase.from('site_content').update(payload).eq('id', row.id)
      : await supabase.from('site_content').insert({ key, title: 'clic', is_active: false, ...payload });
    if (!error) break;
  }
  return new Response(null, { status: 204 });
}
