import { addDays, parseISO } from 'date-fns';

const SHOP_TIMEZONE = 'Europe/Rome';

/**
 * Restituisce l'offset esatto di Europe/Rome ('+01:00' o '+02:00') per una data e un orario specifici.
 * Gestisce con precisione millimetrica l'ora solare (CET / UTC+1) e l'ora legale (CEST / UTC+2),
 * inclusi i passaggi nell'ultima domenica di marzo e nell'ultima domenica di ottobre.
 */
export function getShopTimezoneOffset(dateStr: string, timeStr = '12:00'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.slice(0, 5).split(':').map(Number);
  const baseUtc = new Date(Date.UTC(y, m - 1, d, h, min));

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SHOP_TIMEZONE,
      timeZoneName: 'longOffset',
    }).formatToParts(baseUtc);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart && tzPart.startsWith('GMT')) {
      return tzPart.replace('GMT', ''); // "+01:00" o "+02:00"
    }
  } catch {
    // Fallback
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SHOP_TIMEZONE,
      timeZoneName: 'shortOffset',
    }).formatToParts(baseUtc);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart === 'GMT+2') return '+02:00';
    if (tzPart === 'GMT+1') return '+01:00';
  } catch {
    // Fallback
  }

  return '+01:00';
}

/** Verifica se per una data il salone si trova in ora legale (CEST / UTC+2). */
export function isItalySummerTime(dateStr: string): boolean {
  return getShopTimezoneOffset(dateStr) === '+02:00';
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw new Error('Data o orario non validi');
  }

  const normalizedTime = time.length >= 5 ? time.slice(0, 5) : time;
  const offset = getShopTimezoneOffset(date, normalizedTime);
  const parsed = parseISO(`${date}T${normalizedTime}:00${offset}`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data o orario non validi');
  }

  return parsed;
}

/** Data e ora estese in italiano nel fuso del salone (es. martedì 14 luglio 2026 alle 09:00). */
export function formatShopDateTimeLong(date: Date): string {
  const datePart = formatShopDateLong(date);
  const timePart = formatShopTimeFromDate(date);
  return `${datePart} alle ${timePart}`;
}

/** Data e ora corte in italiano nel fuso del salone (es. martedì 14 luglio alle 09:00). */
export function formatShopDateTimeShort(date: Date): string {
  const datePart = new Intl.DateTimeFormat('it-IT', {
    timeZone: SHOP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const timePart = formatShopTimeFromDate(date);
  return `${datePart} alle ${timePart}`;
}

/** Ottiene la data stringa YYYY-MM-DD nel fuso del salone da una Date. */
export function getShopDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  
  const year = parts.find(p => p.type === 'year')?.value ?? '2026';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/** Ottiene l'ora stringa HH:mm nel fuso del salone da una Date. */
export function getShopTimeString(date: Date): string {
  return formatShopTimeFromDate(date);
}