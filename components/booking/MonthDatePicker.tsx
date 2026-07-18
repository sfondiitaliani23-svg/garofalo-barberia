'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { filterDatesByMonth, groupDatesByMonth } from '@/lib/utils/booking-months';

interface MonthDatePickerProps {
  dates: string[];
  selectedDate: string | null;
  selectedDates?: string[];
  onSelectDate: (date: string) => void;
  onToggleDate?: (date: string) => void;
  loading?: boolean;
}

export function MonthDatePicker({ dates, selectedDate, selectedDates, onSelectDate, onToggleDate, loading }: MonthDatePickerProps) {
  const monthOptions = useMemo(() => groupDatesByMonth(dates), [dates]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (dates.length === 0) {
      setSelectedMonth(null);
      return;
    }
    const fromSelection = selectedDate?.slice(0, 7) ?? null;
    if (fromSelection && dates.some((d) => d.startsWith(fromSelection))) {
      setSelectedMonth(fromSelection);
      return;
    }
    setSelectedMonth(monthOptions[0]?.value ?? null);
  }, [dates, selectedDate, monthOptions]);

  const visibleDates = selectedMonth ? filterDatesByMonth(dates, selectedMonth) : dates;

  if (loading) {
    return <p className="text-sm text-white/50">Caricamento giorni disponibili...</p>;
  }

  if (dates.length === 0) {
    return <p className="text-sm text-white/50">Nessun giorno disponibile al momento.</p>;
  }

  return (
    <div className="space-y-3">
      {monthOptions.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Mese</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                type="button"
                onClick={() => {
                  setSelectedMonth(month.value);
                  const firstInMonth = filterDatesByMonth(dates, month.value)[0];
                  if (firstInMonth) {
                    if (onToggleDate) {
                      onToggleDate(firstInMonth);
                    } else {
                      onSelectDate(firstInMonth);
                    }
                  }
                }}
                className={cn(
                  'flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                  selectedMonth === month.value
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-white/15 bg-[#1a1a1a] text-white/60 hover:border-gold/40'
                )}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Giorno</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visibleDates.map((d) => {
            const isSelected = selectedDates ? selectedDates.includes(d) : selectedDate === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  if (onToggleDate) {
                    onToggleDate(d);
                  } else {
                    onSelectDate(d);
                  }
                }}
                className={cn(
                  'flex-shrink-0 rounded-lg border px-4 py-3 text-center transition',
                  isSelected ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                )}
              >
                <span className="block text-xs uppercase text-white/50">
                  {format(parseISO(d), 'EEE', { locale: it })}
                </span>
                <span className="block font-semibold">{format(parseISO(d), 'd MMM', { locale: it })}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}