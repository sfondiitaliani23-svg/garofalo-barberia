'use client';

import { useId, useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Euro,
  Eye,
  Receipt,
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
} from '@/lib/utils/dashboard-overview';
import { storageGet, storageSet } from '@/lib/utils/safe-storage';
import './overview/overview.css';

/* Formati numerici e valuta */
function group(n: number, decimals = 0) {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + g + (dec ? ',' + dec : '');
}

const dec1 = (n: number) => group(Math.round(n * 10) / 10, Number.isInteger(Math.round(n * 10) / 10) ? 0 : 1);
const eur0 = { format: (v: number) => group(Math.round(v)) + ' €' };
const eur2 = { format: (v: number) => group(v, 2) + ' €' };
const num = { format: (v: number) => group(Math.round(v)) };
const money = (cents: number) => eur0.format(cents / 100);
const shortEur = (v: number) => (v >= 1000 ? dec1(v / 1000) + 'k €' : Math.round(v) + ' €');

const CAT_COLORS = ['#e8b96a', '#b27d39', '#f0c378', '#7a5523', '#d9a857'];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function AnalyticsOverviewSection({
  overview,
  visitsHistory,
  hideMoney = false,
}: {
  overview: OverviewData;
  visitsHistory: number[];
  hideMoney?: boolean;
}) {
  const [range, setRange] = useState<RangeId>(() => (storageGet('garofalo_analytics_range') as RangeId) || 'oggi');
  const [trendMode, setTrendMode] = useState<'mese' | 'settimana'>('mese');

  const changeRange = (r: RangeId) => {
    setRange(r);
    storageSet('garofalo_analytics_range', r);
  };

  const ov = useMemo(
    () => computeOverview(overview, range, visitsHistory),
    [overview, range, visitsHistory]
  );

  const year = overview.now.slice(0, 4);
  const trend = useMemo(
    () => (trendMode === 'settimana' ? weeklyComparison(overview) : monthlyComparison(overview)),
    [overview, trendMode]
  );

  const maxBarber = Math.max(1, ...ov.barbers.map((b) => b.revenue));
  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? 'Oggi';

  return (
    <div className="space-y-6">
      {/* Intestazione Sezione Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif text-white tracking-wide">
            Indicatori Economici & Performance
          </h2>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            Dati finanziari, conversioni e andamento — Periodo selezionato: <span className="text-gold font-medium">{rangeLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RangePicker value={range} onChange={changeRange} text={rangeLabel} />
        </div>
      </div>

      {/* KPI Cards: 6 card complete */}
      <section className="ov-kpis" aria-label="Indicatori principali">
        {!hideMoney && (
          <KpiCard
            icon={<Euro size={20} />}
            label="Incasso"
            value={money(ov.kpis.revenue.value)}
            kpi={ov.kpis.revenue}
            vs={ov.prevLabel}
          />
        )}
        <KpiCard
          icon={<CalendarCheck size={20} />}
          label="Appuntamenti"
          value={num.format(ov.kpis.appointments.value)}
          kpi={ov.kpis.appointments}
          vs={ov.prevLabel}
        />
        {!hideMoney && (
          <KpiCard
            icon={<Receipt size={20} />}
            label="Scontrino medio"
            value={eur2.format(ov.kpis.avgTicket.value / 100)}
            kpi={ov.kpis.avgTicket}
            vs={ov.prevLabel}
          />
        )}
        <KpiCard
          icon={<UserPlus size={20} />}
          label="Nuovi clienti"
          value={num.format(ov.kpis.newCustomers.value)}
          kpi={ov.kpis.newCustomers}
          vs={ov.prevLabel}
        />
        <KpiCard
          icon={<Eye size={20} />}
          label={range === 'anno' ? 'Visite al sito • 30 gg' : 'Visite al sito'}
          value={num.format(ov.kpis.visits.value)}
          kpi={ov.kpis.visits}
          vs={range === 'anno' ? 'vs 30 gg prima' : ov.prevLabel}
        />
        <KpiCard
          icon={<UserX size={20} />}
          label="Disdette e assenze"
          value={dec1(ov.kpis.lostRate.value) + '%'}
          kpi={ov.kpis.lostRate}
          vs={ov.prevLabel}
          lowerIsBetter
        />
      </section>

      {/* Grafici Finanziari e di Rendimento */}
      {!hideMoney && (
        <section className="ov-grid ov-grid--charts">
          {/* Trend Incassi Anno su Anno */}
          <div className="ov-card ov-trend">
            <div className="ov-card-head">
              <div>
                <h3 className="ov-h2 text-base font-medium">Incassi: {year} contro {Number(year) - 1}</h3>
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
                    <linearGradient id="anCur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0c378" />
                      <stop offset="100%" stopColor="#b27d39" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} tickFormatter={shortEur} width={52} />
                  <Tooltip cursor={{ fill: 'rgba(232,185,106,0.06)' }} content={<TrendTooltip />} />
                  <Bar dataKey="lastYear" name="Anno scorso" fill="#34302a" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="thisYear" name="Quest'anno" fill="url(#anCur)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incasso per Barbiere */}
          <div className="ov-card ov-barbers">
            <div className="ov-card-head">
              <h3 className="ov-h2 text-base font-medium">Incasso per barbiere</h3>
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

          {/* Incasso per Categoria */}
          <div className="ov-card ov-cats">
            <div className="ov-card-head">
              <h3 className="ov-h2 text-base font-medium">Incasso per categoria</h3>
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
    </div>
  );
}

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
        <ChevronDown size={14} className={open ? 'ov-rot' : ''} aria-hidden />
      </button>
      {open && (
        <ul className="ov-range-menu" role="listbox">
          {RANGES.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={'ov-range-item ' + (r.id === value ? 'ov-range-item--active' : '')}
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

function Change({ value, lowerIsBetter = false, suffix }: { value: number | null; lowerIsBetter?: boolean; suffix?: string }) {
  if (value === null) return <span className="ov-change ov-change--new">nuovo{suffix ? ' ' + suffix : ''}</span>;
  const up = value > 0;
  const good = value === 0 ? null : lowerIsBetter ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={'ov-change ' + (good === null ? '' : good ? 'ov-change--good' : 'ov-change--bad')}>
      {value !== 0 && <Icon size={13} aria-hidden />}
      {up ? '+' : ''}
      {dec1(value)}%{suffix ? ' ' + suffix : ''}
    </span>
  );
}

function Spark({ data, className }: { data: number[]; className?: string }) {
  const id = 'span_' + useId().replace(/:/g, '');
  const pts = data.length > 1 ? data : [0, ...(data.length ? data : [0])];
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const w = 100;
  const h = 32;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, max === min ? h * 0.65 : h - 3 - ((v - min) / (max - min)) * (h - 8)] as const);
  const line = xy.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return (
    <svg className={className} viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b96a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e8b96a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line + ' L' + w + ' ' + h + ' L0 ' + h + ' Z'} fill={'url(#' + id + ')'} />
      <path d={line} fill="none" stroke="#e8b96a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p) => p.dataKey === 'thisYear')?.value;
  const prev = payload.find((p) => p.dataKey === 'lastYear')?.value;
  return (
    <div className="ov-tt">
      <p className="ov-tt-label">{label}</p>
      {cur != null && (
        <p className="ov-tt-row">
          <span className="ov-tt-key">Quest&apos;anno:</span>
          <strong>{eur0.format(cur / 100)}</strong>
        </p>
      )}
      {prev != null && (
        <p className="ov-tt-row muted">
          <span className="ov-tt-key">Anno scorso:</span>
          <strong>{eur0.format(prev / 100)}</strong>
        </p>
      )}
    </div>
  );
}
