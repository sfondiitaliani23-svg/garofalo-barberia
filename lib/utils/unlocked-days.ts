// Giorni sbloccati (13/11/2026, richiesta di Luigi): giorni che restano prenotabili
// anche se cadono dentro ferie o chiusure (barber_time_off). Calcoli puri, senza database.
// Elenco salvato in site_content (chiave UNLOCKED_DAYS_KEY, is_active = false). Nessuna migrazione.
import { getShopDayBounds } from '@/lib/utils/booking-datetime';
import type { TimeOffRow } from '@/lib/utils/barber-absence';

export const UNLOCKED_DAYS_KEY = 'prenotazioni:giorni-sbloccati';

/** Valori di partenza finché l'elenco non viene salvato dall'admin: 22 e 23 dicembre 2026 (Luigi, 13/11/2026). */
export const DEFAULT_UNLOCKED_DAYS: string[] = ['2026-12-22', '2026-12-23'];

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Pulisce un elenco: solo date valide, senza doppioni, in ordine. */
export function cleanUnlockedDays(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter(isValidDay))).sort();
}

/** Legge il testo salvato. Nessun salvataggio (null) = valori di partenza. */
export function parseUnlockedDays(body: string | null | undefined): string[] {
  if (body === null || body === undefined) return [...DEFAULT_UNLOCKED_DAYS];
  try {
    return cleanUnlockedDays(JSON.parse(body));
  } catch {
    return [];
  }
}

/**
 * Toglie i giorni sbloccati dalle ferie e chiusure: un blocco che copre un giorno
 * sbloccato viene diviso in un pezzo prima e uno dopo quel giorno.
 */
export function applyUnlockedDays<T extends TimeOffRow>(rows: T[], days: string[]): T[] {
  if (rows.length === 0 || days.length === 0) return rows;
  const cuts = days
    .filter(isValidDay)
    .map((d) => {
      const { dayStart, dayEnd } = getShopDayBounds(d);
      return { start: dayStart.getTime(), end: dayEnd.getTime() };
    })
    .sort((a, b) => a.start - b.start);

  const out: T[] = [];
  for (const row of rows) {
    let pieces: [number, number][] = [[new Date(row.start_at).getTime(), new Date(row.end_at).getTime()]];
    for (const cut of cuts) {
      const next: [number, number][] = [];
      for (const [s, e] of pieces) {
        if (cut.end <= s || cut.start > e) {
          next.push([s, e]);
          continue;
        }
        if (s < cut.start) next.push([s, cut.start - 1]);
        if (e >= cut.end) next.push([cut.end, e]);
      }
      pieces = next;
    }
    for (const [s, e] of pieces) {
      out.push({ ...row, start_at: new Date(s).toISOString(), end_at: new Date(e).toISOString() });
    }
  }
  return out;
}
