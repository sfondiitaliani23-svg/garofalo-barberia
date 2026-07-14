import { getAdminStats } from '@/lib/actions/admin';
import { getAnalyticsStats } from '@/lib/actions/analytics';
import { AnalyticsSection } from '@/components/admin/AnalyticsSection';
import { LiveTrafficChart } from '@/components/admin/LiveTrafficChart';
import { formatPrice } from '@/lib/utils';

export const metadata = { title: 'Report' };

export default async function AdminReportPage() {
  const [stats, analytics] = await Promise.all([getAdminStats(), getAnalyticsStats()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase">Report</h1>
        <p className="text-sm text-white/50 mt-1">Monitora l&apos;andamento del salone e del sito web in tempo reale.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#111] p-6">
          <h2 className="text-sm text-white/50">Incasso settimanale stimato</h2>
          <p className="mt-2 text-4xl font-bold text-gold">{formatPrice(stats.revenueWeek)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#111] p-6">
          <h2 className="text-sm text-white/50">Appuntamenti oggi</h2>
          <p className="mt-2 text-4xl font-bold text-gold">{stats.appointmentsToday}</p>
        </div>
      </div>

      {/* Grafico Visite in tempo reale (Shopify Analytics Style) */}
      <LiveTrafficChart />

      <AnalyticsSection stats={analytics} />
    </div>
  );
}