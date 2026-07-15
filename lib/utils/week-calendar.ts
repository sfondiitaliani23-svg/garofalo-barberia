import { addDays, differenceInMinutes, format, parseISO, startOfWeek } from 'date-fns';
import { SITE_CONFIG } from '@/lib/site-config';
import { isShopDateFullyBlocked, type TimeOffRow } from '@/lib/utils/barber-absence';
import { getDayClosingTime as getClosingForDay, isSlotWithinShopHours } from '@/lib/utils/shop-hours';

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
    '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
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

      if (blockedDays.has(key)) {
        row.push({ type: 'unavailable', day });
        continue;
      }

      if (!isSlotWithinHours(day, time)) {
        row.push({ type: 'closed', day });
        continue;
      }

      const aptsAtSlot = confirmed.filter((a) => {
        const aptDate = format(parseISO(a.starts_at), 'yyyy-MM-dd');
        const aptTime = format(parseISO(a.starts_at), 'HH:mm');
        return aptDate === key && aptTime === time;
      });

      if (aptsAtSlot.length > 0) {
        let maxSpan = 1;
        for (const apt of aptsAtSlot) {
          const starts = parseISO(apt.starts_at);
          const ends = parseISO(apt.ends_at);
          const actualDuration = differenceInMinutes(ends, starts);
          const span = durationToRowSpan(actualDuration);
          if (span > maxSpan) maxSpan = span;
        }

        for (let i = 0; i < maxSpan; i++) {
          const slotTime = timeSlots[timeSlots.indexOf(time) + i];
          if (slotTime) dayCovered.add(slotTime);
        }

        row.push({ 
          type: 'appointment', 
          day, 
          appointment: aptsAtSlot[0], 
          appointmentsList: aptsAtSlot, 
          rowSpan: maxSpan 
        } as any);
        continue;
      }

      row.push({ type: 'empty', day, time });
    }

    return row;
  });

  return rows;
}
