'use server';

import { addDays, endOfDay, format, parseISO } from 'date-fns';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

export type SlotDetail = {
  time: string;
  barberId: string;
  barberName: string;
  isPrimary: boolean;
  isFallback: boolean;
};

export type AvailableSlotsResult = {
  slots: string[];
  slotsDetail?: SlotDetail[];
  primaryBarberAvailable?: boolean;
  primaryBarberName?: string;
  primaryBarberId?: string;
  fallbackActive?: boolean;
  fallbackNotice?: string | null;
  unavailable?: boolean;
  error?: string;
};

type AvailabilityRow = {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  period?: string | null;
};

export function getBarberRank(name?: string | null): number {
  if (!name) return 99;
  const lower = name.toLowerCase();
  if (lower.includes('luigi')) return 1;
  if (lower.includes('francesco')) return 2;
  if (lower.includes('vittorio')) return 3;
  return 10;
}

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
  if (dayAvailability.length === 0) {
    if (dayOfWeek === 0 || dayOfWeek === 1) return [];
    return getShopPeriodsForDay(dayOfWeek).map((p) => ({
      start: p.startTime,
      end: p.endTime,
    }));
  }

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

type BarberRecord = {
  id: string;
  name: string;
  role: string;
  sort_order: number;
};

type BookingContext = {
  barberIds: string[];
  barberDetails: Map<string, BarberRecord>;
  availabilityByBarber: Map<string, AvailabilityRow[]>;
  appointmentsByBarber: Map<string, { starts_at: string; ends_at: string }[]>;
  timeOff: TimeOffRow[];
};

