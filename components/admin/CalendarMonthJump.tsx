'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import { getWeekStart } from '@/lib/utils/week-calendar';
import { getBookingMonthOptions } from '@/lib/utils/booking-months';
import { SITE_CONFIG } from '@/lib/site-config';

interface CalendarMonthJumpProps {
  currentWeekStart: Date;
}

export function CalendarMonthJump({ currentWeekStart }: CalendarMonthJumpProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const monthOptions = getBookingMonthOptions();
  const currentMonth = format(currentWeekStart, 'yyyy-MM');

  function jumpToWeek(date: Date) {
    const week = getWeekStart(date);
    startTransition(() => {
      router.push(`/admin/prenotazioni?week=${format(week, 'yyyy-MM-dd')}`);
    });
  }

  function handleMonthChange(monthValue: string) {
    if (!monthValue) return;
    const [year, month] = monthValue.split('-').map(Number);
    jumpToWeek(new Date(year, month - 1, 1));
  }

  function handleDateChange(dateValue: string) {
    if (!dateValue) return;
    jumpToWeek(parseISO(dateValue));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#111] px-3 py-2">
        <Calendar size={16} className="text-gold" />
        <label htmlFor="calendar-month" className="text-xs text-white/50">Mese</label>
        <select
          id="calendar-month"
          value={currentMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="bg-transparent text-sm font-medium text-white outline-none"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value} className="bg-[#111]">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#111] px-3 py-2">
        <label htmlFor="calendar-date" className="text-xs text-white/50">Vai al giorno</label>
        <input
          id="calendar-date"
          type="date"
          min={format(new Date(), 'yyyy-MM-dd')}
          max={SITE_CONFIG.bookingEndDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-transparent text-sm text-white outline-none [color-scheme:dark]"
        />
      </div>
    </div>
  );
}