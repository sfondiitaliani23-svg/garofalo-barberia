'use server';

import { addMinutes } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProfile, getSession } from '@/lib/auth';
import { ensureProfileForAuthUser } from '@/lib/auth/ensure-profile';
import { getAvailableSlots, resolveBarberForSlot } from '@/lib/actions/availability';
import { notifyAdminBookingCancellation, notifyAdminNewBooking } from '@/lib/utils/notifications';
import { canManageAppointment, manageAppointmentError } from '@/lib/utils/appointments';
import { resolvePromotionForBooking } from '@/lib/actions/promotions';
import { parseBookingDateTime } from '@/lib/utils/booking-datetime';

export interface CreateAppointmentInput {
  serviceId?: string; // Mantieni per retrocompatibilità
  serviceIds?: string[]; // Array di ID dei servizi selezionati
  barberId: string | null;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  promotionCode?: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  try {
    const supabase = await createServiceClient();
    if (!supabase) {
      return { ok: false, error: 'Prenotazione online temporaneamente non disponibile. Riprova tra poco.' };
    }

    const customerName = input.customerName?.trim();
    const customerPhone = input.customerPhone?.trim();
    if (!customerName || !customerPhone) {
      return { ok: false, error: 'Compila nome e telefono per confermare la prenotazione.' };
    }

    const serviceIds = input.serviceIds || (input.serviceId ? [input.serviceId] : []);
    if (serviceIds.length === 0 || !input.date || !input.time) {
      return { ok: false, error: 'Seleziona almeno un servizio, la data e l\'orario prima di confermare.' };
    }

    const sessionUser = await getSession();
    if (sessionUser) {
      await ensureProfileForAuthUser(sessionUser);
    }

    const profile = await getProfile();

    // Recupera tutti i servizi richiesti
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', serviceIds);

    if (servicesError || !services || services.length === 0) {
      return { ok: false, error: 'Servizi non trovati' };
    }

    // Ordina i servizi secondo l'ordine di selezione dell'utente
    const orderedServices = serviceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is typeof services[number] => !!s);

    // Calcola la durata totale combinata di tutti i servizi
    const totalDuration = orderedServices.reduce((acc, s) => acc + s.duration_minutes, 0);

    let barberId = input.barberId;
    if (!barberId) {
      barberId = await resolveBarberForSlot(input.date, input.time, totalDuration);
      if (!barberId) return { ok: false, error: 'Nessun barbiere disponibile in questo orario per tutti i servizi scelti.' };
    } else {
      const { slots, error } = await getAvailableSlots(
        barberId,
        input.date,
        totalDuration
      );

      if (!slots.includes(input.time)) {
        return {
          ok: false,
          error:
            error ??
            'Il barbiere selezionato non è disponibile per l\'intera durata dei servizi scelti.',
        };
      }
    }

    const startsAtBase = parseBookingDateTime(input.date, input.time);
    const { data: barber } = await supabase
      .from('barbers')
      .select('name')
      .eq('id', barberId)
      .single();

    const customerEmail =
      input.customerEmail?.trim() ||
      profile?.email?.trim() ||
      sessionUser?.email?.trim() ||
      null;

    // Applica promozione/sconto sul primo servizio come riferimento
    const promotionResult = await resolvePromotionForBooking(
      serviceIds[0],
      input.promotionCode
    );

    if (!promotionResult.ok) {
      return { ok: false, error: promotionResult.error };
    }

    const { promotion, discountCents } = promotionResult;

