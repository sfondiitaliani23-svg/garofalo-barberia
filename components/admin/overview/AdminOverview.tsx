'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  Euro,
  Eye,
  MessageSquare,
  Plus,
  Receipt,
  Search,
  UserPlus,
  UserX,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  RANGES,
  computeOverview,
  monthlyComparison,
  weeklyComparison,
  type Kpi,
  type OverviewData,
  type RangeId,
  romeKey,
  todaySummary,
} from '@/lib/utils/dashboard-overview';
import { storageGet, storageSet } from '@/lib/utils/safe-storage';
import { AdminInstantBookingModal } from '@/components/admin/AdminInstantBookingModal';
import './overview.css';

/* Formati scritti a mano: identici sul server e nel browser (niente differenze di Intl). */
function group(n: number, decimals = 0) {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${g}${dec ? `,${dec}` : ''}`;
}
/** Un decimale solo se serve: 12,5 · 12 */
const dec1 = (n: number) => group(Math.round(n * 10) / 10, Number.isInteger(Math.round(n * 10) / 10) ? 0 : 1);
const eur0 = { format: (v: number) => `${group(Math.round(v))} €` };
const eur2 = { format: (v: number) => `${group(v, 2)} €` };
const num = { format: (v: number) => group(Math.round(v)) };
const money = (cents: number) => eur0.format(cents / 100);
const shortEur = (v: number) => (v >= 1000 ? `${dec1(v / 1000)}k €` : `${Math.round(v)} €`);
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const dayLabel = (key: string, withYear = false) =>
  `${Number(key.slice(8, 10))} ${MESI[Number(key.slice(5, 7)) - 1]}${withYear ? ` ${key.slice(0, 4)}` : ''}`;
/** "13 ott, 15:17" in ora di Roma, senza Intl variabile */
function romeDateTime(iso: string) {
  const ms = Date.parse(iso);
  const k = romeKey(ms);
  const parts = new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Rome' });
  return `${dayLabel(k)}, ${parts}`;
}

/** Saluto in ora di Roma, calcolato dall'orario del server: uguale sul server e nel browser. */
function greeting(nowIso: string) {
  const hour = Number(new Date(Date.parse(nowIso)).toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' }).slice(0, 2));
  if (hour < 13) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completato', cls: 'ov-badge--ok' },
  confirmed: { label: 'Confermato', cls: 'ov-badge--info' },
  cancelled: { label: 'Annullato', cls: 'ov-badge--bad' },
  no_show: { label: 'Non presentato', cls: 'ov-badge--warn' },
};

const CAT_COLORS = ['#e8b96a', '#c48f45', '#8f6631', '#5b4126'];

type Props = {
  data: OverviewData;
  visitsHistory: number[];
  userName: string;
  userRole: string;
  children?: React.ReactNode;
};

export function AdminOverview({ data, visitsHistory, userName, userRole, children }: Props) {
  const [range, setRange] = useState<RangeId>('30g');
  const [trendMode, setTrendMode] = useState<'mese' | 'settimana'>('mese');
  const [instantOpen, setInstantOpen] = useState(false);

  useEffect(() => {
    const saved = storageGet('gb_admin_range') as RangeId | null;
    if (saved && RANGES.some((r) => r.id === saved)) setRange(saved);
  }, []);

  const ov = useMemo(() => computeOverview(data, range, visitsHistory), [data, range, visitsHistory]);
  const trend = useMemo(() => (trendMode === 'mese' ? monthlyComparison(data) : weeklyComparison(data)), [data, trendMode]);
  const rangeText = ov.cur.from === ov.cur.to ? dayLabel(ov.cur.to, true) : `${dayLabel(ov.cur.from)} – ${dayLabel(ov.cur.to, true)}`;
  const year = ov.today.slice(0, 4);

  const changeRange = (r: RangeId) => {
    setRange(r);
    storageSet('gb_admin_range', r);
  };

  const today = useMemo(() => todaySummary(data), [data]);
  const maxBarber = Math.max(1, ...ov.barbers.map((b) => b.revenue));
  const maxService = Math.max(1, ...ov.topServices.map((s) => s.revenue));
  // Tester: niente incassi. I numeri sono già a zero dal server, qui si nascondono anche i riquadri.
  const hm = !!data.hideMoney;
  const servicesShown = hm ? [...ov.topServices].sort((a, b) => b.count - a.count) : ov.topServices;

  return (
    <div className="ov">
      <div className="ov-glow" aria-hidden />

      {/* ── Barra in alto ─────────────────────────────── */}
      <div className="ov-top">
        <form className="ov-search" action="/admin/clienti" role="search">
          <Search size={16} aria-hidden />
          <input name="q" type="search" placeholder="Cerca clienti per nome o telefono…" aria-label="Cerca clienti" />
          <kbd>Invio</kbd>
        </form>
        <div className="ov-top-right">
          <RangePicker value={range} onChange={changeRange} text={rangeText} />
          <Link href="/admin/messaggi" className="ov-bell" aria-label={`Messaggi${data.unread ? `: ${data.unread} da leggere` : ''}`}>
            <Bell size={18} />
            {data.unread > 0 && <span className="ov-bell-dot">{data.unread > 9 ? '9+' : data.unread}</span>}
          </Link>
          <div className="ov-user">
            <span className="ov-avatar" aria-hidden>
              {initials(userName) || 'A'}
            </span>
            <span className="ov-user-text">
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </span>
          </div>
        </div>
      </div>

      {/* ── Titolo ─────────────────────────────────────── */}
      <div className="ov-head">
        <p className="ov-eyebrow">Dashboard</p>
        <h1 className="ov-title">Barberia Garofalo</h1>
        <p className="ov-sub">Prenotazioni | {hm ? 'Clienti' : 'Incassi e clienti'} · {RANGES.find((r) => r.id === range)?.label}</p>
      </div>

      {/* ── Saluto e azioni rapide ─────────────────────── */}
      <section className="ov-quick" aria-label="Azioni rapide">
        <p className="ov-quick-hello">
          {greeting(data.now)}, <strong>{userName.split(' ')[0] || 'benvenuto'}</strong>
          <span> · {dayLabel(ov.today, true)}</span>
        </p>
        <div className="ov-quick-grid">
          <button type="button" className="ov-quick-btn" onClick={() => setInstantOpen(true)}>
            <Plus size={18} aria-hidden />
            <span>Nuova prenotazione</span>
          </button>
          <Link href="/admin/prenotazioni" className="ov-quick-btn">
            <CalendarDays size={18} aria-hidden />
            <span>Prenotazioni</span>
          </Link>
          <Link href="/admin/clienti" className="ov-quick-btn">
            <Search size={18} aria-hidden />
            <span>Cerca cliente</span>
          </Link>
          <Link href="/admin/messaggi" className="ov-quick-btn">
            <MessageSquare size={18} aria-hidden />
            <span>Messaggi e avvisi</span>
            {data.unread > 0 && <b className="ov-quick-badge" aria-label={`${data.unread} da leggere`}>{data.unread > 9 ? '9+' : data.unread}</b>}
          </Link>
        </div>
      </section>
      <AdminInstantBookingModal isOpen={instantOpen} onClose={() => setInstantOpen(false)} />

      {/* ── Oggi ───────────────────────────────────────── */}
      <section className="ov-card ov-today" aria-label="Riepilogo di oggi">
        <div className="ov-today-head">
          <h2 className="ov-h2">Oggi</h2>
          <Link href="/admin/prenotazioni" className="ov-link">Apri prenotazioni</Link>
        </div>
        {today.total === 0 ? (
          <p className="ov-empty">Nessuna prenotazione per oggi{today.tomorrow ? `. Domani: ${today.tomorrow}.` : '.'}</p>
        ) : (
          <>
            <p className="ov-today-line">
              <strong>{today.total}</strong> {today.total === 1 ? 'prenotazione' : 'prenotazioni'}
              {today.firstTime && today.lastTime ? ` dalle ${today.firstTime} alle ${today.lastTime}` : ''}
              {today.remaining > 0 ? ` · ancora ${today.remaining} da fare` : ' · tutte fatte'}
              {today.cancelled > 0 ? ` · ${today.cancelled} annullate` : ''}
              {today.tomorrow > 0 ? ` · domani ${today.tomorrow}` : ''}
            </p>
            <div
              className="ov-progress"
              role="progressbar"
              aria-label="Prenotazioni di oggi già fatte"
              aria-valuemin={0}
              aria-valuemax={today.total}
              aria-valuenow={Math.max(0, today.total - today.remaining)}
            >
              <span className="ov-progress-fill" style={{ width: `${Math.round((Math.max(0, today.total - today.remaining) / today.total) * 100)}%` }} />
            </div>
            <p className="ov-progress-label">{Math.max(0, today.total - today.remaining)} su {today.total} fatte</p>
            {today.next && (
              <p className="ov-today-next">
                Prossima alle <strong>{today.next.time}</strong>{today.next.barber ? ` con ${today.next.barber.split(' ')[0]}` : ''}{today.next.service ? `, ${today.next.service}` : ''}
              </p>
            )}
            <ul className="ov-today-barbers">
              {today.perBarber.map((b) => (
                <li key={b.name}>
                  <span>{b.name.split(' ')[0]}</span>
                  <strong>{b.count}</strong>
                  {b.next && <small>prossima {b.next}</small>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── KPI ────────────────────────────────────────── */}
      <section className="ov-kpis" aria-label="Numeri principali">
        {!hm && <KpiCard icon={<Euro size={20} />} label="Incasso" value={money(ov.kpis.revenue.value)} kpi={ov.kpis.revenue} vs={ov.prevLabel} />}
        <KpiCard icon={<CalendarCheck size={20} />} label="Appuntamenti" value={num.format(ov.kpis.appointments.value)} kpi={ov.kpis.appointments} vs={ov.prevLabel} />
        {!hm && <KpiCard icon={<Receipt size={20} />} label="Scontrino medio" value={eur2.format(ov.kpis.avgTicket.value / 100)} kpi={ov.kpis.avgTicket} vs={ov.prevLabel} />}
        <KpiCard icon={<UserPlus size={20} />} label="Nuovi clienti" value={num.format(ov.kpis.newCustomers.value)} kpi={ov.kpis.newCustomers} vs={ov.prevLabel} />
        <KpiCard
          icon={<Eye size={20} />}
          label={range === 'anno' ? 'Visite al sito · 30 gg' : 'Visite al sito'}
          value={num.format(ov.kpis.visits.value)}
          kpi={ov.kpis.visits}
          vs={range === 'anno' ? 'vs 30 gg prima' : ov.prevLabel}
        />
        <KpiCard
          icon={<UserX size={20} />}
          label="Disdette e assenze"
          value={`${dec1(ov.kpis.lostRate.value)}%`}
          kpi={ov.kpis.lostRate}
          vs={ov.prevLabel}
          lowerIsBetter
        />
      </section>

      {/* ── Grafici ────────────────────────────────────── */}
      {!hm && (
      <section className="ov-grid ov-grid--charts">
        <div className="ov-card ov-trend">
          <div className="ov-card-head">
            <div>
              <h2 className="ov-h2">Incassi: {year} contro {Number(year) - 1}</h2>
              <div className="ov-legend">
                <span>
                  <i className="ov-dot ov-dot--cur" /> Quest&apos;anno
                </span>
                <span>
                  <i className="ov-dot ov-dot--prev" /> Anno scorso
                </span>
              </div>
            </div>
            <label className="ov-select">
              <span className="sr-only">Raggruppa per</span>
              <select value={trendMode} onChange={(e) => setTrendMode(e.target.value as 'mese' | 'settimana')}>
                <option value="mese">Mensile</option>
                <option value="settimana">Settimanale</option>
              </select>
              <ChevronDown size={14} aria-hidden />
            </label>
          </div>
          <div className="ov-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
                <defs>
                  <linearGradient id="ovCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0c378" />
                    <stop offset="100%" stopColor="#b27d39" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} tickFormatter={shortEur} width={52} />
                <Tooltip cursor={{ fill: 'rgba(232,185,106,0.06)' }} content={<TrendTooltip />} />
                <Bar dataKey="lastYear" name="Anno scorso" fill="#34302a" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="thisYear" name="Quest'anno" fill="url(#ovCur)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ov-card ov-barbers">
          <div className="ov-card-head">
            <h2 className="ov-h2">Incasso per barbiere</h2>
          </div>
          <div className="ov-barbers-body">
            <ul className="ov-pins">
              {ov.barbers.length === 0 && <li className="ov-empty">Nessun dato nel periodo</li>}
              {ov.barbers.map((b) => {
                const share = b.revenue / maxBarber;
                return (
                  <li key={b.id} className="ov-pin" style={{ ['--share' as string]: share.toFixed(3) }}>
                    <span className="ov-pin-avatar">
                      {b.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.image} alt="" loading="lazy" />
                      ) : (
                        initials(b.name)
                      )}
                    </span>
                    <span className="ov-pin-text">
                      <span className="ov-pin-name">{b.name.split(' ')[0]}</span>
                      <strong>{money(b.revenue)}</strong>
                    </span>
                    <span className="ov-pin-bar" aria-hidden>
                      <span />
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="ov-heat" aria-hidden>
              <span>Alto</span>
              <i />
              <span>Basso</span>
            </div>
          </div>
        </div>

        <div className="ov-card ov-cats">
          <div className="ov-card-head">
            <h2 className="ov-h2">Incasso per categoria</h2>
          </div>
          <div className="ov-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ov.catTotal ? ov.categories : [{ label: 'Nessun dato', value: 1 }]}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={ov.catTotal ? 2 : 0}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {(ov.catTotal ? ov.categories : [0]).map((_, i) => (
                    <Cell key={i} fill={ov.catTotal ? CAT_COLORS[i % CAT_COLORS.length] : 'rgba(255,255,255,0.07)'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="ov-donut-center">
              <strong>{money(ov.catTotal)}</strong>
              <span>Incasso totale</span>
            </div>
          </div>
          <ul className="ov-cat-list">
            {ov.categories.map((c, i) => (
              <li key={c.id}>
                <span>
                  <i style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                  {c.label}
                </span>
                <strong>{dec1(c.share)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {/* ── Tabelle ────────────────────────────────────── */}
      <section className="ov-grid ov-grid--tables">
        <div className="ov-card">
          <div className="ov-card-head">
            <h2 className="ov-h2">Servizi più richiesti</h2>
            <Link href="/admin/servizi" className="ov-link">
              Vedi tutti →
            </Link>
          </div>
          <div className="ov-table-wrap">
            <table className="ov-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servizio</th>
                  {hm ? <th className="num">Volte</th> : (
                    <>
                      <th className="num">Incasso</th>
                      <th className="num">Crescita</th>
                      <th className="ov-col-bar">
                        <span className="sr-only">Quota</span>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {ov.topServices.length === 0 && (
                  <tr>
                    <td colSpan={hm ? 3 : 5} className="ov-empty">
                      Nessun servizio nel periodo
                    </td>
                  </tr>
                )}
                {servicesShown.map((s, i) => (
                  <tr key={s.name}>
                    <td className="muted">{i + 1}</td>
                    <td className="strong">
                      {s.name}
                      {!hm && <small>{s.count} volte</small>}
                    </td>
                    {hm ? (
                      <td className="num">{num.format(s.count)}</td>
                    ) : (
                      <>
                        <td className="num">{money(s.revenue)}</td>
                        <td className="num">
                          <Change value={s.change} />
                        </td>
                        <td className="ov-col-bar">
                          <span className="ov-meter">
                            <span style={{ width: `${Math.max(4, (s.revenue / maxService) * 100)}%` }} />
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ov-card">
          <div className="ov-card-head">
            <h2 className="ov-h2">Rendimento barbieri</h2>
            <Link href="/admin/staff" className="ov-link">
              Vedi team →
            </Link>
          </div>
          <div className="ov-table-wrap">
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Barbiere</th>
                  <th className="num">Appunt.</th>
                  {!hm && <th className="num">Medio</th>}
                  <th className="num">Disdette</th>
                  <th className="ov-col-trend">Andamento</th>
                </tr>
              </thead>
              <tbody>
                {ov.barbers.map((b) => (
                  <tr key={b.id}>
                    <td className="strong">
                      {b.name}
                      <small>
                        {dec1(b.hours)} ore · {b.customers} clienti
                      </small>
                    </td>
                    <td className="num">{num.format(b.count)}</td>
                    {!hm && <td className="num">{eur0.format(b.avg / 100)}</td>}
                    <td className="num">{dec1(b.lostRate)}%</td>
                    <td className="ov-col-trend">
                      <Spark data={b.spark} className="ov-spark-row" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ov-card">
          <div className="ov-card-head">
            <h2 className="ov-h2">Ultime prenotazioni</h2>
            <Link href="/admin/prenotazioni" className="ov-link">
              Vedi tutte →
            </Link>
          </div>
          <div className="ov-table-wrap">
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Cliente</th>
                  {!hm && <th className="num">Importo</th>}
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 && (
                  <tr>
                    <td colSpan={hm ? 3 : 4} className="ov-empty">
                      Nessuna prenotazione
                    </td>
                  </tr>
                )}
                {data.recent.slice(0, 6).map((r) => {
                  const st = STATUS[r.status] ?? { label: r.status, cls: '' };
                  return (
                    <tr key={r.id}>
                      <td className="mono">#{r.id.slice(0, 4).toUpperCase()}</td>
                      <td className="strong">
                        {r.name}
                        <small>
                          {romeDateTime(r.startsAt)}
                          {r.barber ? ` · ${r.barber.split(' ')[0]}` : ''}
                        </small>
                      </td>
                      {!hm && <td className="num">{eur0.format(r.amount / 100)}</td>}
                      <td>
                        <span className={`ov-badge ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {children}

      <footer className="ov-foot">
        <span>© {year} Barberia Garofalo · Area amministrazione</span>
        <nav aria-label="Link utili">
          <Link href="/" target="_blank">
            Sito
          </Link>
          <Link href="/privacy" target="_blank">
            Privacy
          </Link>
          <Link href="/admin/segnalazioni">Assistenza</Link>
        </nav>
      </footer>
    </div>
  );
}

