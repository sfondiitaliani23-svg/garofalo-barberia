'use server';

import { addDays, addMinutes, parseISO, startOfWeek } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notifyAdminNewBooking } from '@/lib/utils/notifications';
import { parseBookingDateTime, getShopDateString } from '@/lib/utils/booking-datetime';
import {
  type AdminDayScheduleInput,
  defaultPeriodsForDay,
  scheduleToAvailabilityRows,
} from '@/lib/utils/barber-schedule';
import {
  detectScheduleChanges,
  notifyCustomersBarberScheduleChanges,
  notifyCustomersSalonClosure,
} from '@/lib/utils/schedule-notifications';

export interface AdminAppointmentInput {
  serviceId?: string; // Retrocompatibilità
  serviceIds?: string[]; // Nuovi ID per le combo
  barberId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  customDurationMinutes?: number;
  recurrenceWeeks?: number;
}

export interface CreateAdminAppointmentResult {
  ok: boolean;
  error?: string;
  appointmentId?: string;
  isRecurring?: boolean;
  successCount?: number;
  failedCount?: number;
  successes?: string[];
  failures?: { date: string; error: string }[];
}

function revalidateAppointmentPaths() {
  revalidatePath('/admin/prenotazioni');
  revalidatePath('/admin/prenotazioni/storico');
  revalidatePath('/area-cliente/appuntamenti');
  revalidatePath('/area-cliente/storico');
  revalidatePath('/area-cliente/dashboard');
}

export async function getAdminStats() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { appointmentsToday: 0, revenueToday: 0, revenueWeek: 0, totalCustomers: 0, appointmentsHistory: [], revenueHistory: [], customersHistory: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 59);

  const [
    { count: todayCount },
    { data: todayAppointments },
    { data: weekAppointments },
    { count: customerCount },
    { data: recentAppointments },
    { data: recentCustomers },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('starts_at', today.toISOString())
      .lt('starts_at', tomorrow.toISOString()),
    supabase
      .from('appointments')
      .select('discount_cents, service:services(price_cents)')
      .in('status', ['confirmed', 'completed'])
      .gte('starts_at', today.toISOString())
      .lt('starts_at', tomorrow.toISOString()),
    supabase
      .from('appointments')
      .select('discount_cents, service:services(price_cents)')
      .in('status', ['confirmed', 'completed'])
      .gte('starts_at', weekAgo.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('appointments')
      .select('starts_at, discount_cents, service:services(price_cents)')
      .in('status', ['confirmed', 'completed'])
      .gte('starts_at', sixtyDaysAgo.toISOString())
      .lt('starts_at', tomorrow.toISOString()),
    supabase
      .from('profiles')
      .select('created_at')
      .eq('role', 'customer')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', tomorrow.toISOString()),
  ]);

  const sumRevenue = (rows: { discount_cents: number | null; service: { price_cents: number } | { price_cents: number }[] | null }[]) =>
    rows.reduce((sum, apt) => {
      const service = Array.isArray(apt.service) ? apt.service[0] : apt.service;
      const gross = service?.price_cents ?? 0;
      const net = Math.max(0, gross - (apt.discount_cents ?? 0));
      return sum + net;
    }, 0);

  const todayRevenue = sumRevenue(todayAppointments ?? []);
  const weekRevenue = sumRevenue(weekAppointments ?? []);

  // Elaborazione dei dati storici reali per gli ultimi 6 giorni
  const getRomeDateKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);
    const getV = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
    return `${getV('year')}-${getV('month').padStart(2, '0')}-${getV('day').padStart(2, '0')}`;
  };

  const dateKeys: string[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateKeys.push(getRomeDateKey(d));
  }

  const appointmentsHistory = dateKeys.map((key) => {
    const dayApts = recentAppointments?.filter((apt) => getRomeDateKey(new Date(apt.starts_at)) === key) ?? [];
    return dayApts.length;
  });

  const revenueHistory = dateKeys.map((key) => {
    const dayApts = recentAppointments?.filter((apt) => getRomeDateKey(new Date(apt.starts_at)) === key) ?? [];
    return sumRevenue(dayApts);
  });

  const customersHistory = dateKeys.map((key) => {
    const dayCustomers = recentCustomers?.filter((c) => getRomeDateKey(new Date(c.created_at)) === key) ?? [];
    return dayCustomers.length;
  });

  return {
    appointmentsToday: todayCount ?? 0,
    revenueToday: todayRevenue,
    revenueWeek: weekRevenue,
    totalCustomers: customerCount ?? 0,
    appointmentsHistory,
    revenueHistory,
    customersHistory,
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

  if (barberId && barberId !== 'all') query = query.eq('barber_id', barberId);

  const { data } = await query;
  return data ?? [];
}

