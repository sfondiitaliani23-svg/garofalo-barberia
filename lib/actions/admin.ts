'use server';

import { addDays, addMinutes, parseISO, startOfWeek } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notifyAdminNewBooking } from '@/lib/utils/notifications';

export interface AdminAppointmentInput {
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
}

function revalidateAppointmentPaths() {
  revalidatePath('/admin/prenotazioni');
  revalidatePath('/area-cliente/appuntamenti');
  revalidatePath('/area-cliente/storico');
  revalidatePath('/area-cliente/dashboard');
}

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

export async function getAdminAppointments(from: string, to: string, barberId?: string) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name, price_cents, duration_minutes)')
    .gte('starts_at', from)
    .lte('starts_at', to)
    .order('starts_at');

  if (barberId) query = query.eq('barber_id', barberId);

  const { data } = await query;
  return data ?? [];
}

export async function getAdminWeekAppointments(weekStartDate: string, barberId?: string) {
  const weekStart = startOfWeek(parseISO(weekStartDate), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  return getAdminAppointments(weekStart.toISOString(), weekEnd.toISOString(), barberId);
}

export async function createAdminAppointment(input: AdminAppointmentInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*')
    .eq('id', input.serviceId)
    .single();

  if (serviceError || !service) return { ok: false, error: 'Servizio non trovato' };

  const startsAt = parseISO(`${input.date}T${input.time}:00`);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  const { data: barber } = await supabase
    .from('barbers')
    .select('name')
    .eq('id', input.barberId)
    .single();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: null,
      barber_id: input.barberId,
      service_id: input.serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone?.trim() ?? '',
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23P01') {
      return { ok: false, error: 'Questo orario è già occupato. Scegline un altro.' };
    }
    return { ok: false, error: 'Errore durante la prenotazione. Riprova.' };
  }

  await notifyAdminNewBooking({
    serviceName: service.name,
    priceCents: service.price_cents,
    barberName: barber?.name ?? 'Barbiere',
    startsAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone ?? '',
    notes: input.notes,
  });

  revalidateAppointmentPaths();
  return { ok: true, appointmentId: appointment.id };
}

export async function updateAdminAppointment(appointmentId: string, input: AdminAppointmentInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { data: existing } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .single();

  if (!existing) return { ok: false, error: 'Appuntamento non trovato' };
  if (existing.status !== 'confirmed') {
    return { ok: false, error: 'Solo le prenotazioni confermate possono essere modificate' };
  }

  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', input.serviceId)
    .single();

  if (!service) return { ok: false, error: 'Servizio non trovato' };

  const startsAt = parseISO(`${input.date}T${input.time}:00`);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  const { error } = await supabase
    .from('appointments')
    .update({
      barber_id: input.barberId,
      service_id: input.serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone?.trim() ?? '',
      notes: input.notes?.trim() || null,
    })
    .eq('id', appointmentId);

  if (error) {
    if (error.code === '23P01') {
      return { ok: false, error: 'Questo orario è già occupato. Scegline un altro.' };
    }
    return { ok: false, error: 'Errore durante la modifica. Riprova.' };
  }

  revalidateAppointmentPaths();
  return { ok: true };
}

export async function adminCancelAppointment(appointmentId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);

  if (error) return { ok: false, error: 'Errore cancellazione' };

  revalidateAppointmentPaths();
  return { ok: true };
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
  revalidateAppointmentPaths();
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
  await adminCancelAppointment(id);
}

export interface AdminServiceInput {
  id?: string;
  name: string;
  category: string;
  priceEuros: number;
  durationMinutes: number;
  description?: string;
  isActive?: boolean;
}

const SERVICE_CATEGORIES = ['taglio', 'barba', 'styling', 'baby'] as const;

export async function getAdminServices() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('services')
    .select('*')
    .order('sort_order');

  return data ?? [];
}

export async function saveAdminService(input: AdminServiceInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Inserisci il nome del servizio' };
  if (!SERVICE_CATEGORIES.includes(input.category as (typeof SERVICE_CATEGORIES)[number])) {
    return { ok: false, error: 'Categoria non valida' };
  }
  if (input.priceEuros <= 0) return { ok: false, error: 'Inserisci un prezzo valido' };
  if (input.durationMinutes <= 0) return { ok: false, error: 'Inserisci una durata valida' };

  const payload = {
    name,
    category: input.category,
    price_cents: Math.round(input.priceEuros * 100),
    duration_minutes: input.durationMinutes,
    description: input.description?.trim() || null,
    is_active: input.isActive ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from('services').update(payload).eq('id', input.id);
    if (error) return { ok: false, error: 'Errore durante la modifica' };
  } else {
    const { data: last } = await supabase
      .from('services')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from('services').insert({
      ...payload,
      sort_order: (last?.sort_order ?? 0) + 1,
    });
    if (error) return { ok: false, error: 'Errore durante la creazione' };
  }

  revalidatePath('/admin/servizi');
  revalidatePath('/prenota');
  revalidatePath('/servizi');
  return { ok: true };
}

export async function deleteAdminService(serviceId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', serviceId)
    .in('status', ['confirmed']);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId);

    if (error) return { ok: false, error: 'Errore durante la disattivazione' };

    revalidatePath('/admin/servizi');
    revalidatePath('/prenota');
    revalidatePath('/servizi');
    return { ok: true, deactivated: true };
  }

  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) return { ok: false, error: 'Impossibile eliminare il servizio' };

  revalidatePath('/admin/servizi');
  revalidatePath('/prenota');
  revalidatePath('/servizi');
  return { ok: true, deactivated: false };
}