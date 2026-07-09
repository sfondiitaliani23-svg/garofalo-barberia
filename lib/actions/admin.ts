'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function getAdminStats() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { appointmentsToday: 0, revenueToday: 0, revenueWeek: 0, totalCustomers: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: todayCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')
    .gte('starts_at', today.toISOString())
    .lt('starts_at', tomorrow.toISOString());

  const { data: weekAppointments } = await supabase
    .from('appointments')
    .select('*, service:services(price_cents)')
    .in('status', ['confirmed', 'completed'])
    .gte('starts_at', weekAgo.toISOString());

  const { count: customerCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer');

  const weekRevenue = (weekAppointments ?? []).reduce((sum, apt) => {
    const service = apt.service as { price_cents: number } | null;
    return sum + (service?.price_cents ?? 0);
  }, 0);

  const todayAppointments = (weekAppointments ?? []).filter((apt) => {
    const d = new Date(apt.starts_at);
    return d >= today && d < tomorrow;
  });

  const todayRevenue = todayAppointments.reduce((sum, apt) => {
    const service = apt.service as { price_cents: number } | null;
    return sum + (service?.price_cents ?? 0);
  }, 0);

  return {
    appointmentsToday: todayCount ?? 0,
    revenueToday: todayRevenue,
    revenueWeek: weekRevenue,
    totalCustomers: customerCount ?? 0,
  };
}

export async function getAdminAppointments(from: string, to: string) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name, price_cents, duration_minutes)')
    .gte('starts_at', from)
    .lte('starts_at', to)
    .order('starts_at');

  return data ?? [];
}

export async function updateAppointmentStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/prenotazioni');
  return { ok: true };
}

export async function getCustomers() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function completeAppointmentAction(formData: FormData) {
  const id = formData.get('id') as string;
  await updateAppointmentStatus(id, 'completed');
}

export async function cancelAppointmentAction(formData: FormData) {
  const id = formData.get('id') as string;
  await updateAppointmentStatus(id, 'cancelled');
}

export async function upsertService(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const id = formData.get('id') as string | null;
  const payload = {
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    price_cents: Math.round(parseFloat(formData.get('price') as string) * 100),
    duration_minutes: parseInt(formData.get('duration') as string, 10),
    is_active: formData.get('is_active') === 'true',
  };

  if (id) {
    await supabase.from('services').update(payload).eq('id', id);
  } else {
    await supabase.from('services').insert(payload);
  }

  revalidatePath('/admin/servizi');
  return { ok: true };
}