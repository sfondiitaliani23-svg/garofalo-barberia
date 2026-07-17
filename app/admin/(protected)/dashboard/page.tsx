import { getAdminStats, getUpcomingAdminAppointments, getYesterdayAdminAppointments } from '@/lib/actions/admin';
import { getAnalyticsStats } from '@/lib/actions/analytics';
import { PremiumDashboard } from '@/components/admin/PremiumDashboard';

export const metadata = { title: 'Admin Dashboard' };
// Rivalidazione ogni 60s: le statistiche non cambiano al millisecondo,
// cachare riduce drasticamente il carico sul DB e i tempi di risposta.
export const revalidate = 60;

export default async function AdminDashboardPage() {
  const [stats, analytics, upcoming, yesterdayAppointments] = await Promise.all([
    getAdminStats(),
    getAnalyticsStats(),
    getUpcomingAdminAppointments(5),
    getYesterdayAdminAppointments(5),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Dashboard</h1>
      <p className="mt-1 text-white/50">Panoramica barberia</p>

      <div className="mt-8">
        <PremiumDashboard
          initialStats={analytics}
          adminStats={stats}
          upcomingAppointments={upcoming}
          yesterdayAppointments={yesterdayAppointments}
        />
      </div>
    </div>
  );
}