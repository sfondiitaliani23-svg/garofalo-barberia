import { addMinutes, format, parse, setHours, setMinutes, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';

export interface TimeSlot {
  time: string;
  startsAt: Date;
  endsAt: Date;
}

export interface ExistingAppointment {
  starts_at: string;
  ends_at: string;
}

export interface TimeOffBlock {
  start_at: string;
  end_at: string;
}

export function parseTimeOnDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  return setMinutes(setHours(startOfDay(date), h), m);
}

export function generateSlots(
  date: Date,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  intervalMinutes: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let cursor = parseTimeOnDate(date, startTime);
  const dayEnd = parseTimeOnDate(date, endTime);

  while (addMinutes(cursor, durationMinutes) <= dayEnd) {
    const endsAt = addMinutes(cursor, durationMinutes);
    slots.push({
      time: format(cursor, 'HH:mm'),
      startsAt: new Date(cursor),
      endsAt,
    });
    cursor = addMinutes(cursor, intervalMinutes);
  }

  return slots;
}

export function isSlotBlocked(
  slot: TimeSlot,
  appointments: ExistingAppointment[],
  timeOff: TimeOffBlock[]
): boolean {
  for (const apt of appointments) {
    const aptStart = new Date(apt.starts_at);
    const aptEnd = new Date(apt.ends_at);
    if (slot.startsAt < aptEnd && slot.endsAt > aptStart) return true;
  }

  for (const block of timeOff) {
    const blockStart = new Date(block.start_at);
    const blockEnd = new Date(block.end_at);
    if (slot.startsAt < blockEnd && slot.endsAt > blockStart) return true;
  }

  return false;
}

export function filterAvailableSlots(
  allSlots: TimeSlot[],
  appointments: ExistingAppointment[],
  timeOff: TimeOffBlock[]
): TimeSlot[] {
  return allSlots.filter((slot) => !isSlotBlocked(slot, appointments, timeOff));
}

export function formatItalianDate(date: Date): string {
  return format(date, "EEEE d MMMM yyyy", { locale: it });
}