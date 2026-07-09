import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { cancelAppointmentAction } from '@/lib/actions/bookings';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'I miei appuntamenti' };

export default async function CustomerAppointmentsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div>
        <h1 className="font-display text-3xl uppercase">Appuntamenti</h1>
        <p className="mt-4 text-white/50">Database non ancora configurato.</p>
      </div>
    );
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, barber:barbers(name), service:services(name)')
    .eq('customer_id', profile?.id ?? '')
    .order('starts_at', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Appuntamenti</h1>
      <div className="mt-8 space-y-3">
        {(appointments ?? []).map((apt) => {
          const barber = apt.barber as { name: string } | null;
          const service = apt.service as { name: string } | null;
          const isFuture = new Date(apt.starts_at) > new Date();
          const canCancel = apt.status === 'confirmed' && isFuture;

          return (
            <div key={apt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#111] p-4">
              <div>
                <p className="font-semibold">{service?.name}</p>
                <p className="text-sm text-white/60">
                  {format(new Date(apt.starts_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })} — {barber?.name}
                </p>
                <p className="text-xs uppercase text-gold">{apt.status}</p>
              </div>
              {canCancel && (
                <form action={cancelAppointmentAction}>
                  <input type="hidden" name="id" value={apt.id} />
                  <Button type="submit" variant="outline" size="sm">Disdici</Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}