    // Genera un ID combo univoco per collegare i diversi record
    const comboId = `combo_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const insertedIds: string[] = [];
    let currentStartsAt = startsAtBase;
    
    // Calcoliamo i prezzi totali
    const totalOriginalPriceCents = orderedServices.reduce((acc, s) => acc + s.price_cents, 0);
    const finalPriceCents = Math.max(0, totalOriginalPriceCents - discountCents);

    for (let idx = 0; idx < orderedServices.length; idx++) {
      const s = orderedServices[idx];
      const currentEndsAt = addMinutes(currentStartsAt, s.duration_minutes);
      
      const comboLabel = `[Combo: ${comboId}]`;
      const rowNotes = input.notes?.trim()
        ? `${comboLabel} ${input.notes.trim()}`
        : comboLabel;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          customer_id: sessionUser?.id ?? profile?.id ?? null,
          barber_id: barberId,
          service_id: s.id,
          starts_at: currentStartsAt.toISOString(),
          ends_at: currentEndsAt.toISOString(),
          status: 'confirmed',
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          notes: rowNotes,
          promotion_id: idx === 0 && promotion && discountCents > 0 ? promotion.id : null,
          discount_cents: idx === 0 ? discountCents : 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('createAppointment combo insert failed at index', idx, error);
        // Pulizia transazionale manuale per evitare record orfani
        if (insertedIds.length > 0) {
          await supabase.from('appointments').delete().in('id', insertedIds);
        }
        if (error.code === '23P01') {
          return { ok: false, error: 'Questo orario è appena stato occupato. Scegline un altro.' };
        }
        return { ok: false, error: 'Errore durante il salvataggio dei servizi. Riprova.' };
      }

      insertedIds.push(appointment.id);
      currentStartsAt = currentEndsAt;
    }

    const combinedServiceNames = orderedServices.map((s) => s.name).join(' + ');

    try {
      await notifyAdminNewBooking({
        serviceName: combinedServiceNames,
        priceCents: finalPriceCents,
        barberName: barber?.name ?? 'Barbiere',
        startsAt: startsAtBase,
        customerName,
        customerPhone,
        notes: input.notes,
      });
    } catch (notifyError) {
      console.error('createAppointment notification failed:', notifyError);
    }

    revalidatePath('/admin/prenotazioni');
    revalidatePath('/area-cliente/appuntamenti');

    return {
      ok: true,
      appointmentId: insertedIds[0],
      serviceName: combinedServiceNames,
      barberName: barber?.name ?? 'Barbiere',
      startsAt: startsAtBase.toISOString(),
      priceCents: finalPriceCents,
      originalPriceCents: totalOriginalPriceCents,
      discountCents,
      promotionTitle: promotion?.title ?? null,
    };
  } catch (error) {
    console.error('createAppointment failed:', error);
    return {
      ok: false,
      error: 'Errore imprevisto durante la conferma. Ricarica la pagina e riprova.',
    };
  }
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: 'Non autenticato' };

  const { data: apt } = await supabase
    .from('appointments')
    .select('*, service:services(name, price_cents), barber:barbers(name)')
    .eq('id', appointmentId)
    .single();

  if (!apt) return { ok: false, error: 'Appuntamento non trovato' };

  const isOwner = apt.customer_id === profile.id;
  const isAdmin = profile.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, error: 'Non autorizzato' };

  if (!canManageAppointment(apt.starts_at, isAdmin)) {
    return { ok: false, error: manageAppointmentError() };
  }

  // Estrae l'ID combo se presente nelle note
  const comboMatch = apt.notes?.match(/\[Combo:\s*(combo_[a-zA-Z0-9_]+)\]/);
  const comboId = comboMatch ? comboMatch[1] : null;

  let cancelQuery = supabase.from('appointments').update({ status: 'cancelled' });
  if (comboId) {
    cancelQuery = cancelQuery.like('notes', `%[Combo: ${comboId}]%`);
  } else {
    cancelQuery = cancelQuery.eq('id', appointmentId);
  }

  const { error } = await cancelQuery;
  if (error) return { ok: false, error: 'Errore cancellazione' };

  if (isOwner) {
    const barber = apt.barber as { name: string } | null;
    let serviceNames = (apt.service as { name: string } | null)?.name ?? 'Servizio';
    let totalPriceCents = Math.max(0, ((apt.service as { price_cents: number } | null)?.price_cents ?? 0) - (apt.discount_cents ?? 0));

    // Se fa parte di una combo, calcola il prezzo totale cumulativo e i nomi dei servizi
    if (comboId) {
      const { data: comboApts } = await supabase
        .from('appointments')
        .select('*, service:services(name, price_cents)')
        .like('notes', `%[Combo: ${comboId}]%`);

      if (comboApts && comboApts.length > 0) {
        serviceNames = comboApts.map((a) => (a.service as { name: string } | null)?.name ?? 'Servizio').join(' + ');
        totalPriceCents = comboApts.reduce((acc, a) => {
          const sprice = (a.service as { price_cents: number } | null)?.price_cents ?? 0;
          const sdiscount = a.discount_cents ?? 0;
          return acc + Math.max(0, sprice - sdiscount);
        }, 0);
      }
    }

    try {
      await notifyAdminBookingCancellation({
        serviceName: serviceNames,
        priceCents: totalPriceCents,
        barberName: barber?.name ?? 'Barbiere',
        startsAt: new Date(apt.starts_at),
        customerName: apt.customer_name,
        customerPhone: apt.customer_phone,
        notes: apt.notes ?? undefined,
      });
    } catch (notifyError) {
      console.error('cancelAppointment notification failed:', notifyError);
    }
  }

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

  const startsAt = parseBookingDateTime(date, time);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  if (startsAt <= new Date()) {
    return { ok: false, error: 'Scegli un orario futuro' };
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reminder_email_sent_at: null,
      reminder_whatsapp_sent_at: null,
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