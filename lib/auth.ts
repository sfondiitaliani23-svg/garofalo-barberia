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

export const TESTER_BLOCK_MESSAGE = 'Modalità tester: puoi guardare tutto e proporre una novità, ma non modificare.';

export const requireRole = cache(async (role: UserRole) => {
  const profile = await getProfile();
  if (role === 'admin' && profile?.role === 'tester') throw new Error(TESTER_BLOCK_MESSAGE);
  if (role === 'admin' && profile && canMutate(profile.role)) return profile;
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
  return {
    profile,
    tester: profile.role === 'tester',
    hideFinance: profile.role !== 'admin',
  };
});
