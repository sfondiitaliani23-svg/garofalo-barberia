import type { BarberAvailability } from '@/types/database';

export type SchedulePeriod = 'morning' | 'afternoon';

export interface AdminPeriodInput {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface AdminDayScheduleInput {
  dayOfWeek: number;
  morning: AdminPeriodInput;
  afternoon: AdminPeriodInput;
}

export const SCHEDULE_PERIOD_LABELS: Record<SchedulePeriod, string> = {
  morning: 'Mattina',
  afternoon: 'Pomeriggio',
};

export function defaultPeriodsForDay(dayOfWeek: number): AdminDayScheduleInput {
  return {
    dayOfWeek,
    morning: { enabled: true, startTime: '08:30', endTime: '13:00' },
    afternoon: { enabled: true, startTime: '15:30', endTime: '20:30' },
  };
}

export function isDayOpen(day: AdminDayScheduleInput) {
  return (
    (day.morning.enabled && day.morning.startTime < day.morning.endTime) ||
    (day.afternoon.enabled && day.afternoon.startTime < day.afternoon.endTime)
  );
}

function periodFromRow(
  row: BarberAvailability | undefined,
  fallback: AdminPeriodInput
): AdminPeriodInput {
  if (!row) {
    return { ...fallback, enabled: false };
  }

  return {
    enabled: row.is_available,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
  };
}

function inferFromLegacyRow(row: BarberAvailability, dayOfWeek: number): AdminDayScheduleInput {
  const defaults = defaultPeriodsForDay(dayOfWeek);
  const start = row.start_time.slice(0, 5);
  const end = row.end_time.slice(0, 5);

  if (!row.is_available) {
    return {
      dayOfWeek,
      morning: { ...defaults.morning, enabled: false },
      afternoon: { ...defaults.afternoon, enabled: false },
    };
  }

  const coversMorning = start <= defaults.morning.startTime && end > defaults.morning.startTime;
  const coversAfternoon = end >= defaults.afternoon.startTime && start < defaults.afternoon.endTime;

  return {
    dayOfWeek,
    morning: coversMorning
      ? { enabled: true, startTime: start, endTime: defaults.morning.endTime }
      : { ...defaults.morning, enabled: false },
    afternoon: coversAfternoon
      ? { enabled: true, startTime: defaults.afternoon.startTime, endTime: end }
      : { ...defaults.afternoon, enabled: false },
  };
}

export function buildBarberSchedule(
  barberId: string,
  availability: BarberAvailability[],
  weekDays: ReadonlyArray<{ value: number; fixedClosed: boolean }>
): AdminDayScheduleInput[] {
  return weekDays.map((day) => {
    const defaults = defaultPeriodsForDay(day.value);

    if (day.fixedClosed) {
      return {
        dayOfWeek: day.value,
        morning: { ...defaults.morning, enabled: false },
        afternoon: { ...defaults.afternoon, enabled: false },
      };
    }

    const rows = availability.filter(
      (row) => row.barber_id === barberId && row.day_of_week === day.value
    );

    const morningRow = rows.find((row) => row.period === 'morning');
    const afternoonRow = rows.find((row) => row.period === 'afternoon');
    const legacyRow = rows.length === 1 && !rows[0].period ? rows[0] : null;

    if (legacyRow) {
      return inferFromLegacyRow(legacyRow, day.value);
    }

    return {
      dayOfWeek: day.value,
      morning: periodFromRow(morningRow, defaults.morning),
      afternoon: periodFromRow(afternoonRow, defaults.afternoon),
    };
  });
}

export function scheduleToAvailabilityRows(barberId: string, days: AdminDayScheduleInput[]) {
  const rows: {
    barber_id: string;
    day_of_week: number;
    period: SchedulePeriod;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }[] = [];

  for (const day of days) {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 1) continue;

    for (const period of ['morning', 'afternoon'] as const) {
      const slot = day[period];
      const defaults = defaultPeriodsForDay(day.dayOfWeek)[period];
      
      const isValidTime = (t: string | undefined | null) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t.trim().slice(0, 5));
      const start = isValidTime(slot.startTime) ? slot.startTime.trim().slice(0, 5) : defaults.startTime;
      const end = isValidTime(slot.endTime) ? slot.endTime.trim().slice(0, 5) : defaults.endTime;

      rows.push({
        barber_id: barberId,
        day_of_week: day.dayOfWeek,
        period,
        start_time: start,
        end_time: end,
        is_available: slot.enabled && start < end,
      });
    }
  }

  return rows;
}

export function isTimeWithinSchedule(day: AdminDayScheduleInput, time: string) {
  if (day.morning.enabled && time >= day.morning.startTime && time < day.morning.endTime) {
    return true;
  }
  if (day.afternoon.enabled && time >= day.afternoon.startTime && time <= day.afternoon.endTime) {
    return true;
  }
  return false;
}