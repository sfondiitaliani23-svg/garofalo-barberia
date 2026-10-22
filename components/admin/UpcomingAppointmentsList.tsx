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
  Download,
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

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  confirmed: { label: 'Confermato', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  completed: { label: 'Completato', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300', dot: 'bg-sky-400' },
  cancelled: { label: 'Annullato', cls: 'border-red-500/30 bg-red-500/10 text-red-300', dot: 'bg-red-400' },
  no_show: { label: 'Non presentato', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
};

function csvCell(value: string | number | null | undefined): string {
  const v = String(value ?? '');
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
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
  const [serviceFilter, setServiceFilter] = useState('all');
  const [barberFilter, setBarberFilter] = useState('all');
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
      if (serviceFilter !== 'all' && a.service?.name !== serviceFilter) return false;
      if (barberFilter !== 'all' && a.barber_id !== barberFilter) return false;

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
  }, [appointments, query, onlyActive, reminderFilter, serviceFilter, barberFilter, sortType, sortDir]);

  const showMoney = !appointments.some((a) => a.service && a.service.price_cents == null);

  /** Scarica in CSV (Excel) esattamente le righe visibili con i filtri attuali. */
  function exportCsv() {
    const header = ['Data', 'Ora', 'Cliente', 'Telefono', 'Servizio', 'Barbiere', ...(showMoney ? ['Importo'] : []), 'Stato', 'Promemoria', 'Note'];
    const rows = filtered.map((a) => {
      const d = parseISO(a.starts_at);
      return [
        d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }),
        formatShopTimeFromDate(d),
        a.customer_name,
        a.customer_phone,
        a.service?.name ?? '',
        a.barber?.name ?? '',
        ...(showMoney ? [a.service?.price_cents != null ? (a.service.price_cents / 100).toFixed(2).replace('.', ',') : ''] : []),
        (STATUS_STYLE[a.status] ?? STATUS_STYLE.confirmed).label,
        a.reminder_whatsapp_sent_at ? 'Avvisato' : !a.customer_phone ? 'Tel. mancante' : a.status === 'confirmed' ? 'Da avvisare' : '',
        cleanCustomerNotes(a.notes) ?? '',
      ].map(csvCell).join(';');
    });
    const blob = new Blob(['\uFEFF' + [header.join(';'), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prenotazioni-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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

        {/* Filtri avanzati (concept 03) */}
        <div className="grid gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
          <label className="admin-filter">
            <span className="sr-only">Servizio</span>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
              <option value="all">Tutti i servizi</option>
              {services.map((sv) => (
                <option key={sv.id} value={sv.name}>{sv.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-filter">
            <span className="sr-only">Barbiere</span>
            <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)}>
              <option value="all">Tutti i barbieri</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          {(serviceFilter !== 'all' || barberFilter !== 'all' || reminderFilter !== 'all' || search) ? (
            <button
              type="button"
              onClick={() => {
                setServiceFilter('all');
                setBarberFilter('all');
                setReminderFilter('all');
                setSearch('');
              }}
              className="h-10 px-3 text-xs text-gold hover:underline"
            >
              Reset filtri
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gold/60 px-4 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black disabled:opacity-40"
          >
            <Download size={14} aria-hidden />
            Esporta ({filtered.length})
          </button>
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
              <h3 className="text-lg font-bold text-emerald-400">Tutti i clienti sono stati avvisati!</h3>
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
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0c0c0c]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/45">
                <th className="px-4 py-3 font-semibold">Data e ora</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Servizio</th>
                <th className="px-4 py-3 font-semibold">Barbiere</th>
                {showMoney && <th className="px-4 py-3 font-semibold text-right">Importo</th>}
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Promemoria</th>
                <th className="px-4 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appointment) => {
                const startsAt = parseISO(appointment.starts_at);
                const dateShort = startsAt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' });
                const timeLabel = formatShopTimeFromDate(startsAt);
                const isPending = pendingId === appointment.id;
                const isNotified = !!appointment.reminder_whatsapp_sent_at;
                const hasPhone = !!appointment.customer_phone;
                const cleanNote = cleanCustomerNotes(appointment.notes);
                const status = STATUS_STYLE[appointment.status] ?? STATUS_STYLE.confirmed;
                const canRemind = hasPhone && appointment.status === 'confirmed';

                return (
                  <tr
                    key={appointment.id}
                    className={`border-b border-white/5 transition hover:bg-white/[0.025] ${appointment.status === 'cancelled' ? 'opacity-60' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-white/80 tabular-nums">
                      {dateShort}
                      <span className="ml-2 text-white/50">{timeLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{appointment.customer_name}</p>
                      {hasPhone && <p className="text-[11px] text-white/45 tabular-nums">{appointment.customer_phone}</p>}
                      {cleanNote && (
                        <p className="mt-0.5 max-w-[16rem] truncate text-[11px] italic text-amber-200/70" title={cleanNote}>
                          Note: {cleanNote}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/75">
                      {appointment.service?.name ?? '-'}
                      {appointment.service && (
                        <span className="block text-[11px] text-white/40">{formatDuration(appointment.service.duration_minutes)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/75">{appointment.barber?.name ?? '-'}</td>
                    {showMoney && (
                      <td className="whitespace-nowrap px-4 py-3 text-right text-white/85 tabular-nums">
                        {appointment.service?.price_cents != null ? formatPrice(appointment.service.price_cents) : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {isNotified ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                          <CheckCheck size={12} /> Avvisato
                        </span>
                      ) : !hasPhone ? (
                        <span className="inline-flex items-center gap-1 text-white/40">
                          <AlertCircle size={12} /> Tel. mancante
                        </span>
                      ) : appointment.status === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                          <Clock size={12} /> Da avvisare
                        </span>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canRemind && (
                          <button
                            type="button"
                            onClick={() => handleSendManualWhatsApp(appointment)}
                            className={`rounded-md p-2 transition ${isNotified ? 'text-emerald-400/70 hover:bg-emerald-500/10' : 'text-emerald-400 hover:bg-emerald-500/15'}`}
                            title={isNotified ? 'Re-invia promemoria WhatsApp' : 'Invia promemoria WhatsApp'}
                            aria-label={isNotified ? 'Re-invia promemoria WhatsApp' : 'Invia promemoria WhatsApp'}
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(appointment)}
                          className="rounded-md p-2 text-white/60 transition hover:bg-white/5 hover:text-gold"
                          title="Modifica"
                          aria-label={`Modifica prenotazione di ${appointment.customer_name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(appointment)}
                          disabled={isPending}
                          className="rounded-md p-2 text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                          title="Rimuovi"
                          aria-label={`Rimuovi prenotazione di ${appointment.customer_name}`}
                        >
                          {isPending ? <span className="text-xs">...</span> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
