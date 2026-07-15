import { getAdminStats } from '@/lib/actions/admin';
import { getAnalyticsStats } from '@/lib/actions/analytics';
import { DashboardAnalyticsBlock } from '@/components/admin/DashboardAnalyticsBlock';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Admin Dashboard' };
// Rivalidazione ogni 60s: le statistiche non cambiano al millisecondo,
// cachare riduce drasticamente il carico sul DB e i tempi di risposta.
export const revalidate = 60;

export default async function AdminDashboardPage() {
  const [stats, analytics] = await Promise.all([getAdminStats(), getAnalyticsStats()]);

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Dashboard</h1>
      <p className="mt-1 text-white/50">Panoramica barberia</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Appuntamenti oggi</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gold">{stats.appointmentsToday}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Incasso oggi</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gold">{formatPrice(stats.revenueToday)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Incasso settimana</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gold">{formatPrice(stats.revenueWeek)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60">Clienti totali</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gold">{stats.totalCustomers}</p></CardContent>
        </Card>
      </div>

      {/*
        DashboardAnalyticsBlock unifica grafico + card statistiche in un'unica
        fonte di verità: ogni 10s il LiveTrafficChart aggiorna anche le card.
      */}
      <DashboardAnalyticsBlock initialStats={analytics} />
    </div>
  );
}