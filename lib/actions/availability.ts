'use server';

import { addDays, endOfDay, format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SITE_CONFIG } from '@/lib/site-config';
import { getShopDayBounds, getShopDayOfWeek, parseBookingDateTime } from '@/lib/utils/booking-datetime';
import {
  filterTimeOffForBarber,
  hasAnyBookableDayBySchedule,
  isDayFullyBlockedByTimeOff,
  type TimeOffRow,
} from '@/lib/utils/barber-absence';
import { filterAvailableSlots, generateSlots } from '@/lib/utils/slots';
import { getFallbackSlots } from '@/lib/utils/fallback-slots';
import { getShopPeriodsForDay } from '@/lib/utils/shop-hours';

export type BarberBookingStatus = {
  barberId: string;
  canBook: boolean;
  reason?: string;
};

type AvailabilityRow = {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  period?: string | null;
};

function isLegacyContinuousSchedule(dayAvailability: AvailabilityRow[]): boolean {
  const morning = dayAvailability.find((row) => row.period === 'morning');
  const afternoon = dayAvailability.find((row) => row.period === 'afternoon');

  if (afternoon?.is_available) return false;

  const primary =
    morning ??
    dayAvailability.find((row) => !row.period) ??
    (dayAvailability.length === 1 ? dayAvailability[0] : undefined);

  if (!primary?.is_available) return false;

  return primary.end_time.slice(0, 5) > '13:00';
}

function resolveAvailabilityPeriods(
  dayOfWeek: number,
  dayAvailability: AvailabilityRow[]
): { start: string; end: string }[] {
  if (!dayAvailability.some((row) => row.is_available)) return [];

  if (isLegacyContinuousSchedule(dayAvailability)) {
    return getShopPeriodsForDay(dayOfWeek).map((period) => ({
      start: period.startTime,
      end: period.endTime,
    }));
  }

  const morning = dayAvailability.find((row) => row.period === 'morning');
  const afternoon = dayAvailability.find((row) => row.period === 'afternoon');
  const hasPeriodRows = Boolean(morning || afternoon);

  if (hasPeriodRows) {
    const periods: { start: string; end: string }[] = [];
    if (morning?.is_available) {
      periods.push({
        start: morning.start_time.slice(0, 5),
        end: morning.end_time.slice(0, 5),
      });
    }
    if (afternoon?.is_available) {
      periods.push({
        start: afternoon.start_time.slice(0, 5),
        end: afternoon.end_time.slice(0, 5),
      });
    }
    return periods;
  }

  return getShopPeriodsForDay(dayOfWeek).map((period) => ({
    start: period.startTime,
    end: period.endTime,
  }));
}

type BookingContext = {
  barberIds: string[];
  availabilityByBarber: Map<string, AvailabilityRow[]>;
  appointmentsByBarber: Map<string, { starts_at: string; ends_at: string }[]>;
  timeOff: TimeOffRow[];
};

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

async function fetchBookingContext(
  barberId: string | null,
  candidateDates: string[],
  excludeAppointmentId?: string | null
): Promise<BookingContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  let barberIds: string[];
  if (barberId) {
    barberIds = [barberId];
  } else {
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('is_active', true);
    barberIds = (barbers ?? []).map((b) => b.id);
  }

  if (barberIds.length === 0) return null;

  const rangeStart = getShopDayBounds(candidateDates[0]).dayStart.toISOString();
  const rangeEnd = getShopDayBounds(candidateDates[candidateDates.length - 1]).dayEnd.toISOString();

  const [availabilityRes, appointmentsRes, timeOffRes] = await Promise.all([
    supabase
      .from('barber_availability')
      .select('*')
      .in('barber_id', barberIds)
      .eq('is_available', true),
    supabase
      .from('appointments')
      .select('id, barber_id, starts_at, ends_at')
      .in('barber_id', barberIds)
      .eq('status', 'confirmed')
      .gte('starts_at', rangeStart)
      .lt('starts_at', rangeEnd),
    supabase
      .from('barber_time_off')
      .select('barber_id, start_at, end_at, reason')
      .lte('start_at', rangeEnd)
      .gte('end_at', rangeStart),
  ]);

  const availabilityByBarber = new Map<string, AvailabilityRow[]>();
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

  return {
    barberIds,
    availabilityByBarber,
    appointmentsByBarber,
    timeOff: (timeOffRes.data ?? []) as TimeOffRow[],
  };
}

function getAppointmentsForDay(
  appointments: { starts_at: string; ends_at: string }[],
  dayStart: Date,
  dayEnd: Date
) {
  return appointments.filter((apt) => {
    const aptStart = new Date(apt.starts_at);
    return aptStart >= dayStart && aptStart < dayEnd;
  });
}

