import { addDays, parseISO } from 'date-fns';

/** DST approssimato per l'Italia (ultima domenica mar–ott). */
export function isItalySummerTime(dateStr: string): boolean {
  const month = Number(dateStr.slice(5, 7));
  return month > 3 && month < 11;
}

/** Giorno della settimana (0–6) da una data calendario YYYY-MM-DD. */
export function getShopDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

/** Limiti del giorno di salone in UTC (mezzanotte–mezzanotte Europe/Rome). */
export function getShopDayBounds(dateStr: string): { dayStart: Date; dayEnd: Date } {
  const dayStart = parseBookingDateTime(dateStr, '00:00');
  return { dayStart, dayEnd: addDays(dayStart, 1) };
}

const SHOP_TIMEZONE = 'Europe/Rome';

/** Formatta un istante come orario HH:mm del salone (Europe/Rome). */
export function formatShopTimeFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('it-IT', {
    timeZone: SHOP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** Formatta un istante come orario HH:mm del salone (Europe/Rome). */
export function formatShopTime(date: Date, _dateStr?: string): string {
  return formatShopTimeFromDate(date);
}

/** Data estesa in italiano nel fuso del salone (es. martedì 14 luglio 2026). */
export function formatShopDateLong(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: SHOP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShopBookingDateTime(date: Date): { dateStr: string; timeStr: string } {
  return {
    dateStr: formatShopDateLong(date),
    timeStr: formatShopTimeFromDate(date),
  };
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