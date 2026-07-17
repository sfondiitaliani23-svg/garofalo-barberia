'use client';

import { useCallback, useState, useMemo } from 'react';
import { type LiveTrafficData, type AnalyticsStats } from '@/lib/actions/analytics';
import { LiveTrafficChart } from '@/components/admin/LiveTrafficChart';
import { formatPrice, formatDuration } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { SITE_CONFIG } from '@/lib/site-config';

// Definiamo i tipi per gli appuntamenti in arrivo
interface CalendarAppointment {
  id: string;
  customer_name: string;
  customer_phone?: string;
  starts_at: string;
  notes?: string | null;
  barber?: { name: string } | null;
  service?: { name: string; price_cents: number; duration_minutes: number } | null;
}

interface PremiumDashboardProps {
  initialStats: AnalyticsStats;
  adminStats: {
    appointmentsToday: number;
    revenueToday: number;
    revenueWeek: number;
    totalCustomers: number;
    appointmentsHistory: number[];
    revenueHistory: number[];
    customersHistory: number[];
  };
  upcomingAppointments: CalendarAppointment[];
  yesterdayAppointments: CalendarAppointment[];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Sparkline({ data, color = '#c5a859' }: { data: number[]; color?: string }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div className="h-10 w-full mt-3 opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#sparkline-${color})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  sparklineData,
}: {
  title: string;
  value: string | number;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
  sparklineData: number[];
}) {
  return (
    <Card className="border-white/10 bg-[#111] hover:border-gold/30 transition-all duration-300 relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</span>
          <div className="rounded-lg bg-gold/15 p-2 text-gold">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        </div>

        <Sparkline data={sparklineData} />
      </CardContent>
    </Card>
  );
}

