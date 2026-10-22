import { getAnalyticsRows } from '@/lib/actions/booking-analytics';
import { AnalyticsExplorer } from '@/components/admin/AnalyticsExplorer';
import { ClickStatsCard } from '@/components/admin/ClickStatsCard';
import { getClickStatsAction } from '@/lib/actions/click-stats';
import { getDashboardOverviewAction } from '@/lib/actions/dashboard-overview';
import { getAnalyticsStats } from '@/lib/actions/analytics';
import { AnalyticsOverviewSection } from '@/components/admin/AnalyticsOverviewSection';

export const metadata = { title: 'Analytics & Prestazioni | Barberia Garofalo' };
export const revalidate = 60;

export default async function AdminAnalyticsPage() {
  const [{ configured, rows, hideMoney }, clicks, overview, analyticsStats] = await Promise.all([
    getAnalyticsRows(),
    getClickStatsAction(),
    getDashboardOverviewAction(),
    getAnalyticsStats(),
  ]);

  if (!configured) {
    return <p className="text-white/50">Database non configurato.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Metriche, KPI Cards e Grafici Finanziari spostati dalla Dashboard per Privacy */}
      <AnalyticsOverviewSection
        overview={overview}
        visitsHistory={analyticsStats.visitsHistory ?? []}
        hideMoney={hideMoney}
      />

      {/* Conversioni e Canali di Contatto */}
      <div className="pt-2">
        <ClickStatsCard {...clicks} />
      </div>

      {/* Analisi Dettagliata per Servizi, Giorni ed Esportazione CSV */}
      <AnalyticsExplorer rows={rows} hideMoney={hideMoney} />
    </div>
  );
}
