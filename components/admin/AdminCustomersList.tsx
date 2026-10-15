'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Images, MessageCircle, Pencil, Phone, Search, Trash2 } from 'lucide-react';
import type { Profile } from '@/types/database';
import type { CustomerActivity } from '@/lib/actions/admin';
import type { PresenceSnapshot } from '@/lib/utils/presence';
import { PresenceDot, usePresence } from '@/components/admin/PresencePanel';
import { DeleteCustomerDialog, EditCustomerDialog } from '@/components/admin/AdminCustomerDialogs';

interface AdminCustomersListProps {
  customers: Profile[];
  activity?: Record<string, CustomerActivity>;
  presence?: PresenceSnapshot;
  /** Il tester guarda ma non modifica: niente pulsanti Modifica/Elimina. */
  readOnly?: boolean;
}

type StatusFilter = 'all' | 'active' | 'upcoming' | 'never';
type PeriodFilter = 'all' | '30' | '90' | '365';

const PAGE_SIZE = 10;
/** Cliente "attivo": ha prenotato negli ultimi 90 giorni o ha un appuntamento futuro. */
const ACTIVE_DAYS = 90;

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().trim();
}

function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function whatsappNumber(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('39')) return digits;
  if (digits.startsWith('3') && digits.length >= 9) return `39${digits}`;
  return digits;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
}

function matchesQuery(customer: Profile, query: string) {
  if (!query) return true;
  const haystack = [customer.full_name, customer.email, customer.phone, customer.hair_preferences, customer.personal_notes]
    .map(normalize)
    .join(' ');
  return haystack.includes(query);
}

