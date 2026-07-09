import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { SITE_CONFIG } from '@/lib/site-config';

export interface MonthOption {
  value: string;
  label: string;
}

export function getBookingMonthOptions(): MonthOption[] {
  const start = startOfMonth(new Date());
  const end = startOfMonth(parseISO(SITE_CONFIG.bookingEndDate));
  const options: MonthOption[] = [];
  let cursor = start;

  while (cursor <= end) {
    const label = format(cursor, 'MMMM yyyy', { locale: it });
    options.push({
      value: format(cursor, 'yyyy-MM'),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
    cursor = addMonths(cursor, 1);
  }

  return options;
}

export function groupDatesByMonth(dates: string[]): MonthOption[] {
  const months = new Set<string>();
  for (const d of dates) months.add(d.slice(0, 7));

  return Array.from(months)
    .sort()
    .map((value) => {
      const label = format(parseISO(`${value}-01`), 'MMMM yyyy', { locale: it });
      return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
}

export function filterDatesByMonth(dates: string[], month: string): string[] {
  return dates.filter((d) => d.startsWith(month));
}