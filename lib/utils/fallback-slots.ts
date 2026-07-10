import { parseISO } from 'date-fns';
import { generateSlots } from '@/lib/utils/slots';
import { getShopPeriodsForDay } from '@/lib/utils/shop-hours';

export function getFallbackSlots(
  dateStr: string,
  durationMinutes: number
): { slots: string[]; error?: string } {
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 1) {
    return { slots: [], error: 'Chiuso in questo giorno' };
  }

  const periods = getShopPeriodsForDay(dayOfWeek);
  const slots = Array.from(
    new Set(
      periods.flatMap((period) =>
        generateSlots(date, period.startTime, period.endTime, durationMinutes, 30).map((slot) => slot.time)
      )
    )
  ).sort();

  const minAdvance = new Date();
  minAdvance.setHours(minAdvance.getHours() + 2);

  const available = slots.filter((time) => {
    const [h, m] = time.split(':').map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);
    return slotDate > minAdvance;
  });

  return { slots: available };
}