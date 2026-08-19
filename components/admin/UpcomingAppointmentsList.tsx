'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO } from 'date-fns';
import {
  CalendarAppointment,
} from '@/lib/utils/week-calendar';
import {
  formatShopDateLong,
  formatShopTimeFromDate,
} from '@/lib/utils/booking-datetime';
import {
  Pencil,
  Trash2,
  Search,
  ArrowDownAZ,
  ArrowUpDown,
  ChevronDown,
  MessageCircle,
  CheckCheck,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminAppointmentForm } from '@/components/admin/AdminAppointmentForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCancelAppointment, markAppointmentReminderSent } from '@/lib/actions/admin';
import { getWhatsAppReminderUrl } from '@/lib/utils/whatsapp-reminders';
import { formatPrice, formatDuration } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';

type SortType = 'date' | 'alphabetical' | 'genre';
type SortDir = 'asc' | 'desc';
type ReminderFilter = 'all' | 'pending' | 'sent' | 'no_phone';

const SORT_TYPE_LABELS: Record<SortType, string> = {
  date: 'Per data',
  alphabetical: 'Alfabetico (A -> Z)',
  genre: 'Per genere',
};

const GENRE_ORDER: Record<string, number> = {
  UOMO: 0,
  RAGAZZO: 1,
  BIMBO: 2,
};

