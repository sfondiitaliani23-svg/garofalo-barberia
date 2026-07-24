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
  const [selectedPeriod, setSelectedPeriod] = useState<'oggi' | 'ieri' | '7giorni' | '30giorni'>('ieri');
  const [trafficData, setTrafficData] = useState<LiveTrafficData | null>(null);

  // Gestione dell'aggiornamento real-time dei dati di traffico dal componente figlio
  const handleTrafficUpdate = useCallback((d: LiveTrafficData) => {
    setTrafficData(d);
  }, []);

  const liveVisitors = trafficData?.liveCount ?? initialStats.liveVisitors;
  const visitsToday = trafficData?.todayTotal ?? initialStats.dailyVisits;

  // Dati storici reali passati dal server
  const appointmentsSparkline = useMemo(() => adminStats.appointmentsHistory ?? Array(60).fill(0), [adminStats.appointmentsHistory]);
  const revenueSparkline = useMemo(() => adminStats.revenueHistory ?? Array(60).fill(0), [adminStats.revenueHistory]);
  const customersSparkline = useMemo(() => adminStats.customersHistory ?? Array(60).fill(0), [adminStats.customersHistory]);
  
  // Per le visite, ricaviamo i dati live o storici
  const visitsSparkline = useMemo(() => {
    if (trafficData) {
      const hist = [...(initialStats.visitsHistory ?? Array(60).fill(0))];
      hist[hist.length - 1] = trafficData.todayTotal;
      return hist;
    }
    return initialStats.visitsHistory ?? Array(60).fill(0);
  }, [trafficData, initialStats.visitsHistory]);

  // Calcolo condizionale delle KPI card basato su Oggi, Ieri, 7 Giorni, 30 Giorni
  const metrics = useMemo(() => {
    const getValuesForPeriod = (timeline: number[], isRevenue = false) => {
      const len = timeline.length; // dovrebbe essere 60
      let currentVal = 0;
      let prevVal = 0;
      let sparkline: number[] = [];

      if (selectedPeriod === 'oggi') {
        currentVal = timeline[len - 1] ?? 0;
        prevVal = timeline[len - 2] ?? 0;
        sparkline = timeline.slice(len - 6, len);
      } else if (selectedPeriod === 'ieri') {
        currentVal = timeline[len - 2] ?? 0;
        prevVal = timeline[len - 3] ?? 0;
        sparkline = timeline.slice(len - 7, len - 1);
      } else if (selectedPeriod === '7giorni') {
        const last7 = timeline.slice(len - 7, len);
        const prev7 = timeline.slice(len - 14, len - 7);
        currentVal = last7.reduce((a, b) => a + b, 0);
        prevVal = prev7.reduce((a, b) => a + b, 0);
        sparkline = last7;
      } else if (selectedPeriod === '30giorni') {
        const last30 = timeline.slice(len - 30, len);
        const prev30 = timeline.slice(len - 60, len - 30);
        currentVal = last30.reduce((a, b) => a + b, 0);
        prevVal = prev30.reduce((a, b) => a + b, 0);
        sparkline = last30;
      }

      // Calcolo trend percentuale
      let trendLabel = '0%';
      if (prevVal === 0) {
        trendLabel = currentVal > 0 ? `+${currentVal * 100}%` : '0%';
      } else {
        const pct = Math.round(((currentVal - prevVal) / prevVal) * 100);
        trendLabel = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }

      if (isRevenue) {
        currentVal = currentVal / 100;
        sparkline = sparkline.map(v => v / 100);
      }

      return { currentVal, trendLabel, sparkline };
    };

    const appointments = getValuesForPeriod(appointmentsSparkline);
    const revenue = getValuesForPeriod(revenueSparkline, true);
    const visits = getValuesForPeriod(visitsSparkline);
    const customers = getValuesForPeriod(customersSparkline);

    return { appointments, revenue, visits, customers };
  }, [selectedPeriod, appointmentsSparkline, revenueSparkline, visitsSparkline, customersSparkline]);

  const isToday = selectedPeriod === 'oggi';

  // Calcola il tasso di occupazione: assume max 48 slot per oggi/ieri
  const occupancyRate = useMemo(() => {
    let capacity = 48; // capacità teorica giornaliera
    if (selectedPeriod === '7giorni') capacity = 48 * 7;
    else if (selectedPeriod === '30giorni') capacity = 48 * 30;

    return Math.min(100, Math.round((metrics.appointments.currentVal / capacity) * 100));
  }, [selectedPeriod, metrics.appointments.currentVal]);

  const pieData = useMemo(() => [
    { name: 'Occupato', value: occupancyRate },
    { name: 'Libero', value: 100 - occupancyRate },
  ], [occupancyRate]);

  // Dati per il grafico delle visite (fascia oraria o andamento giornaliero)
  const barChartData = useMemo(() => {
    if (selectedPeriod === 'oggi' || selectedPeriod === 'ieri') {
      const hourlyData = selectedPeriod === 'oggi'
        ? (trafficData?.todayHourly ?? Array(24).fill(0))
        : (trafficData?.yesterdayHourly ?? Array(24).fill(0));
      return Array.from({ length: 13 }, (_, i) => {
        const hourNum = i + 8; // dalle 08:00 alle 20:00
        return {
          label: `${hourNum}:00`,
          Visite: hourlyData[hourNum] ?? 0,
        };
      });
    } else {
      const daysCount = selectedPeriod === '7giorni' ? 7 : 30;
      const len = visitsSparkline.length; // 60
      const periodVisits = visitsSparkline.slice(len - daysCount, len);
      
      return periodVisits.map((visits, index) => {
        const d = new Date();
        d.setDate(d.getDate() - (daysCount - 1 - index));
        const dayLabel = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        return {
          label: dayLabel,
          Visite: visits,
        };
      });
    }
  }, [selectedPeriod, trafficData, visitsSparkline]);

  const appointmentsTitle = selectedPeriod === 'oggi' ? 'Appuntamenti Oggi' : selectedPeriod === 'ieri' ? 'Appuntamenti Ieri' : 'Appuntamenti Totali';
  const revenueTitle = selectedPeriod === 'oggi' ? 'Incasso Oggi' : selectedPeriod === 'ieri' ? 'Incasso Ieri' : 'Incasso Totale';
  const visitsTitle = selectedPeriod === 'oggi' ? 'Visite Oggi' : selectedPeriod === 'ieri' ? 'Visite Ieri' : 'Visite Totali';
  const customersTitle = selectedPeriod === 'oggi' ? 'Nuovi Iscritti' : selectedPeriod === 'ieri' ? 'Nuovi Iscritti' : 'Nuovi Iscritti';

  return (
    <div className="space-y-6">
      {/* ── SELETTORE PERIODO ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {selectedPeriod === 'oggi'
              ? 'Analisi di Oggi'
              : selectedPeriod === 'ieri'
              ? 'Analisi di Ieri'
              : selectedPeriod === '7giorni'
              ? 'Analisi Ultimi 7 Giorni'
              : 'Analisi Ultimi 30 Giorni'}
          </h2>
          <p className="text-xs text-white/50">
            {selectedPeriod === 'oggi'
              ? 'Dati e traffico in tempo reale del salone'
              : selectedPeriod === 'ieri'
              ? 'Riepilogo delle statistiche consolidate di ieri'
              : selectedPeriod === '7giorni'
              ? 'Riepilogo dell\'andamento degli ultimi 7 giorni'
              : 'Riepilogo dell\'andamento degli ultimi 30 giorni'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-[#161616] p-1 border border-white/5 shrink-0">
          {(['oggi', 'ieri', '7giorni', '30giorni'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                selectedPeriod === period
                  ? 'bg-gold text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {period === 'oggi' ? 'Oggi' : period === 'ieri' ? 'Ieri' : period === '7giorni' ? '7 Giorni' : '30 Giorni'}
            </button>
          ))}
        </div>
      </div>

      {/* ── SEZIONE 1: 4 KPI CARD CON SPARKLINE ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={appointmentsTitle}
          value={metrics.appointments.currentVal}
          trend={metrics.appointments.trendLabel}
          icon={Calendar}
          sparklineData={metrics.appointments.sparkline}
        />
        {/* KPI Incasso nascosta per riservatezza — decommentare se necessario
        <KpiCard
          title={revenueTitle}
          value={formatPrice(metrics.revenue.currentVal)}
          trend={metrics.revenue.trendLabel}
          icon={DollarSign}
          sparklineData={metrics.revenue.sparkline}
        />
        */}
        <KpiCard
          title={visitsTitle}
          value={metrics.visits.currentVal}
          trend={metrics.visits.trendLabel}
          icon={TrendingUp}
          sparklineData={metrics.visits.sparkline}
        />
        <KpiCard
          title={customersTitle}
          value={metrics.customers.currentVal}
          trend={metrics.customers.trendLabel}
          icon={Users}
          sparklineData={metrics.customers.sparkline}
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
            <p className="text-xs text-white/40 mt-1">
              {selectedPeriod === 'oggi'
                ? 'Appuntamenti occupati vs slot disponibili oggi'
                : selectedPeriod === 'ieri'
                ? 'Appuntamenti occupati vs slot disponibili ieri'
                : selectedPeriod === '7giorni'
                ? 'Appuntamenti occupati vs slot disponibili negli ultimi 7 giorni'
                : 'Appuntamenti occupati vs slot disponibili negli ultimi 30 giorni'}
            </p>
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
              <span className="text-white/70">Prenotati ({metrics.appointments.currentVal} slot)</span>
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
            <h3 className="font-display text-lg uppercase text-gold">
              {selectedPeriod === 'oggi' || selectedPeriod === 'ieri' ? 'Visite per Fascia Oraria' : 'Andamento delle Visite'}
            </h3>
            <p className="text-xs text-white/40 mt-1">
              {selectedPeriod === 'oggi'
                ? 'Visualizzazioni del sito registrate oggi tra le 08:00 e le 20:00'
                : selectedPeriod === 'ieri'
                ? 'Visualizzazioni del sito registrate ieri tra le 08:00 e le 20:00'
                : selectedPeriod === '7giorni'
                ? 'Visualizzazioni del sito giornaliere negli ultimi 7 giorni'
                : 'Visualizzazioni del sito giornaliere negli ultimi 30 giorni'}
            </p>
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
                  dataKey="label"
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
              {selectedPeriod === 'oggi'
                ? 'Appuntamenti in Arrivo'
                : selectedPeriod === 'ieri'
                ? 'Appuntamenti di Ieri'
                : 'Appuntamenti Recenti'}
            </h3>
            <p className="text-xs text-white/40 mt-1">
              {selectedPeriod === 'oggi'
                ? 'Le prossime prenotazioni da saldare in sede oggi'
                : selectedPeriod === 'ieri'
                ? 'Gli ultimi appuntamenti svolti nella giornata di ieri'
                : 'Panoramica degli ultimi appuntamenti registrati'}
            </p>
          </div>

          <div className="mt-5 flex-1 divide-y divide-white/5 max-h-[360px] overflow-y-auto pr-1 admin-modal-scroll">
            {(selectedPeriod === 'oggi' ? upcomingAppointments : selectedPeriod === 'ieri' ? yesterdayAppointments : [...yesterdayAppointments, ...upcomingAppointments]).length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/40 py-8">
                <UserCheck className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-sm font-medium">Nessun appuntamento registrato</p>
              </div>
            ) : (
              (selectedPeriod === 'oggi' ? upcomingAppointments : selectedPeriod === 'ieri' ? yesterdayAppointments : [...yesterdayAppointments, ...upcomingAppointments]).slice(0, 5).map((appointment) => {
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
