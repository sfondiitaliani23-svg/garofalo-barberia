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

export interface AdminDayScheduleInput {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export interface AdminTimeOffInput {
  barberId: string | null;
  startDate: string;
  endDate: string;
  reason?: string;
}

const DEFAULT_WEEKLY_SCHEDULE: AdminDayScheduleInput[] = [
  { dayOfWeek: 2, isAvailable: true, startTime: '09:00', endTime: '19:30' },
  { dayOfWeek: 3, isAvailable: true, startTime: '09:00', endTime: '19:30' },
  { dayOfWeek: 4, isAvailable: true, startTime: '09:00', endTime: '19:30' },
  { dayOfWeek: 5, isAvailable: true, startTime: '09:00', endTime: '19:30' },
  { dayOfWeek: 6, isAvailable: true, startTime: '09:00', endTime: '18:00' },
];

export async function getAdminTeamData() {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) {
    return { barbers: [], availability: [], timeOff: [] };
  }

  const [barbersRes, availabilityRes, timeOffRes] = await Promise.all([
    supabase.from('barbers').select('*').order('sort_order'),
    supabase.from('barber_availability').select('*'),
    supabase
      .from('barber_time_off')
      .select('*, barber:barbers(name)')
      .order('start_at', { ascending: false }),
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

  const scheduleRows = DEFAULT_WEEKLY_SCHEDULE.map((day) => ({
    barber_id: created.id,
    day_of_week: day.dayOfWeek,
    start_time: day.startTime,
    end_time: day.endTime,
    is_available: day.isAvailable,
  }));

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

  for (const day of days) {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 1) continue;

    const startTime = day.startTime.slice(0, 5);
    const endTime = day.endTime.slice(0, 5);

    if (day.isAvailable && startTime >= endTime) {
      return { ok: false, error: 'Orario di fine deve essere dopo l\'inizio' };
    }

    const { error } = await supabase.from('barber_availability').upsert(
      {
        barber_id: barberId,
        day_of_week: day.dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: day.isAvailable,
      },
      { onConflict: 'barber_id,day_of_week' }
    );

    if (error) return { ok: false, error: 'Errore durante il salvataggio orari' };
  }

  revalidateTeamPaths();
  return { ok: true };
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

  revalidateTeamPaths();
  return { ok: true };
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

function revalidateInventoryPaths() {
  revalidatePath('/admin/inventario');
}

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
    revalidateInventoryPaths();
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

  revalidateInventoryPaths();
  return { ok: true, product: data };
}

export async function deleteAdminProduct(productId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) return { ok: false, error: 'Impossibile eliminare il prodotto' };

  revalidateInventoryPaths();
  return { ok: true };
}

export async function setProductStock(productId: string, quantity: number) {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  if (quantity < 0) return { ok: false, error: 'Scorte insufficienti' };

  const { data, error } = await supabase
    .from('products')
    .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select('stock_quantity')
    .single();

  if (error || !data) return { ok: false, error: 'Errore aggiornamento scorte' };

  revalidateInventoryPaths();
  return { ok: true, stockQuantity: data.stock_quantity };
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