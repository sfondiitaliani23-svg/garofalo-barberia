import { getAnalyticsStats } from '@/lib/actions/analytics';
import { getProfile } from '@/lib/auth';
import { getDashboardOverviewAction } from '@/lib/actions/dashboard-overview';
import { getPresenceAction } from '@/lib/actions/presence-admin';
import { roleLabel } from '@/lib/auth/staff';
import { AdminOverview } from '@/components/admin/overview/AdminOverview';
import { DashboardLive } from '@/components/admin/overview/DashboardLive';
import { AdminTodayApp, type TodayApt } from '@/components/admin/app/AdminTodayApp';
import { getAdminAppointments } from '@/lib/actions/admin';
import { getShopDateString, getShopDayBounds } from '@/lib/utils/booking-datetime';

export const metadata = { title: 'Admin Dashboard' };
// Rivalidazione ogni 60s: le statistiche non cambiano al millisecondo.
export const revalidate = 60;

export default async function AdminDashboardPage() {
  const now = new Date();
  const { dayStart, dayEnd } = getShopDayBounds(getShopDateString(now));
  const [overview, analytics, profile, presence, today] = await Promise.all([
    getDashboardOverviewAction(),
    getAnalyticsStats(),
    getProfile(),
    getPresenceAction(),
    getAdminAppointments(dayStart.toISOString(), dayEnd.toISOString()).catch(() => []),
  ]);

  const name = profile?.full_name?.trim() || 'Admin';
  const firstTwo = name.split(/\s+/).slice(0, 2).join(' ');

  return (
    <>
    <AdminTodayApp appointments={today as unknown as TodayApt[]} now={now.toISOString()} userName={name} />
    <AdminOverview data={overview} visitsHistory={analytics.visitsHistory ?? []} userName={firstTwo} userRole={roleLabel(profile?.role)}>
      <DashboardLive presence={presence} />
    </AdminOverview>
    </>
  );
}
