'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekStart } from '@/lib/utils/week-calendar';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

interface WeekMonthPickerProps {
  weekStart: Date;
  weekLabel: string;
}

export function WeekMonthPicker({ weekStart, weekLabel }: WeekMonthPickerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(weekStart));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMonth(startOfMonth(weekStart));
  }, [weekStart]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const monthStart = startOfMonth(viewMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  function goToWeek(date: Date) {
    const nextWeek = getWeekStart(date);
    setOpen(false);
    startTransition(() => {
      router.push(`/admin/prenotazioni?week=${format(nextWeek, 'yyyy-MM-dd')}`);
    });
  }

  function goToToday() {
    goToWeek(new Date());
  }

  function isInSelectedWeek(day: Date) {
    const selectedStart = getWeekStart(weekStart);
    const selectedEnd = endOfWeek(selectedStart, { weekStartsOn: 1 });
    return day >= selectedStart && day <= selectedEnd;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition',
          open
            ? 'border-gold bg-gold/10 text-gold'
            : 'border-gold/60 text-gold hover:border-gold hover:bg-gold/10'
        )}
      >
        <span className="capitalize">{weekLabel}</span>
        <ChevronDown size={16} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Seleziona settimana"
          className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-white/10 bg-[#111] p-4 shadow-2xl shadow-black/60"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((month) => subMonths(month, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-gold transition hover:border-gold/50 hover:bg-gold/10"
              aria-label="Mese precedente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold capitalize text-gold">
              {format(viewMonth, 'MMMM yyyy', { locale: it })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-gold transition hover:border-gold/50 hover:bg-gold/10"
              aria-label="Mese successivo"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                {label}
              </span>
            ))}

            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const selectedWeek = isInSelectedWeek(day);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => goToWeek(day)}
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-lg text-sm transition',
                    !inMonth && 'text-white/20 hover:text-white/35',
                    inMonth && !selectedWeek && 'text-white/75 hover:bg-gold/10 hover:text-gold',
                    selectedWeek && 'bg-gold/20 font-semibold text-gold hover:bg-gold/30',
                    today && 'ring-1 ring-gold/70 ring-offset-1 ring-offset-[#111]'
                  )}
                  aria-label={format(day, "EEEE d MMMM yyyy", { locale: it })}
                  aria-current={isSameDay(day, weekStart) ? 'date' : undefined}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10"
            >
              Oggi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}