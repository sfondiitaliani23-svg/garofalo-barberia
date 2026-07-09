import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';

export async function getSession() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export async function requireRole(role: UserRole) {
  const profile = await getProfile();
  if (!profile || profile.role !== role) {
    throw new Error('Unauthorized');
  }
  return profile;
}

export async function requireAdmin() {
  return requireRole('admin');
}

export async function requireCustomer() {
  return requireRole('customer');
}