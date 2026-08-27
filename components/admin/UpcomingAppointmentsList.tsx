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
  Phone,
  User,
  Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminAppointmentForm } from '@/components/admin/AdminAppointmentForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminCancelAppointment, markAppointmentReminderSent, getPastAdminAppointments } from '@/lib/actions/admin';
import { getWhatsAppReminderUrl } from '@/lib/utils/whatsapp-reminders';
import { formatPrice, formatDuration } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';

type SortType = 'date' | 'alphabetical' | 'genre';
type SortDir = 'asc' | 'desc';
type ReminderFilter = 'all' | 'pending' | 'sent' | 'no_phone';

const SORT_TYPE_LABELS: Record<SortType, string> = {
  date: 'Per data',
  alphabetical: 'Alfabetico (A-Z)',
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

function normalize(str: string | undefined | null): string {
  return (str ?? '').toLowerCase().trim();
}

function cleanCustomerNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/\[Combo:\s*[^\]]+\]/gi, '').trim();
  return cleaned || null;
}

function matchesQuery(appointment: CalendarAppointment, query: string): boolean {
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

interface UpcomingAppointmentsListProps {
  appointments?: CalendarAppointment[];
  upcomingAppointments?: CalendarAppointment[];
  pastAppointments?: CalendarAppointment[];
  barbers: Barber[];
  services: Service[];
}

export function UpcomingAppointmentsList({
  appointments: legacyAppointments,
  upcomingAppointments,
  pastAppointments,
  barbers,
  services,
}: UpcomingAppointmentsListProps) {
  const [viewTab, setViewTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [loadedPast, setLoadedPast] = useState<CalendarAppointment[]>(pastAppointments ?? []);
  const [loadingPast, setLoadingPast] = useState(false);

  const handleTabChange = async (tab: 'upcoming' | 'past' | 'all') => {
    setViewTab(tab);
    if ((tab === 'past' || tab === 'all') && loadedPast.length === 0 && !loadingPast) {
      setLoadingPast(true);
      try {
        const past = await getPastAdminAppointments(200);
        setLoadedPast(past as CalendarAppointment[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPast(false);
      }
    }
  };

  const appointments = useMemo(() => {
    if (upcomingAppointments || pastAppointments || loadedPast) {
      if (viewTab === 'upcoming') return upcomingAppointments ?? [];
      if (viewTab === 'past') return loadedPast;
      return [...(upcomingAppointments ?? []), ...loadedPast];
    }
    return legacyAppointments ?? [];
  }, [legacyAppointments, upcomingAppointments, pastAppointments, loadedPast, viewTab]);
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

  // Conteggi per i filtri WhatsApp
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
      toast.success('Promemoria aperto su WhatsApp e registrato come inviato!');
      startTransition(() => router.refresh());
    }
  }

  const sortTypeOptions: { value: SortType; label: string }[] = [
    { value: 'date', label: 'Per data' },
    { value: 'alphabetical', label: 'Alfabetico (A-Z)' },
    { value: 'genre', label: 'Per genere' },
  ];

  const sortDirOptions: { value: SortDir; label: string; sub: string }[] = [
    {
      value: 'asc',
      label: 'Crescente',
      sub: sortType === 'date' ? 'Dal più vicino al più lontano' : 'A -> Z / Uomo -> Bimbo',
    },
    {
      value: 'desc',
      label: 'Decrescente',
      sub: sortType === 'date' ? 'Dal più lontano al più vicino' : 'Z -> A / Bimbo -> Uomo',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── PANNELLO DI CONTROLLO SUPERIORE ORDINATO ─────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-xl space-y-4">
        
        {/* RIGA 1: Intestazione & Toggle Stato Attive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl uppercase tracking-wide text-gold">
                {viewTab === 'upcoming' ? 'Prossime Prenotazioni' : viewTab === 'past' ? 'Storico Passato' : 'Tutte le Prenotazioni'}
              </h2>
              {(upcomingAppointments || pastAppointments) && (
                <div className="inline-flex rounded-lg border border-white/10 bg-black/60 p-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('upcoming')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      viewTab === 'upcoming'
                        ? 'bg-gold text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Prossime ({upcomingAppointments?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('past')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      viewTab === 'past'
                        ? 'bg-gold text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Passate {loadingPast ? '...' : (loadedPast.length > 0 ? `(${loadedPast.length})` : '')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('all')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      viewTab === 'all'
                        ? 'bg-gold text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Tutte
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {query
                ? `${filtered.length} di ${appointments.length} appuntamenti trovati`
                : `${appointments.length} appuntamenti registrati`}
            </p>
          </div>

          {/* Toggle Solo Attive / Tutte */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="btn-toggle-active"
              type="button"
              role="switch"
              aria-checked={onlyActive}
              onClick={() => setOnlyActive((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-gold/40 hover:bg-white/5"
            >
              <span className={`text-[11px] uppercase font-bold tracking-wider ${onlyActive ? 'text-gold' : 'text-white/40'}`}>
                Solo Attive
              </span>
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  onlyActive ? 'bg-gold' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-black shadow transition-transform duration-200 ${
                    onlyActive ? 'translate-x-3.5 bg-white' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span className={`text-[11px] uppercase font-bold tracking-wider ${onlyActive ? 'text-white/30' : 'text-white/70'}`}>
                Tutte
              </span>
            </button>
          </div>
        </div>

        {/* RIGA 2: Filtri Rapidi Promemoria WhatsApp (Segmented Toolbar) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <span className="text-xs font-semibold text-white/60 shrink-0">
            Filtro Promemoria:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReminderFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition border ${
                reminderFilter === 'all'
                  ? 'border-gold bg-gold text-black shadow-md'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              Tutti ({counts.total})
            </button>

            <button
              type="button"
              onClick={() => setReminderFilter('pending')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                reminderFilter === 'pending'
                  ? 'border-amber-500 bg-amber-500 text-black shadow-lg shadow-amber-950/50'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Clock size={13} />
              Da Avvisare ({counts.pending})
            </button>

            <button
              type="button"
              onClick={() => setReminderFilter('sent')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                reminderFilter === 'sent'
                  ? 'border-emerald-500 bg-emerald-500 text-black shadow-lg shadow-emerald-950/50'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCheck size={14} />
              Avvisati ({counts.sent})
            </button>

            {counts.noPhone > 0 && (
              <button
                type="button"
                onClick={() => setReminderFilter('no_phone')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border ${
                  reminderFilter === 'no_phone'
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                <AlertCircle size={12} />
                Senza Tel ({counts.noPhone})
              </button>
            )}
          </div>
        </div>

        {/* RIGA 3: Ricerca & Ordinamento */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          {/* Campo di Ricerca */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome cliente, telefono, servizio, barbiere..."
              className="pl-9 h-10 text-xs bg-black/40 border-white/15 text-white"
              aria-label="Cerca prenotazione"
            />
          </div>

          {/* Selettore Ordinamento */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={typeRef}>
              <button
                id="btn-sort-type"
                type="button"
                onClick={() => { setTypeOpen((o) => !o); setDirOpen(false); }}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 text-xs font-medium text-white/80 transition hover:border-gold/40 hover:text-white"
              >
                <ArrowDownAZ size={14} className="text-gold" />
                <span className="text-white/50">Ordina:</span>
                <span className="text-gold font-semibold">{SORT_TYPE_LABELS[sortType]}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
              </button>

              {typeOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] p-1 shadow-2xl">
                  {sortTypeOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setSortType(value); setTypeOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        sortType === value
                          ? 'bg-gold/20 text-gold font-bold'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {sortType === value && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direzione Ordinamento */}
            <div className="relative" ref={dirRef}>
              <button
                id="btn-sort-dir"
                type="button"
                onClick={() => { setDirOpen((o) => !o); setTypeOpen(false); }}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 text-xs font-medium text-white/80 transition hover:border-gold/40 hover:text-white"
              >
                <ArrowUpDown size={13} className="text-gold" />
                <span className="text-gold font-semibold">{sortDir === 'asc' ? 'Crescente' : 'Decrescente'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${dirOpen ? 'rotate-180' : ''}`} />
              </button>

              {dirOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] p-1 shadow-2xl">
                  {sortDirOptions.map(({ value, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setSortDir(value); setDirOpen(false); }}
                      className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition ${
                        sortDir === value
                          ? 'bg-gold/20 text-gold'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex w-full items-center justify-between text-xs font-semibold">
                        {label}
                        {sortDir === value && <span className="text-[10px]">✓</span>}
                      </span>
                      <span className="text-[10px] text-white/40">{sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── LISTA PRENOTAZIONI ───────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center shadow-lg">
          {reminderFilter === 'pending' && counts.pending === 0 ? (
            <div className="space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCheck size={26} />
              </div>
              <h3 className="text-lg font-bold text-emerald-400">Tutti i clienti sono stati avvisati! 🎉</h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                Non ci sono altre prenotazioni in attesa di promemoria WhatsApp.
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              {appointments.length === 0 ? 'Nessuna prenotazione futura registrata.' : 'Nessun appuntamento corrisponde ai filtri selezionati.'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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
            const cleanNote = cleanCustomerNotes(appointment.notes);

            // Stile Card Elegante e Pulito
            let cardClasses = 'border-white/10 bg-[#141414] hover:border-white/20';
            if (isCompleted) {
              cardClasses = 'border-emerald-500/30 bg-[#0c1610]';
            } else if (isCancelled) {
              cardClasses = 'border-red-500/20 bg-[#160c0c] opacity-70';
            } else if (isNotified) {
              cardClasses = 'border-emerald-500/40 bg-[#0d1711] shadow-sm';
            } else if (hasPhone) {
              cardClasses = 'border-amber-500/35 bg-[#17140c] shadow-sm';
            }

            const genreStyle =
              genre === 'BIMBO'
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                : genre === 'RAGAZZO'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-white/10 text-white/60 border-white/10';

            return (
              <article
                key={appointment.id}
                className={`rounded-xl border p-4 transition-all duration-200 ${cardClasses}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  
                  {/* Informazioni Cliente & Servizio */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    
                    {/* Intestazione Riga: Nome, Genere, Data/Ora, Badge Stato */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white text-base tracking-tight">
                        {appointment.customer_name}
                      </h3>

                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${genreStyle}`}>
                        {genre}
                      </span>

                      {/* Badge Data & Ora */}
                      <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90">
                        {dateLabel} · ore {timeLabel}
                      </span>

                      {/* Badge Stato Notifica WhatsApp Pulito */}
                      {isNotified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                          <CheckCheck size={13} />
                          Avvisato ({formatShopTimeFromDate(parseISO(appointment.reminder_whatsapp_sent_at!))})
                        </span>
                      ) : !hasPhone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/40">
                          <AlertCircle size={11} />
                          Tel. mancante
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <Clock size={11} />
                          Da avvisare
                        </span>
                      )}
                    </div>

                    {/* Dettaglio Servizio, Barbiere e Telefono */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                      <span className="text-gold font-semibold flex items-center gap-1">
                        <Scissors size={12} className="text-gold/80" />
                        {appointment.service?.name ?? 'Servizio'}
                        {appointment.service && (
                          <span className="text-white/50 font-normal">
                            ({formatDuration(appointment.service.duration_minutes)} · {formatPrice(appointment.service.price_cents)})
                          </span>
                        )}
                      </span>

                      <span className="text-white/30 hidden sm:inline">|</span>

                      <span className="text-white/60 flex items-center gap-1">
                        <User size={12} className="text-white/40" />
                        Barbiere: <strong className="text-white/80 font-medium">{appointment.barber?.name ?? '-'}</strong>
                      </span>

                      {hasPhone && (
                        <>
                          <span className="text-white/30 hidden sm:inline">|</span>
                          <span className="text-white/60 flex items-center gap-1">
                            <Phone size={12} className="text-white/40" />
                            Tel: <strong className="text-white/80 font-medium">{appointment.customer_phone}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Note reali del cliente (se presenti) */}
                    {cleanNote && (
                      <p className="text-xs text-amber-200/70 italic bg-amber-500/5 border border-amber-500/15 rounded-md px-2.5 py-1 max-w-xl">
                        Note: {cleanNote}
                      </p>
                    )}
                  </div>

                  {/* Pulsanti Azione Allineati a Destra */}
                  <div className="flex shrink-0 items-center gap-2 pt-2 lg:pt-0 border-t border-white/5 lg:border-t-0">
                    {hasPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isNotified ? 'outline' : 'default'}
                        className={`gap-1.5 text-xs font-bold transition h-9 px-3.5 ${
                          isNotified
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/60'
                        }`}
                        onClick={() => handleSendManualWhatsApp(appointment)}
                        title={isNotified ? 'Re-invia promemoria WhatsApp' : 'Invia promemoria WhatsApp al cliente'}
                      >
                        {isNotified ? (
                          <>
                            <CheckCheck size={14} className="text-emerald-400" />
                            Re-invia
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
                      className="gap-1.5 text-xs border-white/15 hover:border-gold hover:text-gold h-9 px-3"
                      onClick={() => openEdit(appointment)}
                    >
                      <Pencil size={13} />
                      Modifica
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 text-xs h-9 px-3"
                      disabled={isPending}
                      onClick={() => handleCancel(appointment)}
                    >
                      <Trash2 size={13} />
                      {isPending ? '...' : 'Rimuovi'}
                    </Button>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modale Modifica Prenotazione */}
      {modalOpen && selectedAppointment && (
        <AdminAppointmentForm
          appointment={selectedAppointment}
          barberId={selectedAppointment.barber_id ?? barbers[0]?.id ?? ''}
          barbers={barbers}
          services={services}
          onSaved={handleSaved}
          onClose={() => {
            setModalOpen(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}