export async function getAdminWeekAppointments(weekStartDate: string, barberId?: string) {
  const weekStart = startOfWeek(parseISO(weekStartDate), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  return getAdminAppointments(weekStart.toISOString(), weekEnd.toISOString(), barberId);
}

export async function getUpcomingAdminAppointments(limit = 200) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name, price_cents, duration_minutes)')
    .eq('status', 'confirmed')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getYesterdayAdminAppointments(limit = 200) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data } = await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name, price_cents, duration_minutes)')
    .in('status', ['confirmed', 'completed'])
    .gte('starts_at', yesterday.toISOString())
    .lt('starts_at', today.toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function createAdminAppointment(input: AdminAppointmentInput): Promise<CreateAdminAppointmentResult> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const serviceIds = input.serviceIds || (input.serviceId ? [input.serviceId] : []);
  if (serviceIds.length === 0) return { ok: false, error: 'Seleziona almeno un servizio.' };

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds);

  if (servicesError || !services || services.length === 0) return { ok: false, error: 'Servizi non trovati' };

  // Ordina i servizi secondo l'input per consistenza
  const orderedServices = serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is typeof services[number] => !!s);

  const { data: barber } = await supabase
    .from('barbers')
    .select('name')
    .eq('id', input.barberId)
    .single();

  const totalOriginalPriceCents = orderedServices.reduce((acc, s) => acc + s.price_cents, 0);
  const combinedServiceNames = orderedServices.map((s) => s.name).join(' + ');

  const recurrenceWeeks = input.recurrenceWeeks && input.recurrenceWeeks > 1 ? input.recurrenceWeeks : 1;
  const successes: string[] = [];
  const failures: { date: string; error: string }[] = [];

  let overallSuccess = false;
  let firstError = '';

  for (let week = 0; week < recurrenceWeeks; week++) {
    const baseDate = parseISO(input.date);
    const currentWeekDate = addDays(baseDate, week * 7);
    const dateStr = getShopDateString(currentWeekDate);

    const startsAtBase = parseBookingDateTime(dateStr, input.time);
    const comboId = `combo_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const insertedIds: string[] = [];
    let currentStartsAt = startsAtBase;
    let hasError = false;
    let errorMsg = '';

    for (let idx = 0; idx < orderedServices.length; idx++) {
      const s = orderedServices[idx];
      const duration = idx === 0 && input.customDurationMinutes && input.customDurationMinutes > 0
        ? input.customDurationMinutes
        : s.duration_minutes;
      const currentEndsAt = addMinutes(currentStartsAt, duration);

      const comboLabel = `[Combo: ${comboId}]`;
      const rowNotes = input.notes?.trim()
        ? `${comboLabel} ${input.notes.trim()}`
        : comboLabel;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          customer_id: null,
          barber_id: input.barberId,
          service_id: s.id,
          starts_at: currentStartsAt.toISOString(),
          ends_at: currentEndsAt.toISOString(),
          status: 'confirmed',
          customer_name: input.customerName.trim(),
          customer_phone: input.customerPhone?.trim() ?? '',
          notes: rowNotes,
        })
        .select('id')
        .single();

      if (error) {
        hasError = true;
        errorMsg = error.code === '23P01'
          ? 'Questo orario è già occupato.'
          : 'Errore durante la prenotazione del servizio ' + s.name;
        console.error('createAdminAppointment loop insert failed', dateStr, error);
        break;
      }

      insertedIds.push(appointment.id);
      currentStartsAt = currentEndsAt;
    }

    if (hasError) {
      if (insertedIds.length > 0) {
        await supabase.from('appointments').delete().in('id', insertedIds);
      }
      failures.push({ date: dateStr, error: errorMsg });
      if (!firstError) firstError = errorMsg;
    } else {
      successes.push(dateStr);
      overallSuccess = true;

      try {
        await notifyAdminNewBooking({
          serviceName: combinedServiceNames,
          priceCents: totalOriginalPriceCents,
          barberName: barber?.name ?? 'Barbiere',
          startsAt: startsAtBase,
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? '',
          notes: input.notes,
        });
      } catch (notifyError) {
        console.error('createAdminAppointment notification failed for week', week, notifyError);
      }
    }
  }

  revalidateAppointmentPaths();

  if (recurrenceWeeks > 1) {
    if (!overallSuccess) {
      return { ok: false, error: `Impossibile creare le prenotazioni. Errore: ${firstError}` };
    }
    return {
      ok: true,
      isRecurring: true,
      successCount: successes.length,
      failedCount: failures.length,
      successes,
      failures,
    };
  } else {
    if (!overallSuccess) {
      return { ok: false, error: firstError || 'Errore durante la prenotazione.' };
    }
    return { ok: true, appointmentId: successes[0] };
  }
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

  const startsAt = parseBookingDateTime(input.date, input.time);
  const duration = input.customDurationMinutes && input.customDurationMinutes > 0
    ? input.customDurationMinutes
    : service.duration_minutes;
  const endsAt = addMinutes(startsAt, duration);

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
      reminder_email_sent_at: null,
      reminder_whatsapp_sent_at: null,
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
    .select('id, role, full_name, phone, email, hair_preferences, personal_notes, avatar_url, created_at, updated_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(1000);

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

function revalidateTeamPaths() {
  revalidatePath('/admin/staff');
  revalidatePath('/admin/prenotazioni');
  revalidatePath('/prenota');
  revalidatePath('/chi-siamo');
}

export interface AdminBarberInput {
  id?: string;
  name: string;
  role: string;
  imageUrl?: string;
  bio?: string;
  isActive?: boolean;
}

export interface AdminTimeOffInput {
  barberId: string | null;
  startDate: string;
  endDate: string;
  reason?: string;
}

const DEFAULT_WEEKLY_SCHEDULE: AdminDayScheduleInput[] = [2, 3, 4, 5, 6].map((dayOfWeek) =>
  defaultPeriodsForDay(dayOfWeek)
);

export async function getAdminTeamData() {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) {
    return { barbers: [], availability: [], timeOff: [] };
  }

  const historyCutoff = addDays(new Date(), -90).toISOString();

  const [barbersRes, availabilityRes, timeOffRes] = await Promise.all([
    supabase.from('barbers').select('*').order('sort_order'),
    supabase.from('barber_availability').select('*'),
    supabase
      .from('barber_time_off')
      .select('*, barber:barbers(name)')
      .gte('end_at', historyCutoff)
      .order('start_at', { ascending: false })
      .limit(100),
  ]);

  return {
    barbers: barbersRes.data ?? [],
    availability: availabilityRes.data ?? [],
    timeOff: timeOffRes.data ?? [],
  };
}

export async function saveAdminBarber(input: AdminBarberInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const name = input.name.trim();
  const role = input.role.trim();
  if (!name) return { ok: false, error: 'Inserisci il nome del barbiere' };
  if (!role) return { ok: false, error: 'Inserisci il ruolo' };

  const payload = {
    name,
    role,
    image_url: input.imageUrl?.trim() || null,
    bio: input.bio?.trim() || null,
    is_active: input.isActive ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from('barbers').update(payload).eq('id', input.id);
    if (error) return { ok: false, error: 'Errore durante la modifica' };
    revalidateTeamPaths();
    return { ok: true, barberId: input.id };
  }

  const { data: last } = await supabase
    .from('barbers')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from('barbers')
    .insert({ ...payload, sort_order: (last?.sort_order ?? 0) + 1 })
    .select('id')
    .single();

  if (error || !created) return { ok: false, error: 'Errore durante la creazione' };

  const scheduleRows = scheduleToAvailabilityRows(created.id, DEFAULT_WEEKLY_SCHEDULE);
  await supabase.from('barber_availability').insert(scheduleRows);

  revalidateTeamPaths();
  return { ok: true, barberId: created.id };
}

export async function deleteAdminBarber(barberId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barberId)
    .eq('status', 'confirmed');

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from('barbers').update({ is_active: false }).eq('id', barberId);
    if (error) return { ok: false, error: 'Errore durante la disattivazione' };
    revalidateTeamPaths();
    return { ok: true, deactivated: true };
  }

  const { error } = await supabase.from('barbers').delete().eq('id', barberId);
  if (error) return { ok: false, error: 'Impossibile eliminare il barbiere' };

  revalidateTeamPaths();
  return { ok: true, deactivated: false };
}

export async function saveAdminBarberSchedule(barberId: string, days: AdminDayScheduleInput[]) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const [{ data: oldAvailability }, { data: barber }] = await Promise.all([
    supabase
      .from('barber_availability')
      .select('day_of_week, period, is_available, start_time, end_time')
      .eq('barber_id', barberId),
    supabase.from('barbers').select('name').eq('id', barberId).single(),
  ]);

  const scheduleChanges = detectScheduleChanges(oldAvailability ?? [], days);

  const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  for (const day of days) {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 1) continue;

    for (const period of ['morning', 'afternoon'] as const) {
      const slot = day[period];
      const startTime = slot.startTime?.trim().slice(0, 5) || '';
      const endTime = slot.endTime?.trim().slice(0, 5) || '';

      if (slot.enabled) {
        if (!startTime || !endTime) {
          const dayName = DAY_NAMES[day.dayOfWeek] || `giorno ${day.dayOfWeek}`;
          const periodName = period === 'morning' ? 'mattutino' : 'pomeridiano';
          return {
            ok: false,
            error: `Inserisci sia l'orario di apertura che quello di chiusura per il periodo ${periodName} di ${dayName}`,
          };
        }
        if (startTime >= endTime) {
          const dayName = DAY_NAMES[day.dayOfWeek] || `giorno ${day.dayOfWeek}`;
          const periodName = period === 'morning' ? 'mattutino' : 'pomeridiano';
          return {
            ok: false,
            error: `L'orario di apertura deve essere precedente a quello di chiusura per il periodo ${periodName} di ${dayName}`,
          };
        }
      }
    }
  }

  const scheduleRows = scheduleToAvailabilityRows(barberId, days);
  const { error } = await supabase.from('barber_availability').upsert(scheduleRows, {
    onConflict: 'barber_id,day_of_week,period',
  });

  if (error) return { ok: false, error: 'Errore durante il salvataggio orari' };

  let emailsSent = 0;
  if (scheduleChanges.length > 0) {
    const notifyResult = await notifyCustomersBarberScheduleChanges(
      supabase,
      barber?.name ?? 'Barbiere',
      scheduleChanges
    );
    emailsSent = notifyResult.sent;
  }

  revalidateTeamPaths();
  return { ok: true, emailsSent, scheduleChanges: scheduleChanges.length };
}

