'use server';

import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SITE_CONFIG } from '@/lib/site-config';
import { filterAvailableSlots, generateSlots } from '@/lib/utils/slots';
import { getFallbackSlots } from '@/lib/utils/fallback-slots';

export async function getAvailableSlots(
  barberId: string | null,
  dateStr: string,
  durationMinutes: number
): Promise<{ slots: string[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return getFallbackSlots(dateStr, durationMinutes);
  }

  try {
    const supabase = await createClient();
    if (!supabase) return getFallbackSlots(dateStr, durationMinutes);

    const date = parseISO(dateStr);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 1) {
      return { slots: [], error: 'Chiuso in questo giorno' };
    }

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('is_active', true);

    const barberIds = barberId
      ? [barberId]
      : (barbers ?? []).map((b) => b.id);

    if (barberIds.length === 0) return getFallbackSlots(dateStr, durationMinutes);

    const dayStart = startOfDay(date).toISOString();
    const dayEnd = addDays(startOfDay(date), 1).toISOString();

    const [availabilityRes, appointmentsRes, timeOffRes] = await Promise.all([
      supabase
        .from('barber_availability')
        .select('*')
        .in('barber_id', barberIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true),
      supabase
        .from('appointments')
        .select('barber_id, starts_at, ends_at')
        .in('barber_id', barberIds)
        .eq('status', 'confirmed')
        .gte('starts_at', dayStart)
        .lt('starts_at', dayEnd),
      supabase
        .from('barber_time_off')
        .select('barber_id, start_at, end_at')
        .lte('start_at', dayEnd)
        .gte('end_at', dayStart),
    ]);

    const availabilityByBarber = new Map(
      (availabilityRes.data ?? []).map((row) => [row.barber_id, row])
    );

    const appointmentsByBarber = new Map<string, { starts_at: string; ends_at: string }[]>();
    for (const apt of appointmentsRes.data ?? []) {
      const list = appointmentsByBarber.get(apt.barber_id) ?? [];
      list.push({ starts_at: apt.starts_at, ends_at: apt.ends_at });
      appointmentsByBarber.set(apt.barber_id, list);
    }

    const allSlotsSet = new Set<string>();
    const minAdvance = new Date();
    minAdvance.setHours(minAdvance.getHours() + 2);

    for (const bid of barberIds) {
      const availability = availabilityByBarber.get(bid);
      if (!availability) continue;

      const appointments = appointmentsByBarber.get(bid) ?? [];
      const timeOff = (timeOffRes.data ?? []).filter(
        (row) => row.barber_id === bid || row.barber_id === null
      );

      const slots = generateSlots(
        date,
        availability.start_time.slice(0, 5),
        availability.end_time.slice(0, 5),
        durationMinutes,
        SITE_CONFIG.slotIntervalMinutes
      );

      const available = filterAvailableSlots(slots, appointments, timeOff);

      for (const slot of available) {
        if (slot.startsAt > minAdvance) {
          allSlotsSet.add(slot.time);
        }
      }
    }

    const slots = Array.from(allSlotsSet).sort();
    if (slots.length === 0) return getFallbackSlots(dateStr, durationMinutes);
    return { slots };
  } catch {
    return getFallbackSlots(dateStr, durationMinutes);
  }
}

export async function resolveBarberForSlot(
  dateStr: string,
  timeStr: string,
  durationMinutes: number
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id')
    .eq('is_active', true)
    .order('sort_order');

  const checks = await Promise.all(
    (barbers ?? []).map(async (barber) => {
      const { slots } = await getAvailableSlots(barber.id, dateStr, durationMinutes);
      return slots.includes(timeStr) ? barber.id : null;
    })
  );

  return checks.find((id) => id !== null) ?? null;
}

export async function getAvailableDates(
  durationMinutes: number,
  barberId: string | null = null
): Promise<string[]> {
  const today = new Date();
  const candidates: string[] = [];

  for (let i = 1; i <= SITE_CONFIG.bookingHorizonDays; i++) {
    const d = addDays(today, i);
    const day = d.getDay();
    if (day === 0 || day === 1) continue;
    candidates.push(format(d, 'yyyy-MM-dd'));
  }

  const results = await Promise.all(
    candidates.map(async (dateStr) => {
      const { slots } = await getAvailableSlots(barberId, dateStr, durationMinutes);
      return slots.length > 0 ? dateStr : null;
    })
  );

  return results.filter((d): d is string => d !== null);
}