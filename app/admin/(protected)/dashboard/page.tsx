import { getAnalyticsStats } from '@/lib/actions/analytics';
import { getProfile } from '@/lib/auth';
import { getDashboardOverviewAction } from '@/lib/actions/dashboard-overview';
import { getPresenceAction } from '@/lib/actions/presence-admin';
import { AdminOverview } from '@/components/admin/overview/AdminOverview';
import { DashboardLive } from '@/components/admin/overview/DashboardLive';

export const metadata = { title: 'Admin Dashboard' };
// Rivalidazione ogni 60s: le statistiche non cambiano al millisecondo.
export const revalidate = 60;

export default async function AdminDashboardPage() {
  const [overview, analytics, profile, presence] = await Promise.all([
    getDashboardOverviewAction(),
    getAnalyticsStats(),
    getProfile(),
    getPresenceAction(),
  ]);

  const name = profile?.full_name?.trim() || 'Admin';
  const firstTwo = name.split(/\s+/).slice(0, 2).join(' ');

  return (
    <AdminOverview data={overview} visitsHistory={analytics.visitsHistory ?? []} userName={firstTwo} userRole="Amministratore">
      <DashboardLive presence={presence} />
    </AdminOverview>
  );
}
