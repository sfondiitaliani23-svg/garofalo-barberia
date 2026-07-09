'use server';

import { addMinutes, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { resolveBarberForSlot } from '@/lib/actions/availability';
import { sendAdminBookingEmail } from '@/lib/utils/notifications';
import { canManageAppointment, manageAppointmentError } from '@/lib/utils/appointments';

export interface CreateAppointmentInput {
  serviceId: string;
  barberId: string | null;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const supabase = await createServiceClient();
  const profile = await getProfile();

  if (!supabase) {
    return { ok: false, error: 'Prenotazione online temporaneamente non disponibile. Riprova tra poco.' };
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*')
    .eq('id', input.serviceId)
    .single();

  if (serviceError || !service) {
    return { ok: false, error: 'Servizio non trovato' };
  }

  let barberId = input.barberId;
  if (!barberId) {
    barberId = await resolveBarberForSlot(input.date, input.time, service.duration_minutes);
    if (!barberId) return { ok: false, error: 'Nessun barbiere disponibile in questo orario' };
  }

  const startsAt = parseISO(`${input.date}T${input.time}:00`);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  const { data: barber } = await supabase
    .from('barbers')
    .select('name')
    .eq('id', barberId)
    .single();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: profile?.id ?? null,
      barber_id: barberId,
      service_id: input.serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23P01') {
      return { ok: false, error: 'Questo orario è appena stato prenotato. Scegline un altro.' };
    }
    return { ok: false, error: 'Errore durante la prenotazione. Riprova.' };
  }

  const notificationData = {
    serviceName: service.name,
    priceCents: service.price_cents,
    barberName: barber?.name ?? 'Barbiere',
    startsAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    notes: input.notes,
  };

  await sendAdminBookingEmail(notificationData);

  revalidatePath('/admin/prenotazioni');
  revalidatePath('/area-cliente/appuntamenti');

  return {
    ok: true,
    appointmentId: appointment.id,
    serviceName: service.name,
    barberName: barber?.name ?? 'Barbiere',
    startsAt: startsAt.toISOString(),
    priceCents: service.price_cents,
  };
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: 'Non autenticato' };

  const { data: apt } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (!apt) return { ok: false, error: 'Appuntamento non trovato' };

  const isOwner = apt.customer_id === profile.id;
  const isAdmin = profile.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, error: 'Non autorizzato' };

  if (!canManageAppointment(apt.starts_at, isAdmin)) {
    return { ok: false, error: manageAppointmentError() };
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);

  if (error) return { ok: false, error: 'Errore cancellazione' };

  revalidatePath('/area-cliente/appuntamenti');
  revalidatePath('/area-cliente/storico');
  revalidatePath('/area-cliente/dashboard');
  revalidatePath('/admin/prenotazioni');
  return { ok: true };
}

export async function rescheduleAppointment(appointmentId: string, date: string, time: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: 'Non autenticato' };

  const { data: apt } = await supabase
    .from('appointments')
    .select('*, service:services(duration_minutes)')
    .eq('id', appointmentId)
    .single();

  if (!apt) return { ok: false, error: 'Appuntamento non trovato' };
  if (apt.status !== 'confirmed') return { ok: false, error: 'Questo appuntamento non può essere modificato' };

  const isOwner = apt.customer_id === profile.id;
  const isAdmin = profile.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, error: 'Non autorizzato' };

  if (!canManageAppointment(apt.starts_at, isAdmin)) {
    return { ok: false, error: manageAppointmentError() };
  }

  const service = apt.service as { duration_minutes: number } | null;
  if (!service) return { ok: false, error: 'Servizio non trovato' };

  const startsAt = parseISO(`${date}T${time}:00`);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  if (startsAt <= new Date()) {
    return { ok: false, error: 'Scegli un orario futuro' };
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', appointmentId);

  if (error) {
    if (error.code === '23P01') {
      return { ok: false, error: 'Questo orario è appena stato prenotato. Scegline un altro.' };
    }
    return { ok: false, error: 'Errore durante la modifica. Riprova.' };
  }

  revalidatePath('/area-cliente/appuntamenti');
  revalidatePath('/area-cliente/storico');
  revalidatePath('/area-cliente/dashboard');
  revalidatePath('/admin/prenotazioni');
  return { ok: true };
}

export async function getAppointmentForCustomer(appointmentId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const profile = await getProfile();
  if (!profile) return null;

  const { data: apt } = await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name, duration_minutes, price_cents)')
    .eq('id', appointmentId)
    .eq('customer_id', profile.id)
    .single();

  return apt;
}

export async function getServices() {
  try {
    const supabase = await createClient();
    if (!supabase) throw new Error('no supabase');
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data && data.length > 0) return data;
  } catch {
    // Supabase non configurato
  }
  const { FALLBACK_SERVICES } = await import('@/lib/data/fallback');
  return FALLBACK_SERVICES;
}

export async function getBarbers() {
  try {
    const supabase = await createClient();
    if (!supabase) throw new Error('no supabase');
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data && data.length > 0) return data;
  } catch {
    // Supabase non configurato
  }
  const { FALLBACK_BARBERS } = await import('@/lib/data/fallback');
  return FALLBACK_BARBERS;
}