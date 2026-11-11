export interface SpecialOpeningPeriod {
  startTime: string;
  endTime: string;
}

export interface SpecialOpening {
  date: string;
  label: string;
  periods: SpecialOpeningPeriod[];
  closingTime: string;
}

export const SPECIAL_OPENINGS: SpecialOpening[] = [
  {
    date: '2026-12-20',
    label: 'Apertura straordinaria di Natale (Domenica 20 Dicembre)',
    periods: [{ startTime: '08:30', endTime: '13:00' }],
    closingTime: '13:00',
  },
  {
    date: '2026-12-21',
    label: 'Apertura straordinaria di Natale (Lunedì 21 Dicembre)',
    periods: [
      { startTime: '08:30', endTime: '13:00' },
      { startTime: '15:30', endTime: '20:30' },
    ],
    closingTime: '20:30',
  },
  {
    date: '2026-12-28',
    label: 'Apertura straordinaria di Natale (Lunedì 28 Dicembre)',
    periods: [
      { startTime: '08:30', endTime: '13:00' },
      { startTime: '15:30', endTime: '20:30' },
    ],
    closingTime: '20:30',
  },
];

export function getSpecialOpening(dateStr?: string | null): SpecialOpening | undefined {
  if (!dateStr) return undefined;
  return SPECIAL_OPENINGS.find((s) => s.date === dateStr);
}

export function isSpecialOpeningDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return SPECIAL_OPENINGS.some((s) => s.date === dateStr);
}