export function PremiumDashboard({
  initialStats,
  adminStats,
  upcomingAppointments,
  yesterdayAppointments,
}: PremiumDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'oggi' | 'ieri'>('ieri');
  const [trafficData, setTrafficData] = useState<LiveTrafficData | null>(null);

  // Gestione dell'aggiornamento real-time dei dati di traffico dal componente figlio
  const handleTrafficUpdate = useCallback((d: LiveTrafficData) => {
    setTrafficData(d);
  }, []);

  const liveVisitors = trafficData?.liveCount ?? initialStats.liveVisitors;
  const visitsToday = trafficData?.todayTotal ?? initialStats.dailyVisits;

  // Calcolo condizionale delle KPI card basato su Oggi vs Ieri
  const isToday = selectedPeriod === 'oggi';
  const appointmentsCount = isToday ? adminStats.appointmentsToday : (adminStats.appointmentsHistory?.[4] ?? 0);
  const revenueCount = isToday ? adminStats.revenueToday : (adminStats.revenueHistory?.[4] ?? 0);
  const visitsCount = isToday ? visitsToday : initialStats.yesterdayVisits;

  const appointmentsTitle = isToday ? 'Appuntamenti Oggi' : 'Appuntamenti Ieri';
  const revenueTitle = isToday ? 'Incasso Oggi' : 'Incasso Ieri';
  const visitsTitle = isToday ? 'Visite Oggi' : 'Visite Ieri';

  // Calcola il tasso di occupazione: assume max 48 slot per oggi/ieri (es: 3 barbieri * 16 appuntamenti)
  const occupancyRate = useMemo(() => {
    const capacity = 48; // capacità teorica
    const apts = isToday ? adminStats.appointmentsToday : (adminStats.appointmentsHistory?.[4] ?? 0);
    return Math.min(100, Math.round((apts / capacity) * 100));
  }, [isToday, adminStats.appointmentsToday, adminStats.appointmentsHistory]);

  const pieData = useMemo(() => [
    { name: 'Occupato', value: occupancyRate },
    { name: 'Libero', value: 100 - occupancyRate },
  ], [occupancyRate]);

  // Dati per il grafico a barre delle visite orarie (08:00 - 20:00)
  const barChartData = useMemo(() => {
    const hourlyData = isToday
      ? (trafficData?.todayHourly ?? Array(24).fill(0))
      : (trafficData?.yesterdayHourly ?? Array(24).fill(0));
    return Array.from({ length: 13 }, (_, i) => {
      const hourNum = i + 8; // dalle 08:00 alle 20:00
      return {
        hourLabel: `${hourNum}:00`,
        Visite: hourlyData[hourNum] ?? 0,
      };
    });
  }, [isToday, trafficData]);

  // Utilizziamo i dati storici reali passati dal server
  const appointmentsSparkline = useMemo(() => adminStats.appointmentsHistory ?? Array(6).fill(0), [adminStats.appointmentsHistory]);
  const revenueSparkline = useMemo(() => (adminStats.revenueHistory ?? Array(6).fill(0)).map(r => r / 100), [adminStats.revenueHistory]);
  
  // Per le visite, ricaviamo i dati live o storici
  const visitsHistoryReal = useMemo(() => {
    if (trafficData) {
      const hist = [...(initialStats.visitsHistory ?? Array(6).fill(0))];
      hist[hist.length - 1] = trafficData.todayTotal;
      return hist;
    }
    return initialStats.visitsHistory ?? Array(6).fill(0);
  }, [trafficData, initialStats.visitsHistory]);

  const visitsSparkline = visitsHistoryReal;
  const customersSparkline = useMemo(() => adminStats.customersHistory ?? Array(6).fill(0), [adminStats.customersHistory]);

  // Calcola il trend percentuale dinamico rispetto al giorno precedente (in base a oggi o ieri)
  const getTrendLabelForPeriod = useCallback((history: number[], isTodayMode: boolean) => {
    if (!history || history.length < 3) return '0%';
    const currentVal = isTodayMode ? history[history.length - 1] : history[history.length - 2];
    const prevVal = isTodayMode ? history[history.length - 2] : history[history.length - 3];
    if (prevVal === 0) {
      return currentVal > 0 ? `+${currentVal * 100}%` : '0%';
    }
    const pct = Math.round(((currentVal - prevVal) / prevVal) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }, []);

  const appointmentsTrend = useMemo(() => getTrendLabelForPeriod(appointmentsSparkline, isToday), [appointmentsSparkline, isToday, getTrendLabelForPeriod]);
  const revenueTrend = useMemo(() => getTrendLabelForPeriod(adminStats.revenueHistory ?? [], isToday), [adminStats.revenueHistory, isToday, getTrendLabelForPeriod]);
  const visitsTrend = useMemo(() => getTrendLabelForPeriod(visitsSparkline, isToday), [visitsSparkline, isToday, getTrendLabelForPeriod]);
  const customersTrend = useMemo(() => getTrendLabelForPeriod(customersSparkline, isToday), [customersSparkline, isToday, getTrendLabelForPeriod]);

  return (
    <div className="space-y-6">
      {/* ── SELETTORE PERIODO ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isToday ? 'Analisi di Oggi' : 'Analisi di Ieri'}
          </h2>
          <p className="text-xs text-white/50">
            {isToday ? 'Dati e traffico in tempo reale del salone' : 'Riepilogo delle statistiche consolidate di ieri'}
          </p>
        </div>
        <div className="flex self-start sm:self-center rounded-xl bg-[#161616] p-1 border border-white/5 shrink-0">
          <button
            onClick={() => setSelectedPeriod('oggi')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              isToday
                ? 'bg-gold text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Oggi
          </button>
          <button
            onClick={() => setSelectedPeriod('ieri')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              !isToday
                ? 'bg-gold text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Ieri
          </button>
        </div>
      </div>

      {/* ── SEZIONE 1: 4 KPI CARD CON SPARKLINE ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={appointmentsTitle}
          value={appointmentsCount}
          trend={appointmentsTrend}
          icon={Calendar}
          sparklineData={appointmentsSparkline}
        />
        <KpiCard
          title={revenueTitle}
          value={formatPrice(revenueCount)}
          trend={revenueTrend}
          icon={DollarSign}
          sparklineData={revenueSparkline}
        />
        <KpiCard
          title={visitsTitle}
          value={visitsCount}
          trend={visitsTrend}
          icon={TrendingUp}
          sparklineData={visitsSparkline}
        />
        <KpiCard
          title="Clienti Totali"
          value={adminStats.totalCustomers}
          trend={customersTrend}
          icon={Users}
          sparklineData={customersSparkline}
        />
      </div>

      {/* ── SEZIONE 2: GRAFICI DETTAGLIO (TRAFFICO + OCCUPAZIONE) ─────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafico del traffico (2/3) */}
        <div className="lg:col-span-2">
          <LiveTrafficChart onDataUpdate={handleTrafficUpdate} />
        </div>

        {/* Grafico Donut Tasso Occupazione (1/3) */}
        <div className="rounded-xl border border-white/10 bg-[#111] p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          
          <div>
            <h3 className="font-display text-lg uppercase text-gold">Tasso di Occupazione</h3>
            <p className="text-xs text-white/40 mt-1">Appuntamenti occupati vs slot disponibili {isToday ? 'oggi' : 'ieri'}</p>
          </div>

          <div className="relative flex items-center justify-center h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  <Cell fill="#c5a859" stroke="none" />
                  <Cell fill="rgba(255, 255, 255, 0.07)" stroke="none" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{occupancyRate}%</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Occupato</span>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-6 text-xs border-t border-white/5 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gold"></span>
              <span className="text-white/70">Prenotati ({appointmentsCount} slot)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-white/10"></span>
              <span className="text-white/50">Disponibili</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEZIONE 3: DETTAGLIO COMPLEMENTARE (VISITE ORARIE + LISTA PRENOTAZIONI) ─ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafico Visite Orarie a barre (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#111] p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          
          <div>
            <h3 className="font-display text-lg uppercase text-gold">Visite per Fascia Oraria</h3>
            <p className="text-xs text-white/40 mt-1">Visualizzazioni del sito registrate {isToday ? 'oggi' : 'ieri'} tra le 08:00 e le 20:00</p>
          </div>
 
          <div className="mt-6 h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c5a859" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#c5a859" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis
                  dataKey="hourLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161616',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                />
                <Bar dataKey="Visite" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        {/* Prossimi appuntamenti in arrivo (1/3) */}
        <div className="rounded-xl border border-white/10 bg-[#111] p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          
          <div>
            <h3 className="font-display text-lg uppercase text-gold">
              {isToday ? 'Appuntamenti in Arrivo' : 'Appuntamenti di Ieri'}
            </h3>
            <p className="text-xs text-white/40 mt-1">
              {isToday ? 'Le prossime prenotazioni da saldare in sede oggi' : 'Gli ultimi appuntamenti svolti nella giornata di ieri'}
            </p>
          </div>
 
          <div className="mt-5 flex-1 divide-y divide-white/5 max-h-[360px] overflow-y-auto pr-1 admin-modal-scroll">
            {(isToday ? upcomingAppointments : (yesterdayAppointments ?? [])).length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/40 py-8">
                <UserCheck className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-sm font-medium">Nessun appuntamento registrato</p>
              </div>
            ) : (
              (isToday ? upcomingAppointments : (yesterdayAppointments ?? [])).map((appointment) => {
                const startsAt = parseISO(appointment.starts_at);
                const initials = getInitials(appointment.customer_name);
                const timeLabel = format(startsAt, "HH:mm");
                const dateLabel = format(startsAt, "d MMM", { locale: it });
 
                return (
                  <div key={appointment.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-white/[0.01] transition-all px-1 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials badge */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 border border-gold/30 text-xs font-bold text-gold">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{appointment.customer_name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {appointment.service?.name ?? 'Servizio'} · {appointment.barber?.name ?? 'Staff'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <div className="text-right">
                        <p className="font-bold text-gold text-sm">{timeLabel}</p>
                        <p className="text-[10px] text-white/40">{dateLabel}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
