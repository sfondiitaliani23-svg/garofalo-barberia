import { cache } from 'react';
import { redirect } from 'next/navigation';
import { canMutate, isStaffRole } from '@/lib/auth/staff';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';

export const getSession = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const user = await getSession();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data) return data as Profile;

  // Fallback con service client se RLS anonima non ha ancora sincronizzato i permessi
  const serviceClient = await createServiceClient();
  if (serviceClient) {
    const { data: serviceProfile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (serviceProfile) return serviceProfile as Profile;
  }

  return null;
});

/**
 * Verifica in due passaggi (09/11/2026): chi ha attivato codice o passkey in Eliseo → Profilo → Sicurezza
 * deve completarla prima di usare l'area riservata. Senza fattori attivi non cambia nulla.
 */
export const enforceStaffMfa = cache(async () => {
  let needsMfa = false;
  try {
    const supabase = await createClient();
    const res = await supabase?.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = !!res?.data && res.data.nextLevel === 'aal2' && res.data.currentLevel !== 'aal2';
  } catch {
    needsMfa = false;
  }
  if (needsMfa) redirect('/admin/login?mfa=1');
});

export const TESTER_BLOCK_MESSAGE = 'Modalità tester: puoi guardare tutto e proporre una novità, ma non modificare.';

export const requireRole = cache(async (role: UserRole) => {
  const profile = await getProfile();
  if (role === 'admin' && profile?.role === 'tester') throw new Error(TESTER_BLOCK_MESSAGE);
  if (role === 'admin' && profile && canMutate(profile.role)) {
    await enforceStaffMfa();
    return profile;
  }
  if (!profile || profile.role !== role) {
    if (role === 'admin') {
      redirect('/admin/login');
    } else {
      redirect('/login');
    }
  }
  return profile;
});

/** Azioni che modificano il salone: admin e dipendente. Il tester viene fermato. */
export const requireAdmin = cache(async () => requireRole('admin'));

/** Solo l'admin: ruoli, incassi, profitti. */
export const requireFullAdmin = cache(async () => {
  const profile = await getProfile();
  if (!profile || profile.role !== 'admin') {
    if (profile?.role === 'tester') throw new Error(TESTER_BLOCK_MESSAGE);
    if (profile?.role === 'dipendente') throw new Error('Solo un admin può farlo.');
    redirect('/admin/login');
  }
  await enforceStaffMfa();
  return profile;
});

export const requireCustomer = cache(async () => requireRole('customer'));

/**
 * Lettura dell'area riservata: admin, dipendente e tester.
 * `tester` nasconde i dati personali. `hideFinance` toglie incassi e profitti a dipendente e tester.
 */
export const requireAdminView = cache(async (): Promise<{ profile: Profile; tester: boolean; hideFinance: boolean }> => {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) redirect('/admin/login');
  await enforceStaffMfa();
  return {
    profile,
    tester: profile.role === 'tester',
    hideFinance: profile.role !== 'admin',
  };
});
