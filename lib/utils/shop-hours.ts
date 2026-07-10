import { defaultPeriodsForDay } from '@/lib/utils/barber-schedule';

export type ShopPeriod = {
  startTime: string;
  endTime: string;
};

/** Orari di apertura reali del salone (mattina + pomeriggio, pausa 13:00–14:00). */
export function getShopPeriodsForDay(dayOfWeek: number): ShopPeriod[] {
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

export function getDayClosingTime(dayOfWeek: number): string {
  return dayOfWeek === 6 ? '18:00' : '19:30';
}

export function isWithinShopHours(date: Date, time: string): boolean {
  const periods = getShopPeriodsForDay(date.getDay());
  return periods.some((period) => time >= period.startTime && time < period.endTime);
}

export function isSlotWithinShopHours(day: Date, time: string): boolean {
  if (time < '09:00') return false;

  const closing = getDayClosingTime(day.getDay());
  if (time > closing) return false;

  if (time >= '13:00' && time < '14:00') return false;

  return true;
}