function computeSlotsFromContext(
  targetBarberIds: string[],
  dateStr: string,
  durationMinutes: number,
  context: BookingContext,
  forAdmin = false
): string[] {
  const dayOfWeek = getShopDayOfWeek(dateStr);

  if (dayOfWeek === 0 || dayOfWeek === 1) return [];

  const { dayStart, dayEnd } = getShopDayBounds(dateStr);
  const allSlotsSet = new Set<string>();
  const minAdvance = new Date();
  if (!forAdmin) minAdvance.setHours(minAdvance.getHours() + 2);

  for (const bid of targetBarberIds) {
    const availabilityRows = context.availabilityByBarber.get(bid);
    if (!availabilityRows?.length) continue;

    const dayAvailability = availabilityRows.filter((row) => row.day_of_week === dayOfWeek);
    if (!dayAvailability.length) continue;

    const appointments = getAppointmentsForDay(
      context.appointmentsByBarber.get(bid) ?? [],
      dayStart,
      dayEnd
    );
    const timeOff = filterTimeOffForBarber(context.timeOff, bid);

    const periods = resolveAvailabilityPeriods(dayOfWeek, dayAvailability);

    for (const period of periods) {
      const slots = generateSlots(
        dateStr,
        period.start,
        period.end,
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

  return Array.from(allSlotsSet).sort();
}

export async function getAvailableSlots(
  barberId: string | null,
  dateStr: string,
  durationMinutes: number,
  excludeAppointmentId?: string | null,
  forAdmin = false
): Promise<{ slots: string[]; unavailable?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return getFallbackSlots(dateStr, durationMinutes);
  }

  try {
    const candidates = [dateStr];
    const context = await fetchBookingContext(barberId, candidates, excludeAppointmentId);
    if (!context) return getFallbackSlots(dateStr, durationMinutes);

    const targetBarberIds = barberId ? [barberId] : context.barberIds;
    const slots = computeSlotsFromContext(targetBarberIds, dateStr, durationMinutes, context, forAdmin);

    if (slots.length === 0) {
      if (barberId) {
        const { dayStart, dayEnd } = getShopDayBounds(dateStr);
        const dayEndInclusive = new Date(dayEnd.getTime() - 1);
        const fullyBlocked = isDayFullyBlockedByTimeOff(
          dayStart.toISOString(),
          dayEndInclusive.toISOString(),
          context.timeOff,
          barberId
        );

        if (fullyBlocked) {
          return { slots: [], unavailable: true };
        }

        return { slots: [] };
      }

      const allBlocked = context.barberIds.every((id) => {
        const { dayStart, dayEnd } = getShopDayBounds(dateStr);
        const dayEndInclusive = new Date(dayEnd.getTime() - 1);
        return isDayFullyBlockedByTimeOff(
          dayStart.toISOString(),
          dayEndInclusive.toISOString(),
          context.timeOff,
          id
        );
      });

      if (allBlocked) {
        return { slots: [], unavailable: true };
      }

      return { slots: [] };
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

  const candidates = [dateStr];
  const context = await fetchBookingContext(null, candidates);
  if (!context) return null;

  for (const barber of context.barberIds) {
    const slots = computeSlotsFromContext([barber], dateStr, durationMinutes, context);
    if (slots.includes(timeStr)) return barber;
  }

  return null;
}

export async function getAvailableDates(
  durationMinutes: number,
  barberId: string | null = null,
  excludeAppointmentId?: string | null
): Promise<string[]> {
  const candidates = getBookingCandidateDates();
  if (candidates.length === 0) return [];

  if (!isSupabaseConfigured()) {
    return candidates;
  }

  try {
    const context = await fetchBookingContext(barberId, candidates, excludeAppointmentId);
    if (!context) return candidates;

    const targetBarberIds = barberId ? [barberId] : context.barberIds;

    return candidates.filter((dateStr) => {
      const slots = computeSlotsFromContext(targetBarberIds, dateStr, durationMinutes, context);
      return slots.length > 0;
    });
  } catch {
    return candidates;
  }
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

    const candidates = getBookingCandidateDates();
    const context = await fetchBookingContext(null, candidates);
    if (!context) {
      return barbers.map((barber) => ({ barberId: barber.id, canBook: true }));
    }

    return barbers.map((barber) => {
      const availabilityRows = context.availabilityByBarber.get(barber.id) ?? [];
      const availabilityDays = new Set(availabilityRows.map((row) => row.day_of_week));

      const scheduleCheck = hasAnyBookableDayBySchedule(
        candidates,
        availabilityDays,
        context.timeOff,
        barber.id
      );

      if (!scheduleCheck.canBook) {
        return {
          barberId: barber.id,
          canBook: false,
          reason: scheduleCheck.reason ?? 'In ferie o non disponibile',
        };
      }

      const hasSlots = candidates.some((dateStr) => {
        const slots = computeSlotsFromContext([barber.id], dateStr, durationMinutes, context);
        return slots.length > 0;
      });

      return {
        barberId: barber.id,
        canBook: hasSlots,
        reason: hasSlots ? undefined : 'In ferie o non disponibile',
      };
    });
  } catch {
    return [];
  }
}