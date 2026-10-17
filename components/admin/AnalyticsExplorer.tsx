'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Minus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsRow } from '@/lib/actions/booking-analytics';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  taglio: 'Taglio',
  baby: 'Baby',
  barba: 'Barba',
  styling: 'Styling',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const GOLD = '#cd9a4f';
/** Scala sequenziale a una tinta (oro), dal più tenue al più pieno. */
const HEAT = ['rgba(205,154,79,0.18)', 'rgba(205,154,79,0.5)', 'rgba(205,154,79,0.9)'];
const HEAT_LABELS = ['Bassa', 'Media', 'Alta'];

/** Giorno (YYYY-MM-DD) e mese (YYYY-MM) nel fuso di Foggia. */
function romeParts(iso: string) {
  const d = new Date(iso);
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return { day: s, month: s.slice(0, 7) };
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fmtDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function AnalyticsExplorer({ rows, hideMoney = false }: { rows: AnalyticsRow[]; hideMoney?: boolean }) {
  // Prenotazioni valide (le annullate non contano nelle statistiche)
  const valid = useMemo(() => rows.filter((r) => r.s !== 'cancelled' && r.ck !== '').map((r) => ({ ...r, ...romeParts(r.t) })), [rows]);

  const months = useMemo(() => Array.from(new Set(valid.map((r) => r.month))).sort().reverse(), [valid]);
  const todayMonth = romeParts(new Date().toISOString()).month;
  const [month, setMonth] = useState(months.includes(todayMonth) ? todayMonth : months[0] ?? todayMonth);
  const [category, setCategory] = useState('all');
  const [service, setService] = useState('all');
  const [barber, setBarber] = useState('all');

  const services = useMemo(() => {
    const m = new Map<string, { id: string; name: string; cat: string | null }>();
    valid.forEach((r) => r.sid && r.sn && m.set(r.sid, { id: r.sid, name: r.sn, cat: r.sc }));
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [valid]);
  const barbers = useMemo(() => {
    const m = new Map<string, string>();
    valid.forEach((r) => r.bid && r.bn && m.set(r.bid, r.bn));
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [valid]);

  const matches = (r: (typeof valid)[number]) =>
    (category === 'all' || r.sc === category) && (service === 'all' || r.sid === service) && (barber === 'all' || r.bid === barber);

  const inMonth = useMemo(() => valid.filter((r) => r.month === month && matches(r)), [valid, month, category, service, barber]); // eslint-disable-line react-hooks/exhaustive-deps
  const inPrev = useMemo(() => valid.filter((r) => r.month === prevMonth(month) && matches(r)), [valid, month, category, service, barber]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = inMonth.length;
  const revenue = inMonth.reduce((s, r) => s + r.p, 0);
  const cancelled = rows.filter(
    (r) =>
      r.s === 'cancelled' &&
      r.ck !== '' &&
      romeParts(r.t).month === month &&
      (category === 'all' || r.sc === category) &&
      (service === 'all' || r.sid === service) &&
      (barber === 'all' || r.bid === barber)
  ).length;

  // Prenotazioni per servizio
  const byService = useMemo(() => {
    const m = new Map<string, number>();
    inMonth.forEach((r) => r.sn && m.set(r.sn, (m.get(r.sn) ?? 0) + 1));
    return [...m.entries()].map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }, [inMonth, total]);

  // Calendario del mese
  const calendar = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunedì = 0
    const counts = new Map<string, number>();
    inMonth.forEach((r) => counts.set(r.day, (counts.get(r.day) ?? 0) + 1));
    const max = Math.max(0, ...counts.values());
    const cells: ({ day: string; n: number; num: number; dow: number } | null)[] = Array(first).fill(null);
    for (let d = 1; d <= days; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`;
      cells.push({ day: key, n: counts.get(key) ?? 0, num: d, dow: (first + d - 1) % 7 });
    }
    return { cells, max };
  }, [month, inMonth]);
  const level = (n: number) => (n === 0 || calendar.max === 0 ? -1 : n <= calendar.max / 3 ? 0 : n <= (calendar.max * 2) / 3 ? 1 : 2);

  // Clienti più attivi nel mese (escluse le chiusure dello staff)
  const topCustomers = useMemo(() => {
    const m = new Map<string, { name: string; n: number; last: string }>();
    inMonth.forEach((r) => {
      if (!r.ck) return;
      const e = m.get(r.ck) ?? { name: r.cn, n: 0, last: r.day };
      e.n += 1;
      if (r.day > e.last) e.last = r.day;
      m.set(r.ck, e);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 6);
  }, [inMonth]);

  // Servizi in crescita rispetto al mese precedente
  const growth = useMemo(() => {
    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    inMonth.forEach((r) => r.sn && cur.set(r.sn, (cur.get(r.sn) ?? 0) + 1));
    inPrev.forEach((r) => r.sn && prev.set(r.sn, (prev.get(r.sn) ?? 0) + 1));
    const names = new Set([...cur.keys(), ...prev.keys()]);
    return [...names]
      .map((name) => {
        const c = cur.get(name) ?? 0;
        const p = prev.get(name) ?? 0;
        return { name, c, p, pct: p === 0 ? null : Math.round(((c - p) / p) * 100) };
      })
      .sort((a, b) => (b.pct ?? Infinity) - (a.pct ?? Infinity) || b.c - a.c)
      .slice(0, 6);
  }, [inMonth, inPrev]);

  function exportCsv() {
    const header = ['Data', 'Ora', 'Cliente', 'Servizio', 'Categoria', 'Barbiere', 'Stato', ...(hideMoney ? [] : ['Importo'])];
    const lines = [...inMonth]
      .sort((a, b) => a.t.localeCompare(b.t))
      .map((r) => {
        const d = new Date(r.t);
        return [
          d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }),
          d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }),
          r.cn,
          r.sn ?? '',
          r.sc ? CATEGORY_LABELS[r.sc] ?? r.sc : '',
          r.bn ?? '',
          r.s === 'completed' ? 'Completato' : r.s === 'no_show' ? 'Non presentato' : 'Confermato',
          ...(hideMoney ? [] : [(r.p / 100).toFixed(2).replace('.', ',')]),
        ]
          .map(csvCell)
          .join(';');
      });
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleServices = category === 'all' ? services : services.filter((s) => s.cat === category);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Analisi dettagliata
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {monthLabel(month)}: <strong className="text-white/80">{total}</strong> prenotazioni ·{' '}
            {!hideMoney && (
              <>
                <strong className="text-white/80">{formatPrice(revenue)}</strong> di incasso previsto ·{' '}
              </>
            )}
            {cancelled} annullate
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={total === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-40"
        >
          <Download size={15} aria-hidden />
          Esporta
        </button>
      </div>

      {/* Filtri, tutti su una riga */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Mese', value: month, set: setMonth, options: months.map((m) => ({ v: m, l: monthLabel(m) })), all: null },
          {
            label: 'Categoria',
            value: category,
            set: (v: string) => {
              setCategory(v);
              setService('all');
            },
            options: Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ v, l })),
            all: 'Tutte',
          },
          { label: 'Servizio', value: service, set: setService, options: visibleServices.map((s) => ({ v: s.id, l: s.name })), all: 'Tutti' },
          { label: 'Barbiere', value: barber, set: setBarber, options: barbers.map((b) => ({ v: b.id, l: b.name })), all: 'Tutti' },
        ].map((f) => (
          <label key={f.label} className="admin-filter h-auto flex-col items-stretch gap-0 py-1.5">
            <span className="text-left text-[10px] uppercase tracking-wider text-white/40">{f.label}</span>
            <select value={f.value} onChange={(e) => f.set(e.target.value)} className="h-6 text-left">
              {f.all && <option value="all">{f.all}</option>}
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Prenotazioni per servizio */}
        <section className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="an-svc">
          <h2 id="an-svc" className="text-sm font-semibold text-white">
            Prenotazioni per servizio
          </h2>
          {byService.length === 0 ? (
            <p className="mt-10 text-center text-sm text-white/40">Nessuna prenotazione con questi filtri.</p>
          ) : (
            <>
              <div className="mt-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byService} margin={{ top: 18, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                      interval={0}
                      tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ background: '#151515', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                      itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
                      formatter={(value: number, _n, item) => [`${value} prenotazioni (${(item?.payload as { pct: number }).pct}%)`, '']}
                      separator=""
                    />
                    <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={56} label={{ position: 'top', fill: 'rgba(255,255,255,0.75)', fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-2 text-xs text-white/50">
                <summary className="cursor-pointer select-none hover:text-white/80">Vedi come tabella</summary>
                <table className="mt-2 w-full">
                  <tbody>
                    {byService.map((s) => (
                      <tr key={s.name} className="border-b border-white/5">
                        <td className="py-1 text-white/75">{s.name}</td>
                        <td className="py-1 text-right tabular-nums text-white/75">{s.count}</td>
                        <td className="py-1 text-right tabular-nums">{s.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>

        {/* Prenotazioni per giorno */}
        <section className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="an-cal">
          <h2 id="an-cal" className="text-sm font-semibold text-white">
            Prenotazioni per giorno
          </h2>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-1 text-[10px] uppercase tracking-wider text-white/40">
                {d}
              </span>
            ))}
            {calendar.cells.map((c, i) =>
              c ? (
                <span
                  key={c.day}
                  title={`${fmtDay(c.day)}: ${c.n} ${c.n === 1 ? 'prenotazione' : 'prenotazioni'}`}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-md border text-[11px] tabular-nums transition hover:ring-1 hover:ring-gold',
                    level(c.n) === -1 ? 'border-white/5 text-white/30' : 'border-transparent text-white'
                  )}
                  style={level(c.n) >= 0 ? { background: HEAT[level(c.n)], color: level(c.n) === 2 ? '#000' : undefined } : undefined}
                >
                  {c.num}
                  {c.n > 0 && <span className="text-[9px] leading-none opacity-80">{c.n}</span>}
                </span>
              ) : (
                <span key={`e${i}`} aria-hidden />
              )
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-white/55" aria-label="Legenda">
            {HEAT_LABELS.map((l, i) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: HEAT[i] }} aria-hidden />
                {l}
              </span>
            ))}
            <span className="ml-auto">Max {calendar.max}/giorno</span>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Clienti più attivi */}
        <section className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="an-cli">
          <h2 id="an-cli" className="text-sm font-semibold text-white">
            Clienti più attivi
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="w-8 py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 text-right font-semibold">Prenotazioni</th>
                <th className="py-2 text-right font-semibold">Ultima</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/40">
                    Nessun cliente nel periodo.
                  </td>
                </tr>
              ) : (
                topCustomers.map((c, i) => (
                  <tr key={c.name + i} className="border-t border-white/5">
                    <td className="py-2 text-white/40 tabular-nums">{i + 1}</td>
                    <td className="py-2 text-white/85">{c.name}</td>
                    <td className="py-2 text-right font-semibold text-white tabular-nums">{c.n}</td>
                    <td className="py-2 text-right text-white/55">{fmtDay(c.last)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Servizi in crescita */}
        <section className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="an-grw">
          <h2 id="an-grw" className="text-sm font-semibold text-white">
            Servizi in crescita <span className="font-normal text-white/40">vs {monthLabel(prevMonth(month)).toLowerCase()}</span>
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="py-2 font-semibold">Servizio</th>
                <th className="py-2 text-right font-semibold">Ora / Prima</th>
                <th className="py-2 text-right font-semibold">Variazione</th>
              </tr>
            </thead>
            <tbody>
              {growth.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-white/40">
                    Nessun dato da confrontare.
                  </td>
                </tr>
              ) : (
                growth.map((g) => (
                  <tr key={g.name} className="border-t border-white/5">
                    <td className="py-2 text-white/85">{g.name}</td>
                    <td className="py-2 text-right text-white/55 tabular-nums">
                      {g.c} / {g.p}
                    </td>
                    <td className="py-2 text-right">
                      {g.pct === null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300">
                          <ArrowUpRight size={13} aria-hidden /> Nuovo
                        </span>
                      ) : g.pct > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <ArrowUpRight size={13} aria-hidden /> +{g.pct}%
                        </span>
                      ) : g.pct < 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-300">
                          <ArrowDownRight size={13} aria-hidden /> {g.pct}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/50">
                          <Minus size={13} aria-hidden /> 0%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <p className="text-[11px] text-white/35">
        Le prenotazioni annullate non entrano nei conteggi. Le chiusure inserite dallo staff come prenotazione (es. &quot;chiusura&quot;, &quot;pausa&quot;, &quot;ferie&quot;) sono escluse.
      </p>
    </div>
  );
}
