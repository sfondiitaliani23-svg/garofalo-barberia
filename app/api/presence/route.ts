import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Presenza degli utenti registrati: "sono sul sito adesso".
 * Salva solo l'ora dell'ultimo segnale (site_content "seen:<id utente>", privato: lo legge solo l'admin).
 * Nessuna pagina, nessuna posizione.
 */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return new Response(null, { status: 204 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 204 });

  const admin = await createServiceClient();
  if (!admin) return new Response(null, { status: 204 });
  const key = `seen:${user.id}`;
  const at = new Date().toISOString();
  const { data: row } = await admin.from('site_content').select('id').eq('key', key).maybeSingle();
  if (row) await admin.from('site_content').update({ body: JSON.stringify({ at }), updated_at: at }).eq('id', row.id);
  else await admin.from('site_content').insert({ key, title: 'presenza', body: JSON.stringify({ at }), is_active: false, updated_at: at });
  return new Response(null, { status: 204 });
}
