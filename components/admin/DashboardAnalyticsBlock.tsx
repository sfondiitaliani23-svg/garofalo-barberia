'use client';

import { useCallback, useState } from 'react';
import { type LiveTrafficData } from '@/lib/actions/analytics';
import { type AnalyticsStats } from '@/lib/actions/analytics';
import { LiveTrafficChart } from '@/components/admin/LiveTrafficChart';
import { AnalyticsSection } from '@/components/admin/AnalyticsSection';

/**
 * DashboardAnalyticsBlock
 *
 * Rende il grafico e le card SEMPRE sincronizzate:
 * ogni volta che il LiveTrafficChart riceve nuovi dati (ogni 10s),
 * aggiorna anche i contatori di visite nelle card sottostanti.
 */
export function DashboardAnalyticsBlock({
  initialStats,
}: {
  initialStats: AnalyticsStats;
}) {
  const [stats, setStats] = useState<AnalyticsStats>(initialStats);

  const handleDataUpdate = useCallback((d: LiveTrafficData) => {
    setStats(prev => ({
      ...prev,
      liveVisitors: d.liveCount,
      dailyVisits: d.todayTotal,
      yesterdayVisits: d.yesterdayTotal,
      weeklyVisits: d.weeklyTotal,
      monthlyVisits: d.monthlyTotal,
    }));
  }, []);

  return (
    <>
      <div className="mt-8">
        <LiveTrafficChart onDataUpdate={handleDataUpdate} />
      </div>
      <AnalyticsSection stats={stats} showBreakdown={true} />
    </>
  );
}
