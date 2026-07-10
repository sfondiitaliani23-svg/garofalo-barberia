import { parseISO } from 'date-fns';

/** DST approssimato per l'Italia (ultima domenica mar–ott). */
function isItalySummerTime(dateStr: string): boolean {
  const month = Number(dateStr.slice(5, 7));
  return month > 3 && month < 11;
}

/** Interpreta data e ora come orario di salone (Europe/Rome). */
export function parseBookingDateTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Data o orario non validi');
  }

  const offset = isItalySummerTime(date) ? '+02:00' : '+01:00';
  const parsed = parseISO(`${date}T${time}:00${offset}`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data o orario non validi');
  }

  return parsed;
}