export async function saveAdminTimeOff(input: AdminTimeOffInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  if (!input.startDate || !input.endDate) {
    return { ok: false, error: 'Inserisci data inizio e fine' };
  }

  const startsAt = parseISO(`${input.startDate}T00:00:00`);
  const endsAt = parseISO(`${input.endDate}T23:59:59`);

  if (endsAt < startsAt) {
    return { ok: false, error: 'La data di fine deve essere dopo l\'inizio' };
  }

  const { error } = await supabase.from('barber_time_off').insert({
    barber_id: input.barberId || null,
    start_at: startsAt.toISOString(),
    end_at: endsAt.toISOString(),
    reason: input.reason?.trim() || null,
  });

  if (error) return { ok: false, error: 'Errore durante il salvataggio ferie' };

  let emailsSent = 0;
  if (!input.barberId) {
    const notifyResult = await notifyCustomersSalonClosure(
      supabase,
      input.startDate,
      input.endDate,
      input.reason
    );
    emailsSent = notifyResult.sent;
  }

  revalidateTeamPaths();
  return { ok: true, emailsSent };
}

export async function deleteAdminTimeOff(timeOffId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { error } = await supabase.from('barber_time_off').delete().eq('id', timeOffId);
  if (error) return { ok: false, error: 'Errore durante l\'eliminazione' };

  revalidateTeamPaths();
  return { ok: true };
}