/* ── Pezzi ────────────────────────────────────────────── */

function RangePicker({ value, onChange, text }: { value: RangeId; onChange: (r: RangeId) => void; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="ov-range" ref={ref}>
      <button type="button" className="ov-range-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <CalendarDays size={16} aria-hidden />
        <span>{text}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul className="ov-range-menu" role="listbox" aria-label="Periodo">
          {RANGES.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                aria-selected={r.id === value}
                className={r.id === value ? 'is-on' : ''}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Change({ value, lowerIsBetter = false, suffix }: { value: number | null; lowerIsBetter?: boolean; suffix?: string }) {
  if (value === null) return <span className="ov-change ov-change--new">nuovo{suffix ? ` ${suffix}` : ''}</span>;
  const up = value > 0;
  const good = value === 0 ? null : lowerIsBetter ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`ov-change ${good === null ? '' : good ? 'ov-change--good' : 'ov-change--bad'}`}>
      {value !== 0 && <Icon size={13} aria-hidden />}
      {up ? '+' : ''}
      {dec1(value)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  kpi,
  vs,
  lowerIsBetter,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  kpi: Kpi;
  vs: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="ov-card ov-kpi">
      <span className="ov-kpi-icon" aria-hidden>
        {icon}
      </span>
      <div className="ov-kpi-body">
        <p className="ov-kpi-label">{label}</p>
        <p className="ov-kpi-value">{value}</p>
        <Change value={kpi.change} lowerIsBetter={lowerIsBetter} suffix={vs} />
      </div>
      <Spark data={kpi.spark} className="ov-kpi-spark" />
    </div>
  );
}

/** Linea leggera in SVG (niente libreria: si disegna all'istante). */
function Spark({ data, className }: { data: number[]; className?: string }) {
  const id = `sp${useId().replace(/:/g, '')}`;
  const pts = data.length > 1 ? data : [0, ...(data.length ? data : [0])];
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const w = 100;
  const h = 32;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, max === min ? h * 0.65 : h - 3 - ((v - min) / (max - min)) * (h - 8)] as const);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b96a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e8b96a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="#e8b96a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p) => p.dataKey === 'thisYear')?.value;
  const prev = payload.find((p) => p.dataKey === 'lastYear')?.value ?? 0;
  return (
    <div className="ov-tip">
      <p className="ov-tip-title">{label}</p>
      <p>
        <i className="ov-dot ov-dot--cur" /> Quest&apos;anno <strong>{cur === null || cur === undefined ? '—' : eur0.format(cur)}</strong>
      </p>
      <p>
        <i className="ov-dot ov-dot--prev" /> Anno scorso <strong>{eur0.format(prev)}</strong>
      </p>
    </div>
  );
}
