'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { CalendarRange, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { parseBookingDateTime } from '@/lib/utils/booking-datetime';
import { buildBarberSchedule, type AdminDayScheduleInput } from '@/lib/utils/barber-schedule';
import { cn } from '@/lib/utils';
import type { Barber, BarberAvailability, BarberTimeOff } from '@/types/database';

const WEEK = [
  { value: 1, label: 'Lun', fixedClosed: true },
  { value: 2, label: 'Mar', fixedClosed: false },
  { value: 3, label: 'Mer', fixedClosed: false },
  { value: 4, label: 'Gio', fixedClosed: false },
  { value: 5, label: 'Ven', fixedClosed: false },
  { value: 6, label: 'Sab', fixedClosed: false },
  { value: 0, label: 'Dom', fixedClosed: true },
] as const;

type Cell =
  | { kind: 'closed' }
  | { kind: 'off'; reason: string }
  | { kind: 'shift'; periods: { start: string; end: string; cut?: boolean }[]; note?: string };

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** Turno reale del barbiere in una data: orario settimanale meno ferie e mezze giornate. */
function cellFor(
  barberId: string,
  date: string,
  dow: number,
  schedule: AdminDayScheduleInput[],
  timeOff: BarberTimeOff[]
): Cell {
  const day = WEEK.find((w) => w.value === dow)!;
  if (day.fixedClosed) return { kind: 'closed' };
  const row = schedule.find((s) => s.dayOfWeek === dow);
  const base = [row?.morning, row?.afternoon]
    .filter((p): p is NonNullable<typeof p> => !!p && p.enabled && p.startTime < p.endTime)
    .map((p) => ({ start: p.startTime, end: p.endTime }));
  if (base.length === 0) return { kind: 'closed' };

  const offs = timeOff.filter((t) => t.barber_id === null || t.barber_id === barberId);
  const periods: { start: string; end: string; cut?: boolean }[] = [];
  let note: string | undefined;
  for (const p of base) {
    const ps = parseBookingDateTime(date, p.start).getTime();
    const pe = parseBookingDateTime(date, p.end).getTime();
    const hit = offs.find((t) => new Date(t.start_at).getTime() < pe && new Date(t.end_at).getTime() > ps);
    if (!hit) {
      periods.push(p);
      continue;
    }
    note = hit.reason || 'Assenza';
    const os = new Date(hit.start_at).getTime();
    const oe = new Date(hit.end_at).getTime();
    // Parte del turno ancora libera prima o dopo l'assenza
    if (os > ps) periods.push({ start: p.start, end: new Date(os).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }), cut: true });
    else if (oe < pe) periods.push({ start: new Date(oe).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }), end: p.end, cut: true });
  }
  if (periods.length === 0) return { kind: 'off', reason: note ?? 'Assenza' };
  return { kind: 'shift', periods, note };
}

export function TeamWeekGrid({
  barbers,
  availability,
  timeOff,
  onEdit,
}: {
  barbers: Barber[];
  availability: BarberAvailability[];
  timeOff: BarberTimeOff[];
  onEdit: (barberId: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );
  const todayKey = ymd(new Date());
  const active = barbers.filter((b) => b.is_active);
  const schedules = useMemo(
    () => new Map(active.map((b) => [b.id, buildBarberSchedule(b.id, availability, WEEK)])),
    [active, availability]
  );

  const shift = (weeks: number) =>
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + weeks * 7);
      return d;
    });
  const rangeLabel = `${days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <section aria-labelledby="team-grid-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="team-grid-title" className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Turni e disponibilità
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Orari reali di ogni barbiere, con ferie e mezze giornate. Le modifiche aggiornano subito le prenotazioni online.
          </p>
        </div>
        <a
          href="#modifica-turni"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light"
        >
          <Pencil size={15} aria-hidden />
          Modifica turni
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => shift(-1)} className="rounded-lg border border-white/12 p-2 text-white/70 hover:border-gold/50 hover:text-gold" aria-label="Settimana precedente">
          <ChevronLeft size={16} />
        </button>
        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/12 bg-[#0f0f0f] px-3 text-sm text-white/85">
          <CalendarRange size={14} className="text-gold" aria-hidden />
          {rangeLabel}
        </span>
        <button type="button" onClick={() => shift(1)} className="rounded-lg border border-white/12 p-2 text-white/70 hover:border-gold/50 hover:text-gold" aria-label="Settimana successiva">
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(mondayOf(new Date()))}
          className="ml-1 rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-black"
        >
          Questa settimana
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0c0c0c]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/45">
              <th className="w-[220px] px-4 py-3 text-left font-semibold">Professionista</th>
              {days.map((d, i) => {
                const isToday = ymd(d) === todayKey;
                return (
                  <th key={i} className={cn('px-2 py-3 text-center font-semibold', isToday && 'text-gold')}>
                    {WEEK[i].label} {d.getDate()}
                  </th>
                );
              })}
              <th className="w-10" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {active.map((b) => (
              <tr key={b.id} className="border-b border-white/5">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {b.image_url ? (
                      <Image src={b.image_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-gold/30 object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-[11px] font-bold text-gold">
                        {initials(b.name)}
                      </span>
                    )}
                    <span>
                      <span className="block font-semibold text-white">{b.name}</span>
                      <span className="block text-[11px] text-white/45">{b.role}</span>
                    </span>
                  </div>
                </td>
                {days.map((d, i) => {
                  const c = cellFor(b.id, ymd(d), d.getDay(), schedules.get(b.id) ?? [], timeOff);
                  const isToday = ymd(d) === todayKey;
                  return (
                    <td key={i} className="px-1.5 py-2 text-center">
                      {c.kind === 'closed' ? (
                        <span className="flex h-12 items-center justify-center rounded-md border border-white/5 text-[11px] text-white/30">Chiuso</span>
                      ) : c.kind === 'off' ? (
                        <span
                          className="flex h-12 flex-col items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1 text-[11px] font-semibold text-amber-300"
                          title={c.reason}
                        >
                          Assente
                          <span className="max-w-full truncate text-[10px] font-normal text-amber-200/70">{c.reason}</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] tabular-nums',
                            isToday ? 'border-gold/50 bg-gold/15 text-white' : 'border-gold/20 bg-gold/[0.07] text-white/85',
                            c.note && 'border-amber-500/40'
                          )}
                          title={c.note ? `Modificato: ${c.note}` : undefined}
                        >
                          {c.periods.map((p, k) => (
                            <span key={k} className={cn(p.cut && 'text-amber-300')}>
                              {p.start} - {p.end}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="pr-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(b.id)}
                    className="rounded-md p-2 text-white/50 transition hover:bg-white/5 hover:text-gold"
                    title={`Modifica turni di ${b.name}`}
                    aria-label={`Modifica turni di ${b.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-gold/30 bg-gold/15" aria-hidden />In servizio</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-amber-500/40 bg-amber-500/10" aria-hidden />Ferie, assenza o turno ridotto (orario in arancio)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-white/10" aria-hidden />Chiuso</span>
      </div>
    </section>
  );
}
