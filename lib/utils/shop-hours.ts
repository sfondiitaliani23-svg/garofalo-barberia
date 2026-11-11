import { defaultPeriodsForDay } from '@/lib/utils/barber-schedule';
import { getShopDateString } from '@/lib/utils/booking-datetime';
import { getSpecialOpening } from '@/lib/utils/special-openings';

export type ShopPeriod = {
  startTime: string;
  endTime: string;
};

/** Orari di apertura reali del salone (mattina + pomeriggio; sabato 08:30–14:00 e 14:30–20:00). */
export function getShopPeriodsForDay(dayOfWeek: number, dateStr?: string): ShopPeriod[] {
  if (dateStr) {
    const special = getSpecialOpening(dateStr);
    if (special) return special.periods;
  }

  if (dayOfWeek === 0 || dayOfWeek === 1) return [];

  const schedule = defaultPeriodsForDay(dayOfWeek);
  const periods: ShopPeriod[] = [];

  if (schedule.morning.enabled && schedule.morning.startTime < schedule.morning.endTime) {
    periods.push({
      startTime: schedule.morning.startTime,
      endTime: schedule.morning.endTime,
    });
  }

  if (schedule.afternoon.enabled && schedule.afternoon.startTime < schedule.afternoon.endTime) {
    periods.push({
      startTime: schedule.afternoon.startTime,
      endTime: schedule.afternoon.endTime,
    });
  }

  return periods;
}

export function getDayClosingTime(dayOfWeek: number, dateStr?: string): string {
  if (dateStr) {
    const special = getSpecialOpening(dateStr);
    if (special?.closingTime) return special.closingTime;
  }
  if (dayOfWeek === 6) return '20:00';
  return '20:30';
}

export function isWithinShopHours(date: Date, time: string): boolean {
  const dateStr = getShopDateString(date);
  const special = getSpecialOpening(dateStr);
  if (special) {
    return special.periods.some((period) => time >= period.startTime && time < period.endTime);
  }
  const periods = getShopPeriodsForDay(date.getDay());
  return periods.some((period) => time >= period.startTime && time < period.endTime);
}

export function isSlotWithinShopHours(day: Date, time: string): boolean {
  const dateStr = getShopDateString(day);
  const special = getSpecialOpening(dateStr);
  if (special) {
    return special.periods.some((period) => time >= period.startTime && time < period.endTime);
  }
  const dayOfWeek = day.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 1) return false;

  const periods = getShopPeriodsForDay(dayOfWeek);
  return periods.some((period) => time >= period.startTime && time < period.endTime);
}