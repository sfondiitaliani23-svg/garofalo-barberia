'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO } from 'date-fns';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminAppointmentForm } from '@/components/admin/AdminAppointmentForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCancelAppointment } from '@/lib/actions/admin';
import { formatShopDateLong, formatShopTimeFromDate } from '@/lib/utils/booking-datetime';
import { formatDuration, formatPrice } from '@/lib/utils';
import type { CalendarAppointment } from '@/lib/utils/week-calendar';
import type { Barber, Service } from '@/types/database';

interface UpcomingAppointmentsListProps {
  appointments: CalendarAppointment[];
  barbers: Barber[];
  services: Service[];
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().trim();
}

function matchesQuery(appointment: CalendarAppointment, query: string) {
  if (!query) return true;

  const haystack = [
    appointment.customer_name,
    appointment.customer_phone,
    appointment.notes,
    appointment.barber?.name,
    appointment.service?.name,
  ]
    .map(normalize)
    .join(' ');

  return haystack.includes(query);
}

export function UpcomingAppointmentsList({
  appointments,
  barbers,
  services,
}: UpcomingAppointmentsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const query = normalize(search);
  const filtered = useMemo(
    () => appointments.filter((appointment) => matchesQuery(appointment, query)),
    [appointments, query]
  );

  function openEdit(appointment: CalendarAppointment) {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setSelectedAppointment(null);
    startTransition(() => router.refresh());
  }

  async function handleCancel(appointment: CalendarAppointment) {
    const confirmed = window.confirm(
      `Disdire la prenotazione di ${appointment.customer_name}?\nL'appuntamento verrà rimosso dal calendario.`
    );
    if (!confirmed) return;

    setPendingId(appointment.id);
    const result = await adminCancelAppointment(appointment.id);
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.error ?? 'Impossibile cancellare la prenotazione');
      return;
    }

    toast.success('Prenotazione cancellata');
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl uppercase text-gold">Prossime prenotazioni</h2>
          <p className="mt-1 text-sm text-white/50">
            {query
              ? `${filtered.length} di ${appointments.length} appuntamenti`
              : `${appointments.length} appuntamenti confermati in arrivo`}
          </p>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, telefono, barbiere..."
            className="pl-10"
            aria-label="Cerca prenotazione"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-[#111] px-4 py-8 text-center text-sm text-white/50">
          {appointments.length === 0
            ? 'Nessuna prenotazione futura al momento.'
            : 'Nessun risultato per la ricerca.'}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((appointment) => {
            const startsAt = parseISO(appointment.starts_at);
            const dateLabel = formatShopDateLong(startsAt);
            const timeLabel = formatShopTimeFromDate(startsAt);
            const isPending = pendingId === appointment.id;

            return (
              <article
                key={appointment.id}
                className="rounded-xl border border-white/10 bg-[#111] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{appointment.customer_name}</p>
                      <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                        {dateLabel} · {timeLabel}
                      </span>
                    </div>
                    <p className="text-sm text-white/70">
                      <span className="text-gold">{appointment.service?.name ?? 'Servizio'}</span>
                      {appointment.service
                        ? ` · ${formatDuration(appointment.service.duration_minutes)} · ${formatPrice(appointment.service.price_cents)}`
                        : ''}
                    </p>
                    <p className="text-sm text-white/50">
                      Barbiere: {appointment.barber?.name ?? '—'}
                      {appointment.customer_phone ? ` · Tel. ${appointment.customer_phone}` : ''}
                    </p>
                    {appointment.notes && (
                      <p className="text-sm text-white/45">Note: {appointment.notes}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openEdit(appointment)}
                    >
                      <Pencil size={14} />
                      Modifica
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      disabled={isPending}
                      onClick={() => handleCancel(appointment)}
                    >
                      <Trash2 size={14} />
                      {isPending ? '...' : 'Rimuovi'}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen && selectedAppointment && (
        <AdminAppointmentForm
          barbers={barbers}
          services={services}
          barberId={selectedAppointment.barber_id}
          appointment={selectedAppointment}
          onClose={() => {
            setModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}