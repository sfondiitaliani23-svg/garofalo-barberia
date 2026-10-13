import { getAnalyticsRows } from '@/lib/actions/booking-analytics';
import { AnalyticsExplorer } from '@/components/admin/AnalyticsExplorer';
import { ClickStatsCard } from '@/components/admin/ClickStatsCard';
import { getClickStatsAction } from '@/lib/actions/click-stats';

export const metadata = { title: 'Analytics Prenotazioni' };

export default async function AdminAnalyticsPage() {
  const [{ configured, rows }, clicks] = await Promise.all([getAnalyticsRows(), getClickStatsAction()]);

  if (!configured) {
    return <p className="text-white/50">Database non configurato.</p>;
  }

  return (
    <>
      <ClickStatsCard {...clicks} />
      <AnalyticsExplorer rows={rows} />
    </>
  );
}