export interface AdminPromotionInput {
  id?: string;
  title: string;
  description?: string;
  code?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  serviceId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

function revalidatePromotionPaths() {
  revalidatePath('/admin/promozioni');
  revalidatePath('/servizi');
  revalidatePath('/prenota');
}

export async function getAdminPromotions() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { promotions: [], services: [] };

  const [{ data: promotions }, { data: services }] = await Promise.all([
    supabase
      .from('promotions')
      .select('*, service:services(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('services').select('id, name').eq('is_active', true).order('sort_order'),
  ]);

  return { promotions: promotions ?? [], services: services ?? [] };
}

export async function saveAdminPromotion(input: AdminPromotionInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Inserisci il titolo della promozione' };

  if (input.discountType === 'percent') {
    if (input.discountValue < 1 || input.discountValue > 100) {
      return { ok: false, error: 'La percentuale deve essere tra 1 e 100' };
    }
  } else if (input.discountValue <= 0) {
    return { ok: false, error: 'Inserisci un importo sconto valido' };
  }

  const code = input.code?.trim().toUpperCase() || null;
  if (code && !/^[A-Z0-9_-]{3,20}$/.test(code)) {
    return { ok: false, error: 'Il codice deve avere 3-20 caratteri (lettere, numeri, - o _)' };
  }

  if (input.startsAt && input.endsAt && new Date(input.startsAt) >= new Date(input.endsAt)) {
    return { ok: false, error: 'La data di fine deve essere successiva all\'inizio' };
  }

  const payload = {
    title,
    description: input.description?.trim() || null,
    code,
    discount_type: input.discountType,
    discount_value: input.discountType === 'fixed'
      ? Math.round(input.discountValue)
      : Math.round(input.discountValue),
    service_id: input.serviceId || null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    is_active: input.isActive ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from('promotions').update(payload).eq('id', input.id);
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Codice promozionale già in uso' };
      return { ok: false, error: 'Errore durante la modifica' };
    }
  } else {
    const { error } = await supabase.from('promotions').insert(payload);
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Codice promozionale già in uso' };
      return { ok: false, error: 'Errore durante la creazione' };
    }
  }

  revalidatePromotionPaths();
  return { ok: true };
}

