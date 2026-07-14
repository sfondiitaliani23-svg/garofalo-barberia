'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { CalendarOff, Clock, Pencil, Plus, Trash2, UserCog, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import {
  deleteAdminBarber,
  deleteAdminTimeOff,
  saveAdminBarber,
  saveAdminBarberSchedule,
  saveAdminTimeOff,
} from '@/lib/actions/admin';
import {
  buildBarberSchedule,
  defaultPeriodsForDay,
  isDayOpen,
  SCHEDULE_PERIOD_LABELS,
  type AdminPeriodInput,
  type SchedulePeriod,
  type AdminDayScheduleInput,
} from '@/lib/utils/barber-schedule';
import { cn } from '@/lib/utils';
import type { Barber, BarberAvailability, BarberTimeOff } from '@/types/database';

const WEEK_DAYS = [
  { value: 1, label: 'Lunedì', fixedClosed: true },
  { value: 2, label: 'Martedì', fixedClosed: false },
  { value: 3, label: 'Mercoledì', fixedClosed: false },
  { value: 4, label: 'Giovedì', fixedClosed: false },
  { value: 5, label: 'Venerdì', fixedClosed: false },
  { value: 6, label: 'Sabato', fixedClosed: false },
  { value: 0, label: 'Domenica', fixedClosed: true },
] as const;

interface AdminTeamManagerProps {
  barbers: Barber[];
  availability: BarberAvailability[];
  timeOff: BarberTimeOff[];
}

function resolveBarberName(entry: BarberTimeOff) {
  if (!entry.barber_id) return 'Tutto il salone';
  const barber = entry.barber;
  if (Array.isArray(barber)) return barber[0]?.name ?? 'Barbiere';
  return barber?.name ?? 'Barbiere';
}

