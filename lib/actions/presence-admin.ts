'use server';

import { requireAdminView } from '@/lib/auth';
import { maskForTester } from '@/lib/utils/tester-mask';
import { createServiceClient } from '@/lib/supabase/server';
import { ONLINE_WINDOW_MS, type PresenceInfo, type PresenceSnapshot } from '@/lib/utils/presence';

/** Chi è sul sito adesso e l'ultimo accesso di ogni utente registrato. Solo admin. */
export async function getPresenceAction(): Promise<PresenceSnapshot> {
  const { tester } = await requireAdminView();
  const now = Date.now();
  const empty: PresenceSnapshot = { byUser: {}, team: [], onlineCustomers: [], generatedAt: new Date(now).toISOString() };
  const supabase = await createServiceClient();
  if (!supabase) return empty;

  const [{ data: seenRows }, { data: profiles }, users] = await Promise.all([
    supabase.from('site_content').select('key, updated_at').like('key', 'seen:%').limit(5000),
    supabase.from('profiles').select('id, full_name, email, role').limit(5000),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: { users: [] } })),
  ]);

  const seen = new Map<string, string>();
  for (const r of seenRows ?? []) seen.set((r.key as string).slice(5), r.updated_at as string);
  const signIn = new Map<string, string>();
  for (const u of (users as { data: { users: { id: string; last_sign_in_at?: string | null }[] } }).data?.users ?? []) {
    if (u.last_sign_in_at) signIn.set(u.id, u.last_sign_in_at);
  }

  const byUser: Record<string, PresenceInfo> = {};
  const team: PresenceSnapshot['team'] = [];
  const onlineCustomers: PresenceSnapshot['onlineCustomers'] = [];
  for (const p of profiles ?? []) {
    const lastSeen = seen.get(p.id) ?? null;
    const info: PresenceInfo = {
      lastSeen,
      lastSignIn: signIn.get(p.id) ?? null,
      online: !!lastSeen && now - new Date(lastSeen).getTime() <= ONLINE_WINDOW_MS,
    };
    byUser[p.id] = info;
    const name = (p.full_name as string | null) || (p.email as string | null) || 'Utente';
    if (p.role === 'admin' || p.role === 'dipendente' || p.role === 'tester') team.push({ id: p.id, name: tester && name === p.email ? 'Staff' : name, email: tester ? null : (p.email as string | null), presence: info });
    else if (info.online) onlineCustomers.push({ id: p.id, name: tester ? 'Cliente' : name });
  }
  return { byUser, team, onlineCustomers, generatedAt: new Date(now).toISOString() };
}
