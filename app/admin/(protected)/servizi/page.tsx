import { getServices } from '@/lib/actions/bookings';
import { formatPrice, formatDuration } from '@/lib/utils';

export const metadata = { title: 'Servizi Admin' };

export default async function AdminServiziPage() {
  const services = await getServices();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Servizi e prezzi</h1>
      <p className="mt-1 text-white/50">Gestisci dal database Supabase o aggiorna seed.sql</p>
      <div className="mt-8 space-y-2">
        {services.map((s) => (
          <div key={s.id} className="flex justify-between rounded-lg border border-white/10 bg-[#111] px-4 py-3">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-white/40">{s.category} · {formatDuration(s.duration_minutes)}</p>
            </div>
            <p className="text-gold font-semibold">{formatPrice(s.price_cents)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}