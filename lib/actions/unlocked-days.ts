'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { UNLOCKED_DAYS_KEY, cleanUnlockedDays } from '@/lib/utils/unlocked-days';

// Giorni sbloccati (13/11/2026): li gestisce l'admin dalla pagina Team.
// Salvati in site_content con is_active = false. Nessuna migrazione.
export async function saveUnlockedDaysAction(
  days: string[]
): Promise<{ ok: true; days: string[] } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const clean = cleanUnlockedDays(days);
  const body = JSON.stringify(clean);
  const now = new Date().toISOString();
  const { data: row } = await supabase.from('site_content').select('id').eq('key', UNLOCKED_DAYS_KEY).maybeSingle();
  const res = row
    ? await supabase.from('site_content').update({ body, is_active: false, updated_at: now }).eq('id', row.id)
    : await supabase
        .from('site_content')
        .insert({ key: UNLOCKED_DAYS_KEY, title: 'giorni sbloccati per le prenotazioni', body, is_active: false, updated_at: now });
  if (res.error) return { ok: false, error: 'Salvataggio non riuscito. Riprova.' };
  return { ok: true, days: clean };
}
