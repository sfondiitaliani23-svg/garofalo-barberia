'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getLiveTrafficData, type LiveTrafficData } from '@/lib/actions/analytics';
import { cn } from '@/lib/utils';

export function LiveTrafficChart() {
  const [data, setData] = useState<LiveTrafficData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchTraffic = async () => {
      try {
        const trafficData = await getLiveTrafficData();
        if (active) {
          setData(trafficData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Errore nel caricamento del traffico live:', error);
      }
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 10000); // Aggiornamento ogni 10 secondi

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111] p-6 animate-pulse space-y-4">
        <div className="h-6 w-32 bg-white/5 rounded" />
        <div className="h-10 w-48 bg-white/5 rounded" />
        <div className="h-64 w-full bg-white/5 rounded" />
      </div>
    );
  }

  // Prepara i dati per Recharts
  const chartData = Array.from({ length: 24 }, (_, hourNum) => ({
    hourNum,
    hourLabel: `${hourNum}:00`,
    Oggi: data.todayHourly[hourNum] ?? 0,
    Ieri: data.yesterdayHourly[hourNum] ?? 0,
  }));

  const liveCount = data.liveCount;
  const isPositive = data.isChangePositive;
  const percent = Math.abs(data.percentChange);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Indicatore dorato in alto */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Header Live */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <p className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">Live</p>
          <span className="text-white/30">|</span>
          <p className="text-sm font-medium text-white/70">
            {liveCount === 1 ? '1 Visitatore attualmente sul sito' : `${liveCount} Visitatori attualmente sul sito`}
          </p>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest">Aggiornato ogni 10s</p>
      </div>

      {/* Titolo e Statistiche Principali */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg uppercase text-gold">Sessioni nel tempo</h3>
          <p className="text-xs text-white/40">Andamento orario delle visite (00:00 - 24:00)</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-3xl font-bold text-white">{data.todayTotal}</span>
            <span
              className={cn(
                'flex items-center text-sm font-bold px-2 py-0.5 rounded-full',
                data.percentChange === 0
                  ? 'text-white/50 bg-white/5'
                  : isPositive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-red-400 bg-red-500/10'
              )}
            >
              {data.percentChange === 0 ? '→' : isPositive ? '↗' : '↘'} {percent}%
            </span>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">rispetto a ieri alla stessa ora</p>
        </div>
      </div>

      {/* Area Grafico */}
      <div className="mt-6 h-64 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="hourNum"
              type="number"
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={(tick) => `${tick}h`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161616',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(label) => `${label}:00`}
            />
            {/* Linea Ieri (Dotted) */}
            <Line
              type="monotone"
              dataKey="Ieri"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
            {/* Linea Oggi (Solid Gold) */}
            <Line
              type="monotone"
              dataKey="Oggi"
              stroke="#d4af37"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#d4af37', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Custom in basso */}
      <div className="mt-4 flex justify-center gap-6 border-t border-white/5 pt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gold"></span>
          <span className="text-white/70">Oggi ({data.todayDateStr})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20 border border-dashed border-white/40"></span>
          <span className="text-white/50">Ieri ({data.yesterdayDateStr})</span>
        </div>
      </div>
    </div>
  );
}
