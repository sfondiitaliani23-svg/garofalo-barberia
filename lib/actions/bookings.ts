'use server';

import { addMinutes, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { resolveBarberForSlot } from '@/lib/actions/availability';
import { sendAdminBookingEmail, getWhatsAppBookingUrl } from '@/lib/utils/notifications';

export interface CreateAppointmentInput {
  serviceId: string;
  barberId: string | null;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

async function resolveFallbackService(serviceId: string) {
  const { FALLBACK_SERVICES } = await import('@/lib/data/fallback');
  return FALLBACK_SERVICES.find((s) => s.id === serviceId) ?? null;
}

async function resolveFallbackBarber(barberId: string | null) {
  const { FALLBACK_BARBERS } = await import('@/lib/data/fallback');
  if (barberId) return FALLBACK_BARBERS.find((b) => b.id === barberId) ?? null;
  return FALLBACK_BARBERS[0] ?? null;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const supabase = await createServiceClient();
  const profile = await getProfile();

  if (!supabase) {
    const service = await resolveFallbackService(input.serviceId);
    if (!service) return { ok: false, error: 'Servizio non trovato' };

    const barber = await resolveFallbackBarber(input.barberId);
    if (!barber) return { ok: false, error: 'Nessun barbiere disponibile' };

    const startsAt = parseISO(`${input.date}T${input.time}:00`);

    return {
      ok: true,
      fallback: true,
      whatsappUrl: getWhatsAppBookingUrl({
        serviceName: service.name,
        priceCents: service.price_cents,
        barberName: barber.name,
        startsAt,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
      }),
    };
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
    whatsappUrl: getWhatsAppBookingUrl(notificationData),
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

  const hoursUntil = (new Date(apt.starts_at).getTime() - Date.now()) / (1000 * 60 * 60);
  if (!isAdmin && hoursUntil < 3) {
    return { ok: false, error: 'Cancellazione possibile solo con almeno 3 ore di anticipo' };
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);

  if (error) return { ok: false, error: 'Errore cancellazione' };

  revalidatePath('/area-cliente/appuntamenti');
  revalidatePath('/admin/prenotazioni');
  return { ok: true };
}

export async function cancelAppointmentAction(formData: FormData) {
  const id = formData.get('id') as string;
  await cancelAppointment(id);
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