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

  const metaRole = user.user_metadata?.role;
  const role = metaRole === 'admin' ? 'admin' : 'customer';

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
}