export function AdminTeamManager({ barbers, availability, timeOff }: AdminTeamManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialBarberId = barbers.find((b) => b.is_active)?.id ?? barbers[0]?.id ?? '';
  const [selectedBarberId, setSelectedBarberId] = useState(initialBarberId);
  const [schedule, setSchedule] = useState<AdminDayScheduleInput[]>(() =>
    initialBarberId ? buildBarberSchedule(initialBarberId, availability, WEEK_DAYS) : []
  );

  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [barberName, setBarberName] = useState('');
  const [barberRole, setBarberRole] = useState('Barbiere professionista');
  const [barberImageUrl, setBarberImageUrl] = useState('');
  const [barberBio, setBarberBio] = useState('');

  const [timeOffBarberId, setTimeOffBarberId] = useState<string>('all');
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');

  useEffect(() => {
    if (selectedBarberId) {
      setSchedule(buildBarberSchedule(selectedBarberId, availability, WEEK_DAYS));
    }
  }, [selectedBarberId, availability]);

  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);
  const activeBarbers = barbers.filter((b) => b.is_active);
  const inactiveBarbers = barbers.filter((b) => !b.is_active);

  const upcomingTimeOff = useMemo(() => {
    const now = new Date();
    return timeOff.filter((entry) => new Date(entry.end_at) >= now);
  }, [timeOff]);

  const baselineSchedule = useMemo(
    () => (selectedBarberId ? buildBarberSchedule(selectedBarberId, availability, WEEK_DAYS) : []),
    [selectedBarberId, availability]
  );

  const scheduleDirty = useMemo(
    () => JSON.stringify(schedule) !== JSON.stringify(baselineSchedule),
    [baselineSchedule, schedule]
  );

  const timeOffDirty = Boolean(timeOffStart && timeOffEnd);

  const selectBarber = useCallback((barberId: string) => {
    setSelectedBarberId(barberId);
    setSchedule(buildBarberSchedule(barberId, availability, WEEK_DAYS));
  }, [availability]);

  function openCreateBarber() {
    setEditingBarber(null);
    setBarberName('');
    setBarberRole('Barbiere professionista');
    setBarberImageUrl('');
    setBarberBio('');
    setBarberModalOpen(true);
  }

  function openEditBarber(barber: Barber) {
    setEditingBarber(barber);
    setBarberName(barber.name);
    setBarberRole(barber.role);
    setBarberImageUrl(barber.image_url ?? '');
    setBarberBio(barber.bio ?? '');
    setBarberModalOpen(true);
  }

  const handleSaveBarber = useCallback(() => {
    if (!barberName.trim()) {
      toast.error('Inserisci il nome del barbiere');
      return;
    }

    startTransition(async () => {
      const result = await saveAdminBarber({
        id: editingBarber?.id,
        name: barberName,
        role: barberRole,
        imageUrl: barberImageUrl,
        bio: barberBio,
        isActive: true,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(editingBarber ? 'Barbiere modificato' : 'Barbiere aggiunto');
      setBarberModalOpen(false);
      if (result.barberId) selectBarber(result.barberId);
      router.refresh();
    });
  }, [
    barberBio,
    barberImageUrl,
    barberName,
    barberRole,
    editingBarber,
    router,
    selectBarber,
    startTransition,
  ]);

  function handleDeleteBarber(barber: Barber) {
    if (!window.confirm(`Rimuovere ${barber.name} dal team?`)) return;

    startTransition(async () => {
      const result = await deleteAdminBarber(barber.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.deactivated
          ? 'Barbiere disattivato (ha prenotazioni attive)'
          : 'Barbiere eliminato'
      );
      router.refresh();
    });
  }

  function updateSchedulePeriod(
    dayOfWeek: number,
    period: SchedulePeriod,
    patch: Partial<AdminPeriodInput>
  ) {
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [period]: { ...day[period], ...patch } }
          : day
      )
    );
  }

  function closeEntireDay(dayOfWeek: number) {
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              morning: { ...day.morning, enabled: false },
              afternoon: { ...day.afternoon, enabled: false },
            }
          : day
      )
    );
  }

  function openDefaultDay(dayOfWeek: number) {
    setSchedule((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? defaultPeriodsForDay(dayOfWeek) : day))
    );
  }

  const handleSaveSchedule = useCallback(() => {
    if (!selectedBarberId) return;

    startTransition(async () => {
      const result = await saveAdminBarberSchedule(selectedBarberId, schedule);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.emailsSent && result.emailsSent > 0) {
        toast.success(`Orari aggiornati — ${result.emailsSent} clienti avvisati via email`);
      } else if (result.scheduleChanges && result.scheduleChanges > 0) {
        toast.success('Orari aggiornati (email non inviate: Resend non configurato)');
      } else {
        toast.success('Orari aggiornati');
      }
      router.refresh();
    });
  }, [router, schedule, selectedBarberId, startTransition]);

  const handleAddTimeOff = useCallback(() => {
    if (!timeOffStart || !timeOffEnd) {
      toast.error('Inserisci data inizio e fine');
      return;
    }

    startTransition(async () => {
      const result = await saveAdminTimeOff({
        barberId: timeOffBarberId === 'all' ? null : timeOffBarberId,
        startDate: timeOffStart,
        endDate: timeOffEnd,
        reason: timeOffReason,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.emailsSent && result.emailsSent > 0) {
        toast.success(`Ferie registrate — ${result.emailsSent} clienti avvisati via email`);
      } else if (timeOffBarberId === 'all') {
        toast.success('Ferie registrate (email non inviate: Resend non configurato)');
      } else {
        toast.success('Ferie / assenza registrata');
      }
      setTimeOffStart('');
      setTimeOffEnd('');
      setTimeOffReason('');
      router.refresh();
    });
  }, [
    router,
    startTransition,
    timeOffBarberId,
    timeOffEnd,
    timeOffReason,
    timeOffStart,
  ]);

  const handleSaveAll = useCallback(() => {
    if (barberModalOpen) {
      handleSaveBarber();
      return;
    }
    if (scheduleDirty) {
      handleSaveSchedule();
      return;
    }
    if (timeOffDirty) {
      handleAddTimeOff();
    }
  }, [
    barberModalOpen,
    handleAddTimeOff,
    handleSaveBarber,
    handleSaveSchedule,
    scheduleDirty,
    timeOffDirty,
  ]);

  useAdminSaveRegistration(
    barberModalOpen || scheduleDirty || timeOffDirty
      ? { isDirty: true, isSaving: pending, save: handleSaveAll }
      : null
  );

  function handleDeleteTimeOff(entry: BarberTimeOff) {
    if (!window.confirm('Eliminare questo periodo di assenza?')) return;

    startTransition(async () => {
      const result = await deleteAdminTimeOff(entry.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success('Assenza eliminata');
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl uppercase text-gold">Barbieri</h2>
            <p className="mt-1 text-sm text-white/50">Gestisci il team del salone</p>
          </div>
          <Button onClick={openCreateBarber}>
            <Plus size={16} />
            Nuovo barbiere
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeBarbers.map((barber) => (
            <BarberCard
              key={barber.id}
              barber={barber}
              selected={selectedBarberId === barber.id}
              pending={pending}
              onSelect={() => selectBarber(barber.id)}
              onEdit={() => openEditBarber(barber)}
              onDelete={() => handleDeleteBarber(barber)}
            />
          ))}
        </div>

        {inactiveBarbers.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Barbieri disattivati
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {inactiveBarbers.map((barber) => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  selected={selectedBarberId === barber.id}
                  pending={pending}
                  inactive
                  onSelect={() => selectBarber(barber.id)}
                  onEdit={() => openEditBarber(barber)}
                  onDelete={() => handleDeleteBarber(barber)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedBarber && (
        <section className="rounded-xl border border-white/10 bg-[#111] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gold" />
              <h2 className="font-display text-xl uppercase text-gold">
                Orari — {selectedBarber.name}
              </h2>
            </div>
            <p className="text-xs text-white/45">
              Mattina e pomeriggio come sul sito (pausa 13:00–14:00). Puoi aprire solo mezza giornata.
            </p>
          </div>

          <div className="space-y-3">
            {WEEK_DAYS.filter((day) => !day.fixedClosed).map((day) => {
              const row = schedule.find((item) => item.dayOfWeek === day.value);
              if (!row) return null;
              const dayOpen = isDayOpen(row);

              return (
                <div
                  key={day.value}
                  className="rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{day.label}</p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => (dayOpen ? closeEntireDay(day.value) : openDefaultDay(day.value))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50',
                        dayOpen
                          ? 'border-white/15 text-white/60 hover:border-red-500/40 hover:text-red-300'
                          : 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
                      )}
                    >
                      {dayOpen ? 'Chiudi tutto il giorno' : 'Apri giornata standard'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(['morning', 'afternoon'] as const).map((period) => {
                      const slot = row[period];
                      return (
                        <div
                          key={period}
                          className="grid gap-3 border-t border-white/5 pt-3 sm:grid-cols-[130px_1fr_1fr]"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slot.enabled}
                              disabled={pending}
                              onChange={(e) =>
                                updateSchedulePeriod(day.value, period, { enabled: e.target.checked })
                              }
                              className="accent-gold"
                            />
                            <span className="font-medium text-gold">{SCHEDULE_PERIOD_LABELS[period]}</span>
                          </label>
                          <div>
                            <Label className="text-xs text-white/45">Apertura</Label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              disabled={!slot.enabled || pending}
                              onChange={(e) =>
                                updateSchedulePeriod(day.value, period, { startTime: e.target.value })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-white/45">Chiusura</Label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              disabled={!slot.enabled || pending}
                              onChange={(e) =>
                                updateSchedulePeriod(day.value, period, { endTime: e.target.value })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-[#111] p-5">
        <div className="mb-5 flex items-center gap-2">
          <CalendarOff size={18} className="text-gold" />
          <h2 className="font-display text-xl uppercase text-gold">Ferie e assenze</h2>
        </div>

        <div className="grid gap-4 rounded-lg border border-white/10 bg-[#0a0a0a] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="timeoff-barber">Barbiere</Label>
            <select
              id="timeoff-barber"
              value={timeOffBarberId}
              onChange={(e) => setTimeOffBarberId(e.target.value)}
              className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
            >
              <option value="all">Tutto il salone</option>
              {activeBarbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="timeoff-start">Dal</Label>
            <Input
              id="timeoff-start"
              type="date"
              value={timeOffStart}
              onChange={(e) => setTimeOffStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="timeoff-end">Al</Label>
            <Input
              id="timeoff-end"
              type="date"
              value={timeOffEnd}
              onChange={(e) => setTimeOffEnd(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="timeoff-reason">Motivo (opz.)</Label>
            <Input
              id="timeoff-reason"
              value={timeOffReason}
              onChange={(e) => setTimeOffReason(e.target.value)}
              placeholder="Es. Ferie, malattia..."
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {upcomingTimeOff.length === 0 ? (
            <p className="text-sm text-white/45">Nessuna ferie o assenza programmata.</p>
          ) : (
            upcomingTimeOff.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{resolveBarberName(entry)}</p>
                  <p className="text-sm text-white/60">
                    {format(parseISO(entry.start_at), 'd MMM yyyy', { locale: it })}
                    {' — '}
                    {format(parseISO(entry.end_at), 'd MMM yyyy', { locale: it })}
                  </p>
                  {entry.reason && (
                    <p className="mt-1 text-xs text-white/45">{entry.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTimeOff(entry)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Elimina
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {barberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-gold">
                {editingBarber ? 'Modifica barbiere' : 'Nuovo barbiere'}
              </h2>
              <button type="button" onClick={() => setBarberModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="barber-name">Nome *</Label>
                <Input
                  id="barber-name"
                  value={barberName}
                  onChange={(e) => setBarberName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="barber-role">Ruolo *</Label>
                <Input
                  id="barber-role"
                  value={barberRole}
                  onChange={(e) => setBarberRole(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="barber-image">URL foto (opz.)</Label>
                <Input
                  id="barber-image"
                  value={barberImageUrl}
                  onChange={(e) => setBarberImageUrl(e.target.value)}
                  placeholder="/assets/sostituisci-immagini/team/..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="barber-bio">Bio (opz.)</Label>
                <textarea
                  id="barber-bio"
                  value={barberBio}
                  onChange={(e) => setBarberBio(e.target.value)}
                  rows={3}
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleSaveBarber}
                disabled={pending}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                  editingBarber
                    ? 'border border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                    : 'bg-gold text-black hover:bg-gold-light'
                )}
              >
                <UserCog size={16} />
                {pending ? 'Salvataggio...' : editingBarber ? 'Salva modifiche' : 'Aggiungi barbiere'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarberCard({
  barber,
  selected,
  pending,
  inactive = false,
  onSelect,
  onEdit,
  onDelete,
}: {
  barber: Barber;
  selected: boolean;
  pending: boolean;
  inactive?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition',
        selected ? 'border-gold bg-gold/10' : 'border-white/10 bg-[#111] hover:border-white/20'
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center gap-3">
          {barber.image_url ? (
            <Image
              src={barber.image_url}
              alt={barber.name}
              width={48}
              height={60}
              className="h-14 w-11 rounded object-cover object-top"
            />
          ) : (
            <div className="flex h-14 w-11 items-center justify-center rounded bg-white/10 text-white/40">
              <UserCog size={20} />
            </div>
          )}
          <div>
            <p className="font-medium">
              {barber.name}
              {inactive && <span className="ml-2 text-xs text-white/40">(disattivo)</span>}
            </p>
            <p className="text-xs text-gold">{barber.role}</p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/25 disabled:opacity-50"
        >
          <Pencil size={14} />
          Modifica
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}