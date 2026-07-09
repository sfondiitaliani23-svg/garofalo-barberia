import { getBookingAnalytics } from '@/lib/actions/booking-analytics';
import { BookingAnalyticsSection } from '@/components/admin/BookingAnalyticsSection';

export const metadata = { title: 'Analytics Prenotazioni' };

export default async function AdminAnalyticsPage() {
  const stats = await getBookingAnalytics();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Analytics avanzati</h1>
      <p className="mt-1 text-white/50">
        Statistiche su tutte le prenotazioni ricevute
      </p>
      <div className="mt-8">
        <BookingAnalyticsSection stats={stats} />
      </div>
    </div>
  );
}