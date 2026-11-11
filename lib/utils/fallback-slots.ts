import { generateSlots } from '@/lib/utils/slots';
import { getShopPeriodsForDay } from '@/lib/utils/shop-hours';
import { getShopDayOfWeek, parseBookingDateTime } from '@/lib/utils/booking-datetime';
import { isSpecialOpeningDate } from '@/lib/utils/special-openings';

export function getFallbackSlots(
  dateStr: string,
  durationMinutes: number
): { slots: string[]; error?: string } {
  const isSpecial = isSpecialOpeningDate(dateStr);
  const dayOfWeek = getShopDayOfWeek(dateStr);

  if ((dayOfWeek === 0 || dayOfWeek === 1) && !isSpecial) {
    return { slots: [], error: 'Chiuso in questo giorno' };
  }

  const periods = getShopPeriodsForDay(dayOfWeek, dateStr);
  const slots = Array.from(
    new Set(
      periods.flatMap((period) =>
        generateSlots(dateStr, period.startTime, period.endTime, durationMinutes, 30).map(
          (slot) => slot.time
        )
      )
    )
  ).sort();

  const minAdvance = new Date();
  minAdvance.setHours(minAdvance.getHours() + 2);

  const available = slots.filter((time) => parseBookingDateTime(dateStr, time) > minAdvance);

  return { slots: available };
}