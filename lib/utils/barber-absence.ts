import { getShopDayBounds } from '@/lib/utils/booking-datetime';

export type TimeOffRow = {
  barber_id: string | null;
  start_at: string;
  end_at: string;
  reason?: string | null;
};

export function isShopDateFullyBlocked(
  dateStr: string,
  barberId: string,
  timeOff: TimeOffRow[]
): boolean {
  const { dayStart, dayEnd } = getShopDayBounds(dateStr);
  const dayEndInclusive = new Date(dayEnd.getTime() - 1);
  return isDayFullyBlockedByTimeOff(
    dayStart.toISOString(),
    dayEndInclusive.toISOString(),
    timeOff,
    barberId
  );
}

export function filterTimeOffForBarber(timeOff: TimeOffRow[], barberId: string) {
  return timeOff.filter((row) => row.barber_id === barberId || row.barber_id === null);
}

export function isDayFullyBlockedByTimeOff(
  dayStartIso: string,
  dayEndIso: string,
  timeOff: TimeOffRow[],
  barberId: string
): boolean {
  const dayStart = new Date(dayStartIso);
  const dayEnd = new Date(dayEndIso);

  return filterTimeOffForBarber(timeOff, barberId).some((block) => {
    const blockStart = new Date(block.start_at);
    const blockEnd = new Date(block.end_at);
    return blockStart <= dayStart && blockEnd >= dayEnd;
  });
}

export function getAbsenceMessage(reason?: string | null) {
  if (reason?.trim()) {
    return `Non disponibile: ${reason.trim()}`;
  }
  return 'In ferie o assente';
}

export function hasAnyBookableDayBySchedule(
  candidateDates: string[],
  availabilityDays: Set<number>,
  timeOff: TimeOffRow[],
  barberId: string
): { canBook: boolean; reason?: string } {
  if (availabilityDays.size === 0) {
    return { canBook: false, reason: 'Non disponibile' };
  }

  for (const dateStr of candidateDates) {
    const date = new Date(`${dateStr}T12:00:00`);
    if (!availabilityDays.has(date.getDay())) continue;

    if (!isShopDateFullyBlocked(dateStr, barberId, timeOff)) {
      return { canBook: true };
    }
  }

  const block = filterTimeOffForBarber(timeOff, barberId)[0];
  return { canBook: false, reason: getAbsenceMessage(block?.reason) };
}