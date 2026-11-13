import { getShopDayBounds } from '@/lib/utils/booking-datetime';

export interface SpecialOpeningPeriod {
  startTime: string;
  endTime: string;
}

export interface SpecialOpening {
  date: string;
  label: string;
  periods: SpecialOpeningPeriod[];
  closingTime: string;
  /** Prenotabile online da questo giorno (compreso). Senza valore: subito. Dall'admin sempre. */
  bookableFrom?: string;
}

// Orari natalizi 2026 (locandina «Orari natalizi», 13/11/2026). Nei giorni speciali questi orari
// valgono per tutto il salone e sostituiscono i turni settimanali; ferie e chiusure non li bloccano.
// «Da martedì 1 dicembre è possibile prenotare per la settimana natalizia»: 22 e 23 già aperti (richiesta di Luigi).
export const SPECIAL_OPENINGS: SpecialOpening[] = [
  {
    date: '2026-12-20',
    label: 'Apertura straordinaria di Natale (Domenica 20 Dicembre)',
    periods: [{ startTime: '08:30', endTime: '13:30' }],
    closingTime: '13:30',
    bookableFrom: '2026-12-01',
  },
  {
    date: '2026-12-21',
    label: 'Apertura straordinaria di Natale (Lunedì 21 Dicembre)',
    periods: [
      { startTime: '08:30', endTime: '13:00' },
      { startTime: '15:30', endTime: '20:30' },
    ],
    closingTime: '20:30',
    bookableFrom: '2026-12-01',
  },
  {
    date: '2026-12-22',
    label: 'Orario continuato di Natale (Martedì 22 Dicembre)',
    periods: [{ startTime: '08:30', endTime: '20:30' }],
    closingTime: '20:30',
  },
  {
    date: '2026-12-23',
    label: 'Orario continuato di Natale (Mercoledì 23 Dicembre)',
    periods: [{ startTime: '08:30', endTime: '20:30' }],
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
    bookableFrom: '2026-12-01',
  },
  {
    date: '2026-12-31',
    label: 'Orario di San Silvestro (Giovedì 31 Dicembre)',
    periods: [{ startTime: '09:00', endTime: '14:30' }],
    closingTime: '14:30',
    bookableFrom: '2026-12-01',
  },
];

/** Giorni di chiusura del salone (locandina «Orari natalizi»): valgono più di tutto, anche dei giorni sbloccati. */
export const SPECIAL_CLOSURES: string[] = [
  '2026-12-24',
  '2026-12-25',
  '2026-12-26',
  '2026-12-27',
  '2027-01-01',
  '2027-01-02',
  '2027-01-03',
  '2027-01-04',
  '2027-01-05',
  '2027-01-06',
];

export function getSpecialOpening(dateStr?: string | null): SpecialOpening | undefined {
  if (!dateStr) return undefined;
  return SPECIAL_OPENINGS.find((s) => s.date === dateStr);
}

export function isSpecialOpeningDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return SPECIAL_OPENINGS.some((s) => s.date === dateStr);
}

export function isSpecialClosureDate(dateStr?: string | null): boolean {
  return !!dateStr && SPECIAL_CLOSURES.includes(dateStr);
}

/** Il giorno speciale si può già prenotare online? (today = giorno di oggi a Roma, yyyy-MM-dd) */
export function isSpecialOpeningBookable(dateStr: string, today: string): boolean {
  const s = getSpecialOpening(dateStr);
  return !s?.bookableFrom || today >= s.bookableFrom;
}

/** Le chiusure come blocchi del salone (barber_id null), per riusare il calcolo delle ferie. */
export function specialClosureBlocks(): { barber_id: null; start_at: string; end_at: string; reason: string }[] {
  return SPECIAL_CLOSURES.map((d) => {
    const { dayStart, dayEnd } = getShopDayBounds(d);
    return { barber_id: null, start_at: dayStart.toISOString(), end_at: dayEnd.toISOString(), reason: 'Chiuso per le feste' };
  });
}
