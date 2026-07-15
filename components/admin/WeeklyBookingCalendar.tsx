'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAppointmentForm } from '@/components/admin/AdminAppointmentForm';
import { WeekMonthPicker } from '@/components/admin/WeekMonthPicker';

import {
  buildWeekGrid,
  generateCalendarTimeSlots,
  getWorkingDays,
  dateKey,
  type CalendarAppointment,
} from '@/lib/utils/week-calendar';
import { cn } from '@/lib/utils';
import type { Barber, BarberTimeOff, Service } from '@/types/database';

interface WeeklyBookingCalendarProps {
  barbers: Barber[];
  services: Service[];
  appointments: CalendarAppointment[];
  timeOff: BarberTimeOff[];
  weekStartIso: string;
  initialBarberId?: string;
}

export function WeeklyBookingCalendar({
  barbers,
  services,
  appointments: initialAppointments,
  timeOff,
  weekStartIso,
  initialBarberId,
}: WeeklyBookingCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const weekStart = new Date(weekStartIso);
  const [barberId, setBarberId] = useState(initialBarberId ?? barbers[0]?.id ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillTime, setPrefillTime] = useState<string | undefined>();

  const days = useMemo(() => getWorkingDays(weekStart), [weekStart]);
  const timeSlots = useMemo(() => generateCalendarTimeSlots(), []);
  const grid = useMemo(
    () => buildWeekGrid(days, timeSlots, initialAppointments, barberId, timeOff),
    [barberId, days, initialAppointments, timeOff, timeSlots]
  );
  const selectedBarber = barbers.find((b) => b.id === barberId);

  function selectBarber(nextBarberId: string) {
    setBarberId(nextBarberId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('barber', nextBarberId);
    startTransition(() => {
      router.replace(`/admin/prenotazioni?${params.toString()}`);
    });
  }

  function openCreate(day: Date, time: string) {
    setSelectedAppointment(null);
    setPrefillDate(dateKey(day));
    setPrefillTime(time);
    setModalOpen(true);
  }

  function openEdit(apt: CalendarAppointment) {
    setSelectedAppointment(apt);
    setPrefillDate(undefined);
    setPrefillTime(undefined);
    setModalOpen(true);
  }

  function handleSaved() {
    startTransition(() => {
      router.refresh();
    });
  }

  const weekLabel = `${format(days[0], 'd MMM', { locale: it })} – ${format(days[days.length - 1], 'd MMM yyyy', { locale: it })}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <WeekMonthPicker weekStart={weekStart} weekLabel={weekLabel} />

        <Button
          onClick={() => {
            setSelectedAppointment(null);
            setPrefillDate(format(new Date(), 'yyyy-MM-dd'));
            setPrefillTime(undefined);
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          Nuova prenotazione
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectBarber('all')}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition',
            barberId === 'all'
              ? 'border-gold bg-gold/15 text-gold'
              : 'border-white/15 text-white/60 hover:border-white/30'
          )}
        >
          Tutti i barbieri 👥
        </button>
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => selectBarber(b.id)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              barberId === b.id
                ? 'border-gold bg-gold/15 text-gold'
                : 'border-white/15 text-white/60 hover:border-white/30'
            )}
          >
            {b.name}
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm text-white/50">
        {barberId === 'all' ? (
          <>Visualizzazione di <strong className="text-gold">Tutti i barbieri</strong> — clicca un appuntamento per modificarlo</>
        ) : (
          <>Calendario di <strong className="text-gold">{selectedBarber?.name}</strong> — clicca uno slot libero per prenotare, o un appuntamento per modificarlo</>
        )}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#0a0a0a]">
              <th className="sticky left-0 z-10 w-16 border-r border-white/10 bg-[#0a0a0a] px-2 py-3 text-xs font-semibold uppercase text-white/50">
                Ora
              </th>
              {days.map((day) => (
                <th key={dateKey(day)} className="min-w-[120px] px-2 py-3 text-center">
                  <span className="block text-xs uppercase text-white/50">
                    {format(day, 'EEE', { locale: it })}
                  </span>
                  <span className="block font-semibold text-gold">
                    {format(day, 'd MMM', { locale: it })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => {
              const timeCell = row[0];
              if (timeCell.type !== 'time') return null;
              const time = timeCell.time;

              return (
                <tr key={time} className="border-b border-white/5">
                  <td className="sticky left-0 z-10 border-r border-white/10 bg-[#0a0a0a] px-2 py-1 text-center text-xs text-white/40">
                    {time}
                  </td>
                  {row.slice(1).map((cell, ci) => {
                    if (cell.type === 'skip') return null;

                    if (cell.type === 'closed' || cell.type === 'unavailable') {
                      return (
                        <td
                          key={ci}
                          className={cn(
                            'px-1 py-1',
                            cell.type === 'unavailable' ? 'bg-[#0d0d0d]' : 'bg-[#0d0d0d]'
                          )}
                        >
                          <div
                            className={cn(
                              'h-10 rounded',
                              cell.type === 'unavailable'
                                ? 'bg-white/[0.03] ring-1 ring-inset ring-white/5'
                                : 'bg-white/[0.02]'
                            )}
                            title={cell.type === 'unavailable' ? 'Non disponibile (ferie o chiusura)' : undefined}
                          />
                        </td>
                      );
                    }

                    if (cell.type === 'appointment') {
                      const list = (cell as any).appointmentsList || [cell.appointment];
                      return (
                        <td key={ci} rowSpan={cell.rowSpan} className="border-l border-white/5 px-1 py-1 align-top space-y-1.5 min-w-[140px]">
                          {list.map((apt: CalendarAppointment) => {
                            const service = apt.service as { name: string } | null;
                            const barber = apt.barber as { name: string } | null;
                            return (
                              <button
                                key={apt.id}
                                type="button"
                                onClick={() => openEdit(apt)}
                                className="flex w-full flex-col rounded-lg border border-gold/40 bg-gold/10 p-2 text-left transition hover:bg-gold/20"
                              >
                                <span className="text-[10px] font-bold text-gold flex items-center justify-between gap-1 w-full">
                                  <span>{time}</span>
                                  {barberId === 'all' && (
                                    <span className="bg-gold/20 text-gold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide truncate max-w-[80px]">
                                      {barber?.name}
                                    </span>
                                  )}
                                </span>
                                <span className="truncate text-xs font-semibold text-white mt-1">{apt.customer_name}</span>
                                <span className="truncate text-[10px] text-white/50">{service?.name}</span>
                                {apt.customer_phone && (
                                  <span className="truncate text-[10px] text-white/40">{apt.customer_phone}</span>
                                )}
                              </button>
                            );
                          })}
                        </td>
                      );
                    }

                    if (cell.type === 'empty') {
                      return (
                        <td key={ci} className="border-l border-white/5 px-1 py-1">
                          <button
                            type="button"
                            onClick={() => openCreate(cell.day, cell.time)}
                            className="flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-white/10 text-white/20 transition hover:border-gold/40 hover:bg-gold/5 hover:text-gold/60"
                            title="Aggiungi prenotazione"
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      );
                    }

                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          Altre prenotazioni della settimana
        </h3>
        <div className="space-y-2">
          {initialAppointments
            .filter((apt) => (barberId === 'all' || apt.barber_id === barberId) && apt.status !== 'confirmed')
            .map((apt) => {
              const service = apt.service as { name: string } | null;
              const statusColors: Record<string, string> = {
                completed: 'text-green-400',
                cancelled: 'text-red-400',
                no_show: 'text-white/40',
              };
              return (
                <div
                  key={apt.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#111] px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{apt.customer_name}</span>
                    <span className="mx-2 text-white/30">·</span>
                    <span className="text-white/60">
                      {format(new Date(apt.starts_at), "d MMM 'alle' HH:mm", { locale: it })}
                    </span>
                    <span className="mx-2 text-white/30">·</span>
                    <span className="text-gold">{service?.name}</span>
                  </div>
                  <span className={`text-xs uppercase ${statusColors[apt.status] ?? ''}`}>{apt.status}</span>
                </div>
              );
            })}
          {initialAppointments.filter((apt) => (barberId === 'all' || apt.barber_id === barberId) && apt.status !== 'confirmed').length === 0 && (
            <p className="text-sm text-white/40">Nessuna prenotazione completata o disdetta in questa settimana.</p>
          )}
        </div>
      </div>

      {modalOpen && (
        <AdminAppointmentForm
          barbers={barbers}
          services={services}
          barberId={barberId === 'all' ? barbers[0].id : barberId}
          appointment={selectedAppointment}
          initialDate={prefillDate}
          initialTime={prefillTime}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}