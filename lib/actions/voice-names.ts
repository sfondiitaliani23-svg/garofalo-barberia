'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

/** Nomi dei clienti, per proporre "Intendevi: …?" quando la voce sbaglia un nome. Solo admin. */
export async function listCustomerNamesForVoice(): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    if (!supabase) return { ok: false, error: 'Database non disponibile.' };
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('role', 'customer')
      .not('full_name', 'is', null)
      .limit(3000);
    if (error) return { ok: false, error: 'Non riesco a leggere i nomi.' };
    const names = Array.from(new Set((data ?? []).map((r: { full_name: string | null }) => (r.full_name ?? '').trim()).filter((n) => n.length > 2)));
    return { ok: true, names };
  } catch {
    return { ok: false, error: 'Accesso non consentito.' };
  }
}
