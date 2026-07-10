export type TimeOffRow = {
  barber_id: string | null;
  start_at: string;
  end_at: string;
  reason?: string | null;
};

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