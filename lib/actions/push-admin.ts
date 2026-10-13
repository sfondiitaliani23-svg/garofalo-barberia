'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { pushAudience, sendPushToAll, type BroadcastLog } from '@/lib/utils/push';


export async function getPushOverviewAction(): Promise<{ devices: number; users: number; history: BroadcastLog[] }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  const audience = await pushAudience();
  if (!supabase) return { ...audience, history: [] };
  const { data } = await supabase.from('site_content').select('body').like('key', 'pushlog:%').order('updated_at', { ascending: false }).limit(20);
  const history: BroadcastLog[] = [];
  for (const r of data ?? []) {
    try {
      history.push(JSON.parse(r.body ?? '{}'));
    } catch {
      /* riga non valida */
    }
  }
  return { ...audience, history };
}

/** Invia una notifica a tutti i clienti iscritti. Massimo una ogni 10 minuti, per evitare doppi invii. */
export async function sendBroadcastAction(input: { title: string; body: string; url: string }): Promise<{ ok: true; sent: number; users: number } | { ok: false; error: string }> {
  await requireAdmin();
  const title = input.title.trim().slice(0, 60);
  const body = input.body.trim().slice(0, 160);
  const url = input.url.trim() || '/';
  if (title.length < 3) return { ok: false, error: 'Scrivi un titolo.' };
  if (body.length < 5) return { ok: false, error: 'Scrivi il testo della notifica.' };
  if (!url.startsWith('/')) return { ok: false, error: 'Il link deve essere una pagina del sito (es. /offerte).' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { data: last } = await supabase.from('site_content').select('updated_at').like('key', 'pushlog:%').order('updated_at', { ascending: false }).limit(1);
  const lastAt = last?.[0]?.updated_at ? new Date(last[0].updated_at as string).getTime() : 0;
  if (Date.now() - lastAt < 10 * 60_000) return { ok: false, error: 'Hai appena inviato una notifica. Aspetta qualche minuto prima della prossima.' };

  const res = await sendPushToAll({ title, body, url, tag: `avviso-${Date.now()}` });
  const at = new Date().toISOString();
  const log: BroadcastLog = { at, title, body, url, sent: res.sent, users: res.users };
  await supabase.from('site_content').insert({ key: `pushlog:${Date.now()}`, title: 'avviso inviato', body: JSON.stringify(log), is_active: false, updated_at: at });
  return { ok: true, sent: res.sent, users: res.users };
}
