import { createServiceClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

function resolveFullName(metadata: User['user_metadata']): string | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const candidates = ['full_name', 'name', 'given_name'];
  for (const key of candidates) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/** Garantisce un profilo cliente dopo OAuth (anche se il trigger DB non è aggiornato). */
export async function ensureProfileForAuthUser(user: User) {
  const supabase = await createServiceClient();
  if (!supabase) return;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const metaRole = user.user_metadata?.role;
  const role = existingProfile?.role || (metaRole === 'admin' ? 'admin' : 'customer');

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: resolveFullName(user.user_metadata),
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  await claimGuestAppointments(user);
}

/**
 * Collega al cliente le prenotazioni fatte senza account con la sua stessa email.
 * Solo se l'email dell'account è verificata: altrimenti chiunque potrebbe
 * registrarsi con l'email di un altro e vedere le sue prenotazioni.
 * Se nel profilo manca il telefono, lo prende dalla prenotazione (serve al codice WhatsApp).
 */
export async function claimGuestAppointments(user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return;
  const supabase = await createServiceClient();
  if (!supabase) return;
  try {
    const { data: rows } = await supabase
      .from('appointments')
      .update({ customer_id: user.id })
      .is('customer_id', null)
      .ilike('customer_email', email.replace(/[\\%_]/g, '\\$&'))
      .select('customer_phone');
    if (!rows?.length) return;
    const { data: prof } = await supabase.from('profiles').select('phone').eq('id', user.id).single();
    const phone = rows.find((r) => r.customer_phone?.trim())?.customer_phone?.trim();
    if (phone && !prof?.phone) {
      await supabase.from('profiles').update({ phone }).eq('id', user.id);
    }
  } catch (e) {
    console.error('[claimGuestAppointments]', e);
  }
}
