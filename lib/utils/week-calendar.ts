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
  const slots: string[] = [];
  for (let hour = 9; hour <= 19; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 19 && minute === 30) {
        slots.push('19:30');
        break;
      }
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
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

export function buildWeekGrid(
  days: Date[],
  timeSlots: string[],
  appointments: CalendarAppointment[],
  barberId: string,
  timeOff: TimeOffRow[] = []
): GridCell[][] {
  const blockedDays = new Set(
    days
      .filter((day) => isShopDateFullyBlocked(dateKey(day), barberId, timeOff))
      .map((day) => dateKey(day))
  );
  const confirmed = appointments.filter(
    (apt) => apt.barber_id === barberId && apt.status === 'confirmed'
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

      const apt = confirmed.find((a) => {
        const aptDate = format(parseISO(a.starts_at), 'yyyy-MM-dd');
        const aptTime = format(parseISO(a.starts_at), 'HH:mm');
        return aptDate === key && aptTime === time;
      });

      if (apt) {
        const starts = parseISO(apt.starts_at);
        const ends = parseISO(apt.ends_at);
        const actualDuration = differenceInMinutes(ends, starts);
        const span = durationToRowSpan(actualDuration);
        for (let i = 0; i < span; i++) {
          const slotTime = timeSlots[timeSlots.indexOf(time) + i];
          if (slotTime) dayCovered.add(slotTime);
        }
        row.push({ type: 'appointment', day, appointment: apt, rowSpan: span });
        continue;
      }

      row.push({ type: 'empty', day, time });
    }

    return row;
  });

  return rows;
}