function detectGenre(serviceName?: string): string {
  if (!serviceName) return 'UOMO';
  const lower = serviceName.toLowerCase();
  if (lower.includes('bimbo') || lower.includes('bambin')) return 'BIMBO';
  if (lower.includes('ragazzo') || lower.includes('junior')) return 'RAGAZZO';
  return 'UOMO';
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
  const [onlyActive, setOnlyActive] = useState(true);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
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

  // Conteggi statistici sui promemoria
  const counts = useMemo(() => {
    const active = appointments.filter((a) => (onlyActive ? a.status === 'confirmed' : true));
    const sent = active.filter((a) => !!a.reminder_whatsapp_sent_at).length;
    const pending = active.filter((a) => !a.reminder_whatsapp_sent_at && !!a.customer_phone).length;
    const noPhone = active.filter((a) => !a.customer_phone).length;
    return { total: active.length, sent, pending, noPhone };
  }, [appointments, onlyActive]);

  const filtered = useMemo(() => {
    const base = appointments.filter((a) => {
      if (onlyActive && a.status !== 'confirmed') return false;

      // Filtro per stato promemoria
      if (reminderFilter === 'pending' && (!!a.reminder_whatsapp_sent_at || !a.customer_phone)) return false;
      if (reminderFilter === 'sent' && !a.reminder_whatsapp_sent_at) return false;
      if (reminderFilter === 'no_phone' && !!a.customer_phone) return false;

      return matchesQuery(a, query);
    });
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
  }, [appointments, query, onlyActive, reminderFilter, sortType, sortDir]);

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

  async function handleSendManualWhatsApp(appointment: CalendarAppointment) {
    if (!appointment.customer_phone) {
      toast.error('Nessun numero di telefono per questo cliente');
      return;
    }
    const url = getWhatsAppReminderUrl({
      customerName: appointment.customer_name,
      customerPhone: appointment.customer_phone,
      serviceName: appointment.service?.name ?? 'Servizio',
      barberName: appointment.barber?.name ?? 'Barbiere',
      startsAt: parseISO(appointment.starts_at),
    });
    window.open(url, '_blank');
    const res = await markAppointmentReminderSent(appointment.id);
    if (res.ok) {
      toast.success('Promemoria WhatsApp aperto e registrato come inviato!');
      startTransition(() => router.refresh());
    }
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

          {/* Pillola toggle Solo Attive */}
          <button
            id="btn-toggle-active"
            type="button"
            role="switch"
            aria-checked={onlyActive}
            onClick={() => setOnlyActive((v) => !v)}
            className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-gold/40 hover:bg-white/10 focus:outline-none"
          >
            <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${onlyActive ? 'text-gold' : 'text-white/40'}`}>
              Solo attive
            </span>
            {/* Track */}
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 ${
                onlyActive ? 'bg-gold' : 'bg-white/20'
              }`}
            >
              {/* Thumb */}
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                  onlyActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${onlyActive ? 'text-white/30' : 'text-white/60'}`}>
              Tutte
            </span>
          </button>

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
        {/* Filtro Promemoria e Contatori */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider mr-1">Promemoria WhatsApp:</span>

          <button
            type="button"
            onClick={() => setReminderFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
              reminderFilter === 'all'
                ? 'border-gold bg-gold/20 text-gold'
                : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Tutti ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setReminderFilter('pending')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition border ${
              reminderFilter === 'pending'
                ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-950/40'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400/90 hover:bg-amber-500/20'
            }`}
          >
            <Clock size={12} />
            ⏳ Da Avvisare ({counts.pending})
          </button>

          <button
            type="button"
            onClick={() => setReminderFilter('sent')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition border ${
              reminderFilter === 'sent'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-950/40'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400/90 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCheck size={14} className="text-emerald-400" />
            ✅ Avvisati ({counts.sent})
          </button>

          {counts.noPhone > 0 && (
            <button
              type="button"
              onClick={() => setReminderFilter('no_phone')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border ${
                reminderFilter === 'no_phone'
                  ? 'border-white/40 bg-white/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              <AlertCircle size={12} />
              ⚠️ Senza Tel ({counts.noPhone})
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#111] px-4 py-8 text-center text-sm text-white/50">
          {reminderFilter === 'pending' && counts.pending === 0 ? (
            <div className="space-y-1">
              <p className="text-base font-bold text-emerald-400">🎉 Ottimo lavoro! Tutti i clienti sono stati avvisati.</p>
              <p className="text-xs text-white/50">Non ci sono altre prenotazioni in attesa di promemoria.</p>
            </div>
          ) : (
            <p>{appointments.length === 0 ? 'Nessuna prenotazione futura al momento.' : 'Nessun risultato per i filtri selezionati.'}</p>
          )}
        </div>
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
            const isNotified = !!appointment.reminder_whatsapp_sent_at;
            const hasPhone = !!appointment.customer_phone;

            let cardBorderClass = 'border-white/10 bg-[#111]';
            if (isCompleted) {
              cardBorderClass = 'border-emerald-500/30 bg-[#0a1610]';
            } else if (isCancelled) {
              cardBorderClass = 'border-red-500/20 bg-[#170b0b] opacity-75';
            } else if (isNotified) {
              cardBorderClass = 'border-l-4 border-l-emerald-500 border-emerald-500/20 bg-[#0c1510]';
            } else if (hasPhone) {
              cardBorderClass = 'border-l-4 border-l-amber-500 border-amber-500/25 bg-[#17130a]';
            } else {
              cardBorderClass = 'border-l-4 border-l-white/20 border-white/10 bg-[#111]';
            }

            const genreStyle =
              genre === 'Bimbo'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : genre === 'Ragazzo'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-white/10 text-white/50 border-white/10';

            return (
              <article
                key={appointment.id}
                className={`rounded-xl border p-4 sm:p-5 transition ${cardBorderClass}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white text-base">{appointment.customer_name}</p>

                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${genreStyle}`}>
                        {genre}
                      </span>

                      {isCompleted ? (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
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
                      <span className="text-gold font-medium">{appointment.service?.name ?? 'Servizio'}</span>
                      {appointment.service
                        ? ` . ${formatDuration(appointment.service.duration_minutes)} . ${formatPrice(appointment.service.price_cents)}`
                        : ''}
                    </p>
                    <p className="text-sm text-white/50">
                      Barbiere: {appointment.barber?.name ?? '-'}
                      {appointment.customer_phone ? (
                        <span className="text-white/80 font-medium"> . Tel. {appointment.customer_phone}</span>
                      ) : (
                        <span className="text-amber-400/80 font-medium"> . ⚠️ Nessun recapito telefonico</span>
                      )}
                    </p>
                    {appointment.notes && (
                      <p className="text-sm text-white/45">Note: {appointment.notes}</p>
                    )}

                    {/* Badge Notifica EVIDENTE con Spunta */}
                    <div className="pt-1">
                      {isNotified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 shadow-sm">
                          <CheckCheck size={15} className="text-emerald-400" />
                          ✅ CLIENTE AVVISATO SU WHATSAPP ({formatShopTimeFromDate(parseISO(appointment.reminder_whatsapp_sent_at!))})
                        </span>
                      ) : !hasPhone ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                          <AlertCircle size={14} />
                          ⚠️ IMPOSSIBILE AVVISARE: Telefono mancante
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                          ⏳ DA AVVISARE (Promemoria non ancora inviato)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {hasPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isNotified ? 'outline' : 'default'}
                        className={`gap-1.5 text-xs font-bold transition ${
                          isNotified
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/70'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60'
                        }`}
                        onClick={() => handleSendManualWhatsApp(appointment)}
                        title={isNotified ? 'Re-invia o apri chat WhatsApp' : 'Invia promemoria WhatsApp al cliente'}
                      >
                        {isNotified ? (
                          <>
                            <CheckCheck size={14} className="text-emerald-400" />
                            Avvisato (Re-invia)
                          </>
                        ) : (
                          <>
                            <MessageCircle size={14} />
                            Invia WhatsApp
                          </>
                        )}
                      </Button>
                    )}
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
