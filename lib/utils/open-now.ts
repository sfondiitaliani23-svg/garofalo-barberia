import { SITE_CONFIG } from '@/lib/site-config';

/**
 * "Aperto ora": funzione pura, usa gli orari pubblici del sito
 * (SITE_CONFIG.detailedHours, gli stessi mostrati in Contatti) e il fuso Europe/Rome.
 */
export type Period = { start: string; end: string };

const DAY_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export function publicPeriodsForDay(dow: number): Period[] {
  const row = SITE_CONFIG.detailedHours.find((h) => h.day === DAY_IT[dow]);
  if (!row || /chius/i.test(row.time)) return [];
  return row.time.split('·').map((chunk) => {
    const [start, end] = chunk.split(/[–-]/).map((s) => s.trim());
    return { start, end };
  });
}

export function romeClock(now: Date): { dow: number; hhmm: string; date: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { dow, hhmm: `${hour}:${get('minute')}`, date: `${get('year')}-${get('month')}-${get('day')}` };
}

export type OpenStatus = {
  open: boolean;
  /** Frase breve, es. "Aperto · chiude alle 20:30" */
  label: string;
  /** true se chiude o apre entro 30 minuti */
  soon: boolean;
};

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * closedDates: giorni (YYYY-MM-DD, ora di Roma) in cui il salone è chiuso
 * per ferie o chiusura straordinaria.
 */
export function getOpenStatus(now: Date, closedDates: string[] = []): OpenStatus {
  const { dow, hhmm, date } = romeClock(now);
  const closedToday = closedDates.includes(date);
  const today = closedToday ? [] : publicPeriodsForDay(dow);

  const current = today.find((p) => hhmm >= p.start && hhmm < p.end);
  if (current) {
    const left = minutes(current.end) - minutes(hhmm);
    return { open: true, soon: left <= 30, label: `Aperto · chiude alle ${current.end}` };
  }

  const later = today.find((p) => hhmm < p.start);
  if (later) {
    const wait = minutes(later.start) - minutes(hhmm);
    return { open: false, soon: wait <= 30, label: `Chiuso · apre alle ${later.start}` };
  }

  for (let i = 1; i <= 14; i++) {
    const next = new Date(now.getTime() + i * 86_400_000);
    const c = romeClock(next);
    if (closedDates.includes(c.date)) continue;
    const periods = publicPeriodsForDay(c.dow);
    if (periods.length > 0) {
      const when = i === 1 ? 'domani' : DAY_IT[c.dow].toLowerCase();
      return { open: false, soon: false, label: `Chiuso · apre ${when} alle ${periods[0].start}` };
    }
  }
  return { open: false, soon: false, label: 'Chiuso' };
}
