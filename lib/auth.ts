import { cache } from 'react';
import { redirect } from 'next/navigation';
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

export const requireRole = cache(async (role: UserRole) => {
  const profile = await getProfile();
  if (!profile || profile.role !== role) {
    if (role === 'admin') {
      redirect('/admin/login');
    } else {
      redirect('/login');
    }
  }
  return profile;
});

export const requireAdmin = cache(async () => requireRole('admin'));

export const requireCustomer = cache(async () => requireRole('customer'));