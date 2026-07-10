'use server';

import { addDays, endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SITE_CONFIG } from '@/lib/site-config';
import {
  filterTimeOffForBarber,
  getAbsenceMessage,
  isDayFullyBlockedByTimeOff,
  type TimeOffRow,
} from '@/lib/utils/barber-absence';
import { filterAvailableSlots, generateSlots } from '@/lib/utils/slots';
import { getFallbackSlots } from '@/lib/utils/fallback-slots';

export type BarberBookingStatus = {
  barberId: string;
  canBook: boolean;
  reason?: string;
};

export async function getAvailableSlots(
  barberId: string | null,
  dateStr: string,
  durationMinutes: number,
  excludeAppointmentId?: string | null,
  forAdmin = false
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
        .select('id, barber_id, starts_at, ends_at')
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

    const availabilityByBarber = new Map<string, typeof availabilityRes.data>();
    for (const row of availabilityRes.data ?? []) {
      const list = availabilityByBarber.get(row.barber_id) ?? [];
      list.push(row);
      availabilityByBarber.set(row.barber_id, list);
    }

    const appointmentsByBarber = new Map<string, { starts_at: string; ends_at: string }[]>();
    for (const apt of appointmentsRes.data ?? []) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
      const list = appointmentsByBarber.get(apt.barber_id) ?? [];
      list.push({ starts_at: apt.starts_at, ends_at: apt.ends_at });
      appointmentsByBarber.set(apt.barber_id, list);
    }

    const allSlotsSet = new Set<string>();
    const minAdvance = new Date();
    if (!forAdmin) minAdvance.setHours(minAdvance.getHours() + 2);

    for (const bid of barberIds) {
      const availabilityRows = availabilityByBarber.get(bid);
      if (!availabilityRows?.length) continue;

      const appointments = appointmentsByBarber.get(bid) ?? [];
      const timeOff = (timeOffRes.data ?? []).filter(
        (row) => row.barber_id === bid || row.barber_id === null
      );

      for (const availability of availabilityRows) {
        const slots = generateSlots(
          date,
          availability.start_time.slice(0, 5),
          availability.end_time.slice(0, 5),
          durationMinutes,
          SITE_CONFIG.slotIntervalMinutes
        );

        const available = filterAvailableSlots(slots, appointments, timeOff);

        for (const slot of available) {
          if (forAdmin || slot.startsAt > minAdvance) {
            allSlotsSet.add(slot.time);
          }
        }
      }
    }

    const slots = Array.from(allSlotsSet).sort();
    if (slots.length === 0) {
      if (barberId) {
        const timeOffRows = (timeOffRes.data ?? []) as TimeOffRow[];
        const fullyBlocked = isDayFullyBlockedByTimeOff(dayStart, dayEnd, timeOffRows, barberId);
        const hasSchedule = Boolean(availabilityByBarber.get(barberId)?.length);
        const absenceBlock = filterTimeOffForBarber(timeOffRows, barberId).find((block) => {
          const blockStart = new Date(block.start_at);
          const blockEnd = new Date(block.end_at);
          const day = parseISO(dateStr);
          return blockStart <= endOfDay(day) && blockEnd >= startOfDay(day);
        });

        if (fullyBlocked || !hasSchedule) {
          return {
            slots: [],
            error: `${getAbsenceMessage(absenceBlock?.reason)} in questa data. Scegli un altro barbiere o un altro giorno.`,
          };
        }

        return {
          slots: [],
          error: 'Nessun orario libero per questo giorno. Scegli un altro giorno.',
        };
      }

      return getFallbackSlots(dateStr, durationMinutes);
    }

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

function getBookingCandidateDates(): string[] {
  const bookingEnd = endOfDay(parseISO(SITE_CONFIG.bookingEndDate));
  const candidates: string[] = [];
  let cursor = addDays(new Date(), 1);

  while (cursor <= bookingEnd) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 1) {
      candidates.push(format(cursor, 'yyyy-MM-dd'));
    }
    cursor = addDays(cursor, 1);
  }

  return candidates;
}

export async function getAvailableDates(
  durationMinutes: number,
  barberId: string | null = null,
  excludeAppointmentId?: string | null
): Promise<string[]> {
  const candidates = getBookingCandidateDates();
  const results: (string | null)[] = [];
  const batchSize = 21;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (dateStr) => {
        const { slots } = await getAvailableSlots(barberId, dateStr, durationMinutes, excludeAppointmentId);
        return slots.length > 0 ? dateStr : null;
      })
    );
    results.push(...batchResults);
  }

  return results.filter((d): d is string => d !== null);
}

export async function getBarbersBookingAvailability(
  durationMinutes: number
): Promise<BarberBookingStatus[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('is_active', true)
      .order('sort_order');

    if (!barbers?.length) return [];

    const statuses = await Promise.all(
      barbers.map(async (barber) => {
        const dates = await getAvailableDates(durationMinutes, barber.id);
        return {
          barberId: barber.id,
          canBook: dates.length > 0,
          reason: dates.length === 0 ? 'In ferie o non disponibile' : undefined,
        };
      })
    );

    return statuses;
  } catch {
    return [];
  }
}