export async function deleteAdminPromotion(promotionId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('promotion_id', promotionId);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('id', promotionId);

    if (error) return { ok: false, error: 'Errore durante la disattivazione' };

    revalidatePromotionPaths();
    return { ok: true, deactivated: true };
  }

  const { error } = await supabase.from('promotions').delete().eq('id', promotionId);
  if (error) return { ok: false, error: 'Impossibile eliminare la promozione' };

  revalidatePromotionPaths();
  return { ok: true, deactivated: false };
}

export interface AdminProductInput {
  id?: string;
  name: string;
  brand?: string;
  category: string;
  sku?: string;
  stockQuantity: number;
  minStockLevel: number;
  priceEuros?: number | null;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

const PRODUCT_CATEGORIES = ['perfume', 'cosmetic', 'accessory', 'other'] as const;

export async function getAdminProducts() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('products')
    .select('*')
    .order('sort_order');

  return data ?? [];
}

export async function saveAdminProduct(input: AdminProductInput) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Inserisci il nome del prodotto' };
  if (!PRODUCT_CATEGORIES.includes(input.category as (typeof PRODUCT_CATEGORIES)[number])) {
    return { ok: false, error: 'Categoria non valida' };
  }
  if (input.stockQuantity < 0) return { ok: false, error: 'La quantità non può essere negativa' };
  if (input.minStockLevel < 0) return { ok: false, error: 'La soglia minima non può essere negativa' };

  const sku = input.sku?.trim().toUpperCase() || null;
  const payload = {
    name,
    brand: input.brand?.trim() || null,
    category: input.category,
    sku,
    stock_quantity: Math.round(input.stockQuantity),
    min_stock_level: Math.round(input.minStockLevel),
    price_cents:
      input.priceEuros != null && input.priceEuros > 0
        ? Math.round(input.priceEuros * 100)
        : null,
    image_url: input.imageUrl?.trim() || null,
    description: input.description?.trim() || null,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'SKU già in uso' };
      return { ok: false, error: 'Errore durante la modifica' };
    }
    return { ok: true, product: data };
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...payload,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'SKU già in uso' };
    return { ok: false, error: 'Errore durante la creazione' };
  }

  return { ok: true, product: data };
}

export async function deleteAdminProduct(productId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) return { ok: false, error: 'Impossibile eliminare il prodotto' };

  return { ok: true };
}

export async function setProductsStockBatch(
  updates: { productId: string; quantity: number }[]
) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false as const, error: 'Database non configurato' };
  if (updates.length === 0) return { ok: true as const, results: [] };

  const now = new Date().toISOString();
  const results = await Promise.all(
    updates.map(async ({ productId, quantity }) => {
      if (quantity < 0) {
        return { ok: false as const, productId, error: 'Scorte insufficienti' };
      }

      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: quantity, updated_at: now })
        .eq('id', productId)
        .select('stock_quantity')
        .single();

      if (error || !data) {
        return { ok: false as const, productId, error: 'Errore aggiornamento scorte' };
      }

      return {
        ok: true as const,
        productId,
        stockQuantity: data.stock_quantity as number,
      };
    })
  );

  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    return { ok: false as const, error: failed.error };
  }

  return {
    ok: true as const,
    results: results
      .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
      .map(({ productId, stockQuantity }) => ({ productId, stockQuantity })),
  };
}

export async function setProductStock(productId: string, quantity: number) {
  const result = await setProductsStockBatch([{ productId, quantity }]);
  if (!result.ok) return result;
  return { ok: true, stockQuantity: result.results[0]?.stockQuantity };
}

export async function adjustProductStock(productId: string, delta: number) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (!product) return { ok: false, error: 'Prodotto non trovato' };

  return setProductStock(productId, product.stock_quantity + delta);
}

