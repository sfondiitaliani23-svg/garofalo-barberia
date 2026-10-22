'use server';

import { revalidatePath } from 'next/cache';
import { requireFullAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

const ASSIGNABLE: UserRole[] = ['customer', 'dipendente', 'tester', 'admin'];

export async function setUserRole(userId: string, role: UserRole): Promise<{ ok: boolean; error?: string }> {
  const me = await requireFullAdmin();
  if (!userId || !ASSIGNABLE.includes(role)) return { ok: false, error: 'Ruolo non valido.' };
  if (userId === me.id && role !== 'admin') {
    return { ok: false, error: 'Non puoi toglierti il ruolo di admin.' };
  }

  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const { data: target, error: readError } = await supabase.from('profiles').select('id, role').eq('id', userId).maybeSingle();
  if (readError || !target) return { ok: false, error: 'Utente non trovato.' };
  if (target.role === role) return { ok: true };

  if (target.role === 'admin' && role !== 'admin') {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if ((count ?? 0) <= 1) return { ok: false, error: 'Deve restare almeno un admin.' };
  }

  const { error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) {
    const missing = /dipendente|invalid input value for enum/i.test(error.message);
    return {
      ok: false,
      error: missing
        ? 'Il ruolo Dipendente non è ancora attivo sul database. Riprova tra un minuto.'
        : 'Non sono riuscito a salvare il ruolo.',
    };
  }

  revalidatePath('/admin/clienti');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}