export function AdminCustomersList({ customers, activity = {}, presence: presenceInit, readOnly = false }: AdminCustomersListProps) {
  const presence = usePresence(presenceInit ?? { byUser: {}, team: [], onlineCustomers: [], generatedAt: '' });
  const [search, setSearch] = useState('');
  // Ricerca arrivata dalla dashboard (?q=...)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q.slice(0, 80));
  }, []);
  const [service, setService] = useState('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);

  const now = Date.now();
  const isActive = (id: string) => {
    const a = activity[id];
    if (!a) return false;
    if (a.hasUpcoming) return true;
    return !!a.lastAppointmentAt && now - new Date(a.lastAppointmentAt).getTime() <= ACTIVE_DAYS * 86_400_000;
  };

  const serviceOptions = useMemo(
    () =>
      Array.from(new Set(Object.values(activity).map((a) => a.lastServiceName).filter((x): x is string => !!x))).sort((a, b) =>
        a.localeCompare(b, 'it')
      ),
    [activity]
  );

  const query = normalize(search);
  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (!matchesQuery(c, query)) return false;
        const a = activity[c.id];
        if (service !== 'all' && a?.lastServiceName !== service) return false;
        if (period !== 'all') {
          if (!a?.lastAppointmentAt) return false;
          if (now - new Date(a.lastAppointmentAt).getTime() > Number(period) * 86_400_000) return false;
        }
        if (status === 'active' && !isActive(c.id)) return false;
        if (status === 'upcoming' && !a?.hasUpcoming) return false;
        if (status === 'never' && a) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, activity, query, service, period, status]
  );

  useEffect(() => setPage(1), [query, service, period, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtersActive = query !== '' || service !== 'all' || period !== 'all' || status !== 'all';

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className="admin-filter">
          <Search size={14} aria-hidden />
          <span className="sr-only">Cerca cliente</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente..." />
        </label>
        <label className="admin-filter">
          <span className="sr-only">Ultimo servizio</span>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="all">Tutti i servizi</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-filter">
          <span className="sr-only">Periodo ultima prenotazione</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)}>
            <option value="all">Tutti i periodi</option>
            <option value="30">Ultimi 30 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
            <option value="365">Ultimo anno</option>
          </select>
        </label>
        <label className="admin-filter">
          <span className="sr-only">Stato</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">Stato: tutti</option>
            <option value="active">Attivi (ultimi 90 giorni)</option>
            <option value="upcoming">Con appuntamento futuro</option>
            <option value="never">Mai prenotato</option>
          </select>
        </label>
      </div>
      {filtersActive && (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setService('all');
            setPeriod('all');
            setStatus('all');
          }}
          className="text-xs text-gold hover:underline"
        >
          Azzera filtri
        </button>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0c0c0c]">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/45">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Telefono</th>
              <th className="px-4 py-3 font-semibold">Ultima prenotazione</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Sul sito</th>
              <th className="px-4 py-3 font-semibold text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/45">
                  {filtersActive ? 'Nessun cliente corrisponde ai filtri.' : 'Nessun cliente registrato.'}
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const a = activity[c.id];
                const active = isActive(c.id);
                const wa = whatsappNumber(c.phone);
                return (
                  <tr key={c.id} className="border-b border-white/5 transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clienti/${c.id}/galleria`} className="group flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-[11px] font-bold text-gold">
                          {initials(c.full_name)}
                        </span>
                        <span className="font-semibold text-white transition group-hover:text-gold">{c.full_name || '—'}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/70">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-white/70">
                      {fmtDate(a?.lastAppointmentAt)}
                      {a?.lastServiceName && <span className="block text-[11px] text-white/40">{a.lastServiceName}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                          Attivo
                        </span>
                      ) : a ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/55">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/40" aria-hidden />
                          Inattivo
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/35">Mai prenotato</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PresenceDot info={presence.byUser[c.id]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="rounded-md p-2 text-white/55 transition hover:bg-white/5 hover:text-gold" title="Chiama" aria-label={`Chiama ${c.full_name ?? ''}`}>
                            <Phone size={15} />
                          </a>
                        )}
                        {wa && (
                          <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-2 text-emerald-400/80 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                            title="WhatsApp"
                            aria-label={`Scrivi su WhatsApp a ${c.full_name ?? ''}`}
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <Link
                          href={`/admin/clienti/${c.id}/galleria`}
                          className="rounded-md p-2 text-white/55 transition hover:bg-white/5 hover:text-gold"
                          title="Galleria cliente"
                          aria-label={`Galleria di ${c.full_name ?? ''}`}
                        >
                          <Images size={15} />
                        </Link>
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing(c)}
                              className="rounded-md p-2 text-white/55 transition hover:bg-white/5 hover:text-gold"
                              title="Modifica cliente"
                              aria-label={`Modifica ${c.full_name ?? 'cliente'}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(c)}
                              className="rounded-md p-2 text-white/55 transition hover:bg-red-500/10 hover:text-red-400"
                              title="Elimina cliente"
                              aria-label={`Elimina ${c.full_name ?? 'cliente'}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
        <span>
          {filtered.length === 0
            ? '0 clienti'
            : `Mostrati ${(current - 1) * PAGE_SIZE + 1}-${Math.min(current * PAGE_SIZE, filtered.length)} di ${filtered.length} clienti`}
        </span>
        {pages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagine">
            <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} className="rounded-md p-1.5 hover:text-gold disabled:opacity-30" aria-label="Pagina precedente">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center">
                  {i > 0 && n - arr[i - 1] > 1 && <span className="px-1">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === current ? 'page' : undefined}
                    className={`h-7 min-w-7 rounded-md px-2 font-semibold ${n === current ? 'bg-gold text-black' : 'hover:text-gold'}`}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} className="rounded-md p-1.5 hover:text-gold disabled:opacity-30" aria-label="Pagina successiva">
              <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </div>

      {editing && <EditCustomerDialog key={editing.id} customer={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteCustomerDialog customer={deleting} hasUpcoming={!!activity[deleting.id]?.hasUpcoming} onClose={() => setDeleting(null)} />}
    </div>
  );
}
