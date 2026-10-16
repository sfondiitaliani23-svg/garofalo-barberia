'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { dfLocale } from '@/lib/i18n/content-booking';
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
  const lang = useLang();
  const locale = dfLocale(lang);
  const sortedDates = useMemo(() => [...dates].sort(), [dates]);
  const monthOptions = useMemo(() => groupDatesByMonth(sortedDates, lang), [sortedDates, lang]);

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
    return <p className="text-sm text-white/50">{L(lang, 'Caricamento giorni disponibili...', 'Loading available days...')}</p>;
  }

  if (sortedDates.length === 0) {
    return <p className="text-sm text-white/50">{L(lang, 'Nessun giorno disponibile al momento.', 'No days available at the moment.')}</p>;
  }

  return (
    <div className="space-y-4">
      {/* 1. Riga MESE: scorciatoie con smooth scroll */}
      {monthOptions.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{L(lang, 'Mese', 'Month')}</p>
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
                    'flex-shrink-0 border-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition cursor-pointer select-none',
                    isActive
                      ? 'border-gold bg-gold text-black'
                      : 'border-gold/30 bg-black/25 text-white/70 hover:border-gold hover:text-white'
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{L(lang, 'Giorno', 'Day')}</p>
        <div
          ref={daysContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth"
        >
          {sortedDates.map((d, index) => {
            const isSelected = selectedDates ? selectedDates.includes(d) : selectedDate === d;
            const parsed = parseISO(d);
            const dayOfWeek = format(parsed, 'EEE', { locale });
                        const isFirstOfNewMonth = index > 0 && d.slice(0, 7) !== sortedDates[index - 1].slice(0, 7);

            return (
              <Fragment key={d}>
                {isFirstOfNewMonth && (
                  <div
                    className="flex flex-shrink-0 items-center px-1.5 self-stretch"
                    aria-hidden="true"
                    title={L(lang, `Inizio ${format(parsed, 'MMMM yyyy', { locale })}`, `Start of ${format(parsed, 'MMMM yyyy', { locale })}`)}
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
                    'flex-shrink-0 w-[74px] overflow-hidden border-2 text-center transition cursor-pointer select-none',
                    isSelected
                      ? 'border-gold bg-gold text-black'
                      : 'border-gold/30 bg-black/25 text-white hover:border-gold'
                  )}
                >
                  <span
                    className={cn(
                      'block py-1 text-[10px] font-bold uppercase tracking-[0.2em]',
                      isSelected ? 'bg-[#f3e6c8] text-black' : 'bg-gold text-black'
                    )}
                  >
                    {dayOfWeek}
                  </span>
                  <span className="block pt-1.5 font-display text-[28px] leading-none">
                    {format(parsed, 'd')}
                  </span>
                  <span className="block pb-2 pt-0.5 text-[10px] uppercase tracking-[0.2em]">
                    {format(parsed, 'MMM', { locale })}
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