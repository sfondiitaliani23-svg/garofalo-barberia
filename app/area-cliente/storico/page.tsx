import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const metadata = { title: 'Storico servizi' };

export default async function CustomerStoricoPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const appointments = supabase ? (await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name), photos:appointment_photos(*)')
    .eq('customer_id', profile?.id ?? '')
    .eq('status', 'completed')
    .order('starts_at', { ascending: false })).data ?? [] : [];

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Storico</h1>
      <p className="mt-1 text-white/50">I tuoi servizi completati</p>
      <div className="mt-8 space-y-6">
        {appointments.length === 0 ? (
          <p className="text-white/50">Nessun servizio completato ancora.</p>
        ) : (
          appointments.map((apt) => {
            const barber = apt.barber as { name: string } | null;
            const service = apt.service as { name: string } | null;
            return (
              <div key={apt.id} className="rounded-lg border border-white/10 bg-[#111] p-4">
                <p className="font-semibold">{service?.name}</p>
                <p className="text-sm text-white/60">
                  {format(new Date(apt.starts_at), "d MMMM yyyy", { locale: it })} — {barber?.name}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}