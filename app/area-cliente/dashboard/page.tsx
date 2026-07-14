import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { parseISO } from 'date-fns';
import { formatShopDateTimeShort } from '@/lib/utils/booking-datetime';

export const metadata = { title: 'La mia Dashboard' };

export default async function CustomerDashboardPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const upcoming = supabase ? (await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name)')
    .eq('customer_id', profile?.id ?? '')
    .eq('status', 'confirmed')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(3)).data ?? [] : [];

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">
        Ciao, {profile?.full_name?.split(' ')[0] ?? 'Cliente'}
      </h1>
      <p className="mt-1 text-white/50">I tuoi prossimi appuntamenti</p>

      <div className="mt-8 space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-white/50">Nessun appuntamento in programma.</p>
        ) : (
          upcoming.map((apt) => {
            const barber = apt.barber as { name: string } | null;
            const service = apt.service as { name: string } | null;
            return (
              <div key={apt.id} className="rounded-lg border border-white/10 bg-[#111] p-4">
                <p className="font-semibold">{service?.name}</p>
                <p className="text-sm text-gold">
                  {formatShopDateTimeShort(parseISO(apt.starts_at))}
                </p>
                <p className="text-sm text-white/50">con {barber?.name}</p>
              </div>
            );
          })
        )}
      </div>

      <Link href="/prenota" className="btn-primary mt-8 inline-flex">Prenota nuovo appuntamento</Link>
    </div>
  );
}