function getBookingCandidateDates(): string[] {
  const bookingEnd = endOfDay(parseISO(SITE_CONFIG.bookingEndDate));
  const candidates: string[] = [];
  let cursor = new Date();

  while (cursor <= bookingEnd) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    const day = getShopDayOfWeek(dateStr);
    if (day !== 0 && day !== 1) {
      candidates.push(dateStr);
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
  const supabase = (await createServiceClient()) ?? (await createClient());
  if (!supabase) return null;

  const { data: allBarbersData } = await supabase
    .from('barbers')
    .select('id, name, role, sort_order')
    .eq('is_active', true);

  const barbers = (allBarbersData ?? []) as BarberRecord[];
  if (barbers.length === 0) return null;

  // Ordina per priorità: Luigi (1), Francesco (2), Vittorio (3)
  barbers.sort((a, b) => {
    const rankA = getBarberRank(a.name);
    const rankB = getBarberRank(b.name);
    if (rankA !== rankB) return rankA - rankB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const barberDetails = new Map<string, BarberRecord>(barbers.map((b) => [b.id, b]));

  let barberIds: string[];
  if (barberId) {
    barberIds = [barberId];
  } else {
    barberIds = barbers.map((b) => b.id);
  }

  if (barberIds.length === 0) return null;

  const firstDate = candidateDates[0] ?? format(new Date(), 'yyyy-MM-dd');
  const lastDate = candidateDates[candidateDates.length - 1] ?? firstDate;
  const rangeStart = getShopDayBounds(firstDate).dayStart.toISOString();
  const rangeEnd = getShopDayBounds(lastDate).dayEnd.toISOString();

  // Recupera la disponibilità di tutti i barbieri attivi per supportare il fallback
  const allActiveBarberIds = barbers.map((b) => b.id);

  const [availabilityRes, appointmentsRes, timeOffRes] = await Promise.all([
    supabase
      .from('barber_availability')
      .select('*')
      .in('barber_id', allActiveBarberIds)
      .eq('is_available', true),
    supabase
      .from('appointments')
      .select('id, barber_id, starts_at, ends_at')
      .in('barber_id', allActiveBarberIds)
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
    barberDetails,
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

function computeSlotsForBarber(
  barberId: string,
  dateStr: string,
  durationMinutes: number,
  context: BookingContext,
  forAdmin = false
): string[] {
  const dayOfWeek = getShopDayOfWeek(dateStr);
  if (dayOfWeek === 0 || dayOfWeek === 1) return [];

  const { dayStart, dayEnd } = getShopDayBounds(dateStr);
  const slotsSet = new Set<string>();
  const minAdvance = new Date();
  if (!forAdmin) minAdvance.setHours(minAdvance.getHours() + 2);

  const availabilityRows = context.availabilityByBarber.get(barberId) ?? [];
  const dayAvailability = availabilityRows.filter((row) => row.day_of_week === dayOfWeek);

  // Se ci sono righe per il giorno e tutte dicono non disponibile -> giorno chiuso
  if (availabilityRows.length > 0 && dayAvailability.length > 0 && !dayAvailability.some((r) => r.is_available)) {
    return [];
  }

  const periods = resolveAvailabilityPeriods(dayOfWeek, dayAvailability);
  if (periods.length === 0) return [];

  const appointments = getAppointmentsForDay(
    context.appointmentsByBarber.get(barberId) ?? [],
    dayStart,
    dayEnd
  );
  const timeOff = filterTimeOffForBarber(context.timeOff, barberId);

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
        slotsSet.add(slot.time);
      }
    }
  }

  return Array.from(slotsSet).sort();
}

function computeSlotsFromContext(
  targetBarberIds: string[],
  dateStr: string,
  durationMinutes: number,
  context: BookingContext,
  forAdmin = false
): string[] {
  const allSlotsSet = new Set<string>();

  for (const bid of targetBarberIds) {
    const slots = computeSlotsForBarber(bid, dateStr, durationMinutes, context, forAdmin);
    for (const s of slots) allSlotsSet.add(s);
  }

  return Array.from(allSlotsSet).sort();
}

export async function getAvailableSlots(
  barberId: string | null,
  dateStr: string,
  durationMinutes: number,
  excludeAppointmentId?: string | null,
  forAdmin = false
): Promise<AvailableSlotsResult> {
  if (!isSupabaseConfigured()) {
    return getFallbackSlots(dateStr, durationMinutes);
  }

  try {
    const candidates = [dateStr];
    const context = await fetchBookingContext(null, candidates, excludeAppointmentId);
    if (!context) return getFallbackSlots(dateStr, durationMinutes);

    // Identifica i barbieri ordinati per priorità: 1. Luigi, 2. Francesco, 3. Vittorio
    const allBarbers = Array.from(context.barberDetails.values()).sort((a, b) => {
      const rankA = getBarberRank(a.name);
      const rankB = getBarberRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    const luigi = allBarbers.find((b) => getBarberRank(b.name) === 1);
    const primaryBarberId = luigi?.id ?? allBarbers[0]?.id;
    const primaryBarberName = luigi?.name ?? allBarbers[0]?.name ?? 'Luigi Garofalo';

    // Calcola gli slot per ciascun barbiere in modo indipendente
    const slotsByBarber = new Map<string, string[]>();
    for (const b of allBarbers) {
      slotsByBarber.set(b.id, computeSlotsForBarber(b.id, dateStr, durationMinutes, context, forAdmin));
    }

    // Se l'utente ha selezionato un barbiere specifico diverso da Luigi (es. Francesco o Vittorio direttamente)
    if (barberId && barberId !== primaryBarberId) {
      const explicitBarber = context.barberDetails.get(barberId);
      const bSlots = slotsByBarber.get(barberId) ?? [];
      const slotsDetail: SlotDetail[] = bSlots.map((t) => ({
        time: t,
        barberId,
        barberName: explicitBarber?.name ?? 'Barbiere',
        isPrimary: false,
        isFallback: false,
      }));

      return {
        slots: bSlots,
        slotsDetail,
        primaryBarberAvailable: (slotsByBarber.get(primaryBarberId)?.length ?? 0) > 0,
        primaryBarberName,
        primaryBarberId,
      };
    }

    // Modalità PREDEFINITA (Luigi selezionato o nessuna preferenza):
    // Priorità assoluta a Luigi, con fallback automatico su Francesco e poi Vittorio
    const luigiSlots = primaryBarberId ? (slotsByBarber.get(primaryBarberId) ?? []) : [];
    const luigiSlotsSet = new Set(luigiSlots);
    const isPrimaryAvailableOnDay = luigiSlots.length > 0;

    // Genera l'insieme combinato di tutti gli orari possibili per il giorno
    const allPossibleTimes = new Set<string>();
    for (const bSlots of slotsByBarber.values()) {
      for (const t of bSlots) allPossibleTimes.add(t);
    }
    const sortedTimes = Array.from(allPossibleTimes).sort();

    const slotsDetail: SlotDetail[] = [];
    let hasFallbackSlot = false;

    for (const time of sortedTimes) {
      // 1. Se Luigi è libero a quest'ora -> Assegna Luigi
      if (primaryBarberId && luigiSlotsSet.has(time)) {
        slotsDetail.push({
          time,
          barberId: primaryBarberId,
          barberName: primaryBarberName,
          isPrimary: true,
          isFallback: false,
        });
        continue;
      }

      // 2. Se Luigi non è libero -> Fallback su Francesco, poi Vittorio
      let assigned = false;
      for (const fallbackBarber of allBarbers) {
        if (fallbackBarber.id === primaryBarberId) continue;
        const fbSlots = slotsByBarber.get(fallbackBarber.id) ?? [];
        if (fbSlots.includes(time)) {
          slotsDetail.push({
            time,
            barberId: fallbackBarber.id,
            barberName: fallbackBarber.name,
            isPrimary: false,
            isFallback: true,
          });
          assigned = true;
          hasFallbackSlot = true;
          break;
        }
      }
    }

    const finalSlotTimes = slotsDetail.map((s) => s.time);

    let fallbackNotice: string | null = null;
    if (!isPrimaryAvailableOnDay && finalSlotTimes.length > 0) {
      fallbackNotice = `Luigi non è disponibile per questa data. Ecco gli orari disponibili con i collaboratori Francesco e Vittorio:`;
    }

    if (finalSlotTimes.length === 0) {
      const { dayStart, dayEnd } = getShopDayBounds(dateStr);
      const dayEndInclusive = new Date(dayEnd.getTime() - 1);
      const allBlocked = allBarbers.every((b) =>
        isDayFullyBlockedByTimeOff(
          dayStart.toISOString(),
          dayEndInclusive.toISOString(),
          context.timeOff,
          b.id
        )
      );

      return {
        slots: [],
        slotsDetail: [],
        primaryBarberAvailable: false,
        primaryBarberName,
        primaryBarberId,
        unavailable: allBlocked,
      };
    }

    return {
      slots: finalSlotTimes,
      slotsDetail,
      primaryBarberAvailable: isPrimaryAvailableOnDay,
      primaryBarberName,
      primaryBarberId,
      fallbackActive: hasFallbackSlot,
      fallbackNotice,
    };
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

  // Ordina per priorità: Luigi (1), Francesco (2), Vittorio (3)
  const orderedBarbers = Array.from(context.barberDetails.values()).sort((a, b) => {
    const rankA = getBarberRank(a.name);
    const rankB = getBarberRank(b.name);
    if (rankA !== rankB) return rankA - rankB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  for (const barber of orderedBarbers) {
    const slots = computeSlotsForBarber(barber.id, dateStr, durationMinutes, context);
    if (slots.includes(timeStr)) return barber.id;
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
    const context = await fetchBookingContext(null, candidates, excludeAppointmentId);
    if (!context) return candidates;

    const allBarbers = Array.from(context.barberDetails.values());
    const luigi = allBarbers.find((b) => getBarberRank(b.name) === 1);
    const primaryBarberId = luigi?.id ?? allBarbers[0]?.id;

    // Se un barbiere specifico non-primario è richiesto, filtra per lui
    if (barberId && barberId !== primaryBarberId) {
      return candidates.filter((dateStr) => {
        const slots = computeSlotsForBarber(barberId, dateStr, durationMinutes, context);
        return slots.length > 0;
      });
    }

    // Modalità default (Luigi o qualsiasi): se Luigi o un fallback ha slot, la data è valida
    const targetBarberIds = allBarbers.map((b) => b.id);
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
    const supabase = (await createServiceClient()) ?? (await createClient());
    if (!supabase) return [];

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, sort_order')
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

      // Se non ha righe personalizzate, è disponibile nei giorni standard del salone (2..6)
      if (availabilityDays.size === 0) {
        [2, 3, 4, 5, 6].forEach((d) => availabilityDays.add(d));
      }

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
          reason: scheduleCheck.reason ?? 'In ferie o assente',
        };
      }

      const hasSlots = candidates.some((dateStr) => {
        const slots = computeSlotsForBarber(barber.id, dateStr, durationMinutes, context);
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