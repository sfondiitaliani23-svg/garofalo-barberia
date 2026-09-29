'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { groupDatesByMonth } from '@/lib/utils/booking-months';

interface MonthDatePickerProps {
  dates: string[];
  selectedDate: string | null;
  selectedDates?: string[];
  onSelectDate: (date: string) => void;
  onToggleDate?: (date: string) => void;
  loading?: boolean;
}

export function MonthDatePicker({
  dates,
  selectedDate,
  selectedDates,
  onSelectDate,
  onToggleDate,
  loading,
}: MonthDatePickerProps) {
  const sortedDates = useMemo(() => [...dates].sort(), [dates]);
  const monthOptions = useMemo(() => groupDatesByMonth(sortedDates), [sortedDates]);

  const [activeMonth, setActiveMonth] = useState<string | null>(() => {
    if (selectedDate) return selectedDate.slice(0, 7);
    if (sortedDates.length > 0) return sortedDates[0].slice(0, 7);
    return null;
  });

  const daysContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const monthRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialScrollDoneRef = useRef(false);

  // Sincronizza il mese attivo e seleziona il primo giorno disponibile se non c'è selezione
  useEffect(() => {
    if (sortedDates.length === 0) {
      setActiveMonth(null);
      return;
    }

    if (!selectedDate || !sortedDates.includes(selectedDate)) {
      const firstDate = sortedDates[0];
      if (onSelectDate) {
        onSelectDate(firstDate);
      }
      setActiveMonth(firstDate.slice(0, 7));
      return;
    }

    const month = selectedDate.slice(0, 7);
    setActiveMonth(month);
  }, [sortedDates, selectedDate, onSelectDate]);

  // All'avvio se è selezionata una data (es. dopo il caricamento), allinea lo scroll
  useEffect(() => {
    if (selectedDate && !initialScrollDoneRef.current && sortedDates.length > 0) {
      const targetEl = dayRefs.current.get(selectedDate);
      if (targetEl) {
        initialScrollDoneRef.current = true;
        targetEl.scrollIntoView({
          behavior: 'auto',
          inline: 'start',
          block: 'nearest',
        });
      }
    }
  }, [selectedDate, sortedDates]);

  // Assicura che il chip del mese attivo rimanga visibile se la riga dei mesi scorre
  useEffect(() => {
    if (!activeMonth) return;
    const btn = monthRefs.current.get(activeMonth);
    if (btn) {
      btn.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [activeMonth]);

  // Click su un tab Mese: diventa una scorciatoia che scorre al primo giorno del mese e lo seleziona
  const handleMonthClick = (monthValue: string) => {
    setActiveMonth(monthValue);

    const firstDateInMonth = sortedDates.find((d) => d.startsWith(monthValue));
    if (!firstDateInMonth) return;

    if (onToggleDate) {
      onToggleDate(firstDateInMonth);
    } else {
      onSelectDate(firstDateInMonth);
    }

    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }

    const targetEl = dayRefs.current.get(firstDateInMonth);
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    }

    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 700);
  };

  // Click su un chip giorno
  const handleDayClick = (d: string) => {
    if (onToggleDate) {
      onToggleDate(d);
    } else {
      onSelectDate(d);
    }
    const month = d.slice(0, 7);
    setActiveMonth(month);
  };

  // Rilevamento dello scroll manuale per aggiornare automaticamente il tab mese attivo
  const handleDaysScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = daysContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const threshold = containerRect.left + 28;

    for (const d of sortedDates) {
      const el = dayRefs.current.get(d);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.right >= threshold) {
          const visibleMonth = d.slice(0, 7);
          setActiveMonth((prev) => (prev === visibleMonth ? prev : visibleMonth));
          break;
        }
      }
    }
  }, [sortedDates]);

  useEffect(() => {
    const container = daysContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleDaysScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleDaysScroll);
    };
  }, [handleDaysScroll]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-white/50">Caricamento giorni disponibili...</p>;
  }

  if (sortedDates.length === 0) {
    return <p className="text-sm text-white/50">Nessun giorno disponibile al momento.</p>;
  }

  return (
    <div className="space-y-4">
      {/* 1. Riga MESE: scorciatoie con smooth scroll */}
      {monthOptions.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Mese</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {monthOptions.map((month) => {
              const isActive = activeMonth === month.value;
              return (
                <button
                  key={month.value}
                  ref={(el) => {
                    if (el) monthRefs.current.set(month.value, el);
                    else monthRefs.current.delete(month.value);
                  }}
                  type="button"
                  onClick={() => handleMonthClick(month.value)}
                  className={cn(
                    'flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition cursor-pointer select-none',
                    isActive
                      ? 'border-gold bg-gold/15 text-gold font-semibold shadow-[0_0_12px_rgba(212,175,55,0.18)]'
                      : 'border-white/15 bg-[#1a1a1a] text-white/60 hover:border-gold/40 hover:text-white'
                  )}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Riga GIORNO: striscia UNICA e continua di tutti i giorni prenotabili */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Giorno</p>
        <div
          ref={daysContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth"
        >
          {sortedDates.map((d, index) => {
            const isSelected = selectedDates ? selectedDates.includes(d) : selectedDate === d;
            const parsed = parseISO(d);
            const dayOfWeek = format(parsed, 'EEE', { locale: it });
            const dayAndMonth = format(parsed, 'd MMM', { locale: it });
            const isFirstOfNewMonth = index > 0 && d.slice(0, 7) !== sortedDates[index - 1].slice(0, 7);

            return (
              <Fragment key={d}>
                {isFirstOfNewMonth && (
                  <div
                    className="flex flex-shrink-0 items-center px-1.5 self-stretch"
                    aria-hidden="true"
                    title={`Inizio ${format(parsed, 'MMMM yyyy', { locale: it })}`}
                  >
                    <div className="h-10 w-px bg-gradient-to-b from-white/5 via-gold/40 to-white/5" />
                  </div>
                )}
                <button
                  ref={(el) => {
                    if (el) dayRefs.current.set(d, el);
                    else dayRefs.current.delete(d);
                  }}
                  type="button"
                  onClick={() => handleDayClick(d)}
                  className={cn(
                    'flex-shrink-0 min-w-[72px] rounded-lg border px-4 py-2.5 text-center transition cursor-pointer select-none',
                    isSelected
                      ? 'border-gold bg-gold/10 text-white shadow-[0_0_14px_rgba(212,175,55,0.2)]'
                      : 'border-white/15 bg-[#1a1a1a] text-white hover:border-gold/40'
                  )}
                >
                  <span
                    className={cn(
                      'block text-[11px] font-semibold uppercase tracking-wider',
                      isSelected ? 'text-gold' : 'text-white/50'
                    )}
                  >
                    {dayOfWeek}
                  </span>
                  <span className="block text-sm font-bold text-white mt-0.5 whitespace-nowrap">
                    {dayAndMonth}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}