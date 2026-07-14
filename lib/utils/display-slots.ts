import { parseISO } from 'date-fns';
import { generateCalendarTimeSlots, isSlotWithinHours } from '@/lib/utils/week-calendar';

/** Orari visualizzabili in griglia per un giorno (rispetta pausa pranzo e chiusura). */
export function getDisplaySlotsForDate(dateStr: string): string[] {
  const day = parseISO(`${dateStr}T12:00:00`);
  return generateCalendarTimeSlots().filter((time) => isSlotWithinHours(day, time));
}