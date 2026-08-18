import { addDays, addMinutes, differenceInMinutes, format, parseISO, startOfWeek } from 'date-fns';
import { SITE_CONFIG } from '@/lib/site-config';
import { filterTimeOffForBarber, isShopDateFullyBlocked, type TimeOffRow } from '@/lib/utils/barber-absence';
import { getDayClosingTime as getClosingForDay, isSlotWithinShopHours } from '@/lib/utils/shop-hours';
import { getShopDateString, getShopTimeString, parseBookingDateTime } from '@/lib/utils/booking-datetime';

export const WORKING_DAY_OFFSETS = [1, 2, 3, 4, 5]; // Mar–Sab dalla settimana che inizia lunedì

export interface CalendarAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  barber_id: string;
  service_id: string;
  barber?: { name: string } | null;
  service?: { name: string; duration_minutes: number; price_cents: number } | null;
}

export type GridCell =
  | { type: 'time'; time: string }
  | { type: 'closed'; day: Date }
  | { type: 'unavailable'; day: Date }
  | { type: 'empty'; day: Date; time: string }
  | { type: 'skip' }
  | { type: 'appointment'; day: Date; appointment: CalendarAppointment; rowSpan: number };

export function getWeekStart(date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWorkingDays(weekStart: Date): Date[] {
  return WORKING_DAY_OFFSETS.map((offset) => addDays(weekStart, offset));
}

export function generateCalendarTimeSlots(): string[] {
  return [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
  ];
}

export function getDayClosingTime(day: Date): string {
  return getClosingForDay(day.getDay());
}

export function isSlotWithinHours(day: Date, time: string): boolean {
  return isSlotWithinShopHours(day, time);
}

export function dateKey(day: Date): string {
  return format(day, 'yyyy-MM-dd');
}

export function durationToRowSpan(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / SITE_CONFIG.slotIntervalMinutes));
}

export function isSalonDateFullyBlocked(
  dateStr: string,
  timeOff: TimeOffRow[],
  barbers: { id: string }[]
): boolean {
  if (barbers.length === 0) return false;
  return barbers.every((b) => isShopDateFullyBlocked(dateStr, b.id, timeOff));
}

export function buildWeekGrid(
  days: Date[],
  timeSlots: string[],
  appointments: CalendarAppointment[],
  barberId: string,
  timeOff: TimeOffRow[] = [],
  barbers: { id: string }[] = []
): GridCell[][] {
  const isAll = barberId === 'all';

  const blockedDays = new Set(
    days
      .filter((day) => {
        if (isAll) {
          return isSalonDateFullyBlocked(dateKey(day), timeOff, barbers);
        } else {
          return isShopDateFullyBlocked(dateKey(day), barberId, timeOff);
        }
      })
      .map((day) => dateKey(day))
  );

  const confirmed = appointments.filter(
    (apt) => (isAll || apt.barber_id === barberId) && apt.status === 'confirmed'
  );

  const covered = new Map<string, Set<string>>();

  for (const day of days) {
    covered.set(dateKey(day), new Set());
  }

  const rows: GridCell[][] = timeSlots.map((time) => {
    const row: GridCell[] = [{ type: 'time', time }];

    for (const day of days) {
      const key = dateKey(day);
      const dayCovered = covered.get(key)!;

      if (dayCovered.has(time)) {
        row.push({ type: 'skip' });
        continue;
      }

      // Trova gli appuntamenti che iniziano in questo slot
      const aptsAtSlot = confirmed.filter((a) => {
        const dStart = new Date(a.starts_at);
        const aptDate = getShopDateString(dStart);
        const aptTime = getShopTimeString(dStart);

        if (aptDate !== key) return false;

        // Se l'orario di inizio corrisponde direttamente al time dello slot
        if (aptTime === time) return true;

        // Se l'appuntamento inizia nell'intervallo di questo slot (es. 10:15 in uno slot da 10:00-10:30)
        const slotStart = parseBookingDateTime(key, time);
        const slotEnd = addMinutes(slotStart, SITE_CONFIG.slotIntervalMinutes);
        return dStart >= slotStart && dStart < slotEnd;
      });

      if (aptsAtSlot.length > 0) {
        let maxSpan = 1;
        if (!isAll) {
          for (const apt of aptsAtSlot) {
            const starts = new Date(apt.starts_at);
            const ends = new Date(apt.ends_at);
            const actualDuration = differenceInMinutes(ends, starts);
            const span = durationToRowSpan(actualDuration);
            if (span > maxSpan) maxSpan = span;
          }

          if (maxSpan > 1) {
            for (let i = 1; i < maxSpan; i++) {
              const nextIndex = timeSlots.indexOf(time) + i;
              const slotTime = timeSlots[nextIndex];
              if (slotTime) {
                // Non coprire se c'è un'altra prenotazione che inizia lì
                const hasAptNext = confirmed.some((a) => {
                  const d = new Date(a.starts_at);
                  return getShopDateString(d) === key && getShopTimeString(d) === slotTime;
                });
                if (!hasAptNext) {
                  dayCovered.add(slotTime);
                }
              }
            }
          }
        }

        row.push({ 
          type: 'appointment', 
          day, 
          appointment: aptsAtSlot[0], 
          appointmentsList: aptsAtSlot, 
          rowSpan: isAll ? 1 : maxSpan 
        } as any);
        continue;
      }

      if (blockedDays.has(key)) {
        row.push({ type: 'unavailable', day });
        continue;
      }

      if (!isSlotWithinHours(day, time)) {
        row.push({ type: 'closed', day });
        continue;
      }

      if (isSlotBlockedByTimeOff(key, time, barberId, timeOff, barbers)) {
        row.push({ type: 'unavailable', day });
        continue;
      }

      row.push({ type: 'empty', day, time });
    }

    return row;
  });

  return rows;
}

export function isSlotBlockedByTimeOff(
  dateStr: string,
  timeStr: string,
  barberId: string,
  timeOff: TimeOffRow[],
  barbers: { id: string }[] = []
): boolean {
  const slotStart = parseBookingDateTime(dateStr, timeStr);
  const slotEnd = addMinutes(slotStart, SITE_CONFIG.slotIntervalMinutes);

  const isBarberBlocked = (bId: string) => {
    return timeOff.some((block) => {
      if (block.barber_id !== null && block.barber_id !== undefined && block.barber_id !== bId) {
        return false;
      }
      const blockStart = new Date(block.start_at);
      const blockEnd = new Date(block.end_at);
      return slotStart < blockEnd && slotEnd > blockStart;
    });
  };

  // Se c'è un blocco globale per l'intero salone (barber_id è null o undefined)
  const isGlobalBlocked = timeOff.some((block) => {
    if (block.barber_id !== null && block.barber_id !== undefined) return false;
    const blockStart = new Date(block.start_at);
    const blockEnd = new Date(block.end_at);
    return slotStart < blockEnd && slotEnd > blockStart;
  });

  if (isGlobalBlocked) return true;

  if (barberId === 'all') {
    if (barbers.length === 0) return false;
    // In vista "Tutti i barbieri", lo slot è bloccato solo se TUTTI i barbieri sono assenti/bloccati
    return barbers.every((b) => isBarberBlocked(b.id));
  }

  return isBarberBlocked(barberId);
}
