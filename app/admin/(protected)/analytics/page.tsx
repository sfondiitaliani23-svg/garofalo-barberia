import { getAnalyticsRows } from '@/lib/actions/booking-analytics';
import { AnalyticsExplorer } from '@/components/admin/AnalyticsExplorer';

export const metadata = { title: 'Analytics Prenotazioni' };

export default async function AdminAnalyticsPage() {
  const { configured, rows } = await getAnalyticsRows();

  if (!configured) {
    return <p className="text-white/50">Database non configurato.</p>;
  }

  return <AnalyticsExplorer rows={rows} />;
}
