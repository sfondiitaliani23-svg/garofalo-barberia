import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
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

  return data as Profile | null;
});

export const requireRole = cache(async (role: UserRole) => {
  const profile = await getProfile();
  if (!profile || profile.role !== role) {
    throw new Error('Unauthorized');
  }
  return profile;
});

export const requireAdmin = cache(async () => requireRole('admin'));

export const requireCustomer = cache(async () => requireRole('customer'));