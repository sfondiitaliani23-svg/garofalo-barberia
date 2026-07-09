import { parseISO } from 'date-fns';
import { generateSlots } from '@/lib/utils/slots';

const DEFAULT_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
];

export function getFallbackSlots(
  dateStr: string,
  durationMinutes: number
): { slots: string[]; error?: string } {
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 1) {
    return { slots: [], error: 'Chiuso in questo giorno' };
  }

  const endTime = dayOfWeek === 6 ? '18:00' : '19:30';
  const generated = generateSlots(date, '09:00', endTime, durationMinutes, 30);
  const slots = generated.length > 0
    ? generated.map((s) => s.time)
    : DEFAULT_SLOTS.filter((t) => t <= endTime);

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