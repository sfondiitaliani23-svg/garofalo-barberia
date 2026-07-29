'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO } from 'date-fns';
import { ArrowDownAZ, ArrowUpDown, CalendarDays, ChevronDown, Pencil, Search, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { AdminAppointmentForm } from '@/components/admin/AdminAppointmentForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCancelAppointment } from '@/lib/actions/admin';
import { formatShopDateLong, formatShopTimeFromDate } from '@/lib/utils/booking-datetime';
import { formatDuration, formatPrice } from '@/lib/utils';
import type { CalendarAppointment } from '@/lib/utils/week-calendar';
import type { Barber, Service } from '@/types/database';

type SortType = 'date' | 'alphabetical' | 'genre';
type SortDir = 'asc' | 'desc';

const SORT_TYPE_LABELS: Record<SortType, string> = {
  date: 'Per data',
  alphabetical: 'Alfabetico',
  genre: 'Per genere',
};

const GENRE_ORDER: Record<string, number> = { Uomo: 0, Ragazzo: 1, Bimbo: 2 };

function detectGenre(serviceName: string | undefined): 'Bimbo' | 'Ragazzo' | 'Uomo' {
  const name = (serviceName ?? '').toLowerCase();
  if (name.includes('baby') || name.includes('bimbo') || name.includes('bambino')) return 'Bimbo';
  if (name.includes('ragazzo') || name.includes('junior')) return 'Ragazzo';
  return 'Uomo';
}

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
  const [sortType, setSortType] = useState<SortType>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [typeOpen, setTypeOpen] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const typeRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<HTMLDivElement>(null);

  const query = normalize(search);

  const filtered = useMemo(() => {
    const base = appointments.filter((a) => matchesQuery(a, query));
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortType === 'date') {
        cmp = a.starts_at.localeCompare(b.starts_at);
      } else if (sortType === 'alphabetical') {
        cmp = normalize(a.customer_name).localeCompare(normalize(b.customer_name), 'it');
      } else if (sortType === 'genre') {
        const ga = GENRE_ORDER[detectGenre(a.service?.name)] ?? 99;
        const gb = GENRE_ORDER[detectGenre(b.service?.name)] ?? 99;
        cmp = ga - gb;
        if (cmp === 0) cmp = a.starts_at.localeCompare(b.starts_at);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [appointments, query, sortType, sortDir]);

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
      `Disdire la prenotazione di ${appointment.customer_name}?\nL'appuntamento verra rimosso dal calendario.`
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

  const sortTypeOptions: { value: SortType; label: string }[] = [
    { value: 'date', label: 'Per data' },
    { value: 'alphabetical', label: 'Alfabetico (A -> Z)' },
    { value: 'genre', label: 'Per genere' },
  ];

  const sortDirOptions: { value: SortDir; label: string; sub: string }[] = [
    {
      value: 'asc',
      label: 'Crescente',
      sub: sortType === 'date' ? 'Dal piu vicino al piu lontano' : 'A -> Z / Uomo -> Bimbo',
    },
    {
      value: 'desc',
      label: 'Decrescente',
      sub: sortType === 'date' ? 'Dal piu lontano al piu vicino' : 'Z -> A / Bimbo -> Uomo',
    },
  ];

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

        <div className="flex flex-wrap items-center gap-2">

          {/* Bottone Tipo Ordine */}
          <div className="relative" ref={typeRef}>
            <button
              id="btn-sort-type"
              type="button"
              onClick={() => { setTypeOpen((o) => !o); setDirOpen(false); }}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-gold/50 hover:bg-white/10 hover:text-gold focus:outline-none"
            >
              <ArrowDownAZ size={14} className="text-gold" />
              Ordina: <span className="text-gold">{SORT_TYPE_LABELS[sortType]}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
            </button>

            {typeOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] p-1 shadow-2xl">
                {sortTypeOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setSortType(value); setTypeOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                      sortType === value
                        ? 'bg-gold/20 text-gold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    {sortType === value && <span className="ml-auto text-gold text-[10px]">ok</span>}
                  </button>
                ))}
                {sortType === 'genre' && (
                  <div className="mx-2 mt-1 border-t border-white/10 pt-2 pb-1">
                    <p className="mb-1 px-1 text-[10px] uppercase tracking-wider text-white/30">Rilevamento automatico</p>
                    {[
                      { g: 'Uomo', color: 'bg-white/40' },
                      { g: 'Ragazzo', color: 'bg-purple-400' },
                      { g: 'Bimbo', color: 'bg-blue-400' },
                    ].map(({ g, color }) => (
                      <div key={g} className="flex items-center gap-2 px-1 py-0.5 text-[11px] text-white/40">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
                        {g}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottone Direzione */}
          <div className="relative" ref={dirRef}>
            <button
              id="btn-sort-dir"
              type="button"
              onClick={() => { setDirOpen((o) => !o); setTypeOpen(false); }}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-gold/50 hover:bg-white/10 hover:text-gold focus:outline-none"
            >
              <ArrowUpDown size={14} className="text-gold" />
              <span className="text-gold">{sortDir === 'asc' ? 'Crescente' : 'Decrescente'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${dirOpen ? 'rotate-180' : ''}`} />
            </button>

            {dirOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[210px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] p-1 shadow-2xl">
                {sortDirOptions.map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setSortDir(value); setDirOpen(false); }}
                    className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition ${
                      sortDir === value
                        ? 'bg-gold/20 text-gold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex w-full items-center text-xs font-semibold">
                      {label}
                      {sortDir === value && <span className="ml-auto text-[10px]">ok</span>}
                    </span>
                    <span className="mt-0.5 text-[10px] opacity-50">{sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ricerca */}
          <div className="relative w-full sm:w-60">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nome, telefono..."
              className="pl-9 text-xs"
              aria-label="Cerca prenotazione"
            />
          </div>
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
            const isCompleted = appointment.status === 'completed';
            const isCancelled = appointment.status === 'cancelled';
            const genre = detectGenre(appointment.service?.name);

            const cardBgClass = isCompleted
              ? 'border-emerald-500/30 bg-[#0a1610]'
              : isCancelled
              ? 'border-red-500/20 bg-[#170b0b] opacity-75'
              : 'border-white/10 bg-[#111]';

            const genreStyle =
              genre === 'Bimbo'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : genre === 'Ragazzo'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-white/10 text-white/50 border-white/10';

            return (
              <article
                key={appointment.id}
                className={`rounded-xl border p-4 sm:p-5 transition ${cardBgClass}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white text-base">{appointment.customer_name}</p>

                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${genreStyle}`}>
                        {genre}
                      </span>

                      {isCompleted ? (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          Completato
                        </span>
                      ) : isCancelled ? (
                        <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                          Disdetto
                        </span>
                      ) : (
                        <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[11px] font-bold text-gold uppercase tracking-wider">
                          Attiva
                        </span>
                      )}

                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                        {dateLabel} . {timeLabel}
                      </span>
                    </div>

                    <p className="text-sm text-white/70">
                      <span className="text-gold">{appointment.service?.name ?? 'Servizio'}</span>
                      {appointment.service
                        ? ` . ${formatDuration(appointment.service.duration_minutes)} . ${formatPrice(appointment.service.price_cents)}`
                        : ''}
                    </p>
                    <p className="text-sm text-white/50">
                      Barbiere: {appointment.barber?.name ?? '-'}
                      {appointment.customer_phone ? ` . Tel. ${appointment.customer_phone}` : ''}
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
