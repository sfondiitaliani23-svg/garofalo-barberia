import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { AppointmentCard } from '@/components/customer/AppointmentCard';
import { groupComboAppointments } from '@/lib/utils/group-appointments';

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

  const groupedAppointments = groupComboAppointments(appointments ?? []);

  const upcoming = groupedAppointments.filter(
    (apt) => apt.status === 'confirmed' && new Date(apt.starts_at) > new Date()
  );
  const past = groupedAppointments.filter(
    (apt) => !(apt.status === 'confirmed' && new Date(apt.starts_at) > new Date())
  );

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Appuntamenti</h1>
      <p className="mt-1 text-white/50">
        Modifica o disdici fino a 30 minuti prima dell&apos;orario
      </p>

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">In programma</h2>
          <div className="space-y-3">
            {upcoming.map((apt) => {
              const barber = apt.barber as { name: string } | null;
              const service = apt.service as { name: string } | null;
              return (
                <AppointmentCard
                  key={apt.id}
                  id={apt.id}
                  startsAt={apt.starts_at}
                  status={apt.status}
                  serviceName={service?.name ?? 'Servizio'}
                  barberName={barber?.name ?? 'Barbiere'}
                  showActions
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">Storico</h2>
        <div className="space-y-3">
          {past.length === 0 && upcoming.length === 0 ? (
            <p className="text-white/50">Nessun appuntamento ancora.</p>
          ) : past.length === 0 ? (
            <p className="text-white/50">Nessun appuntamento passato.</p>
          ) : (
            past.map((apt) => {
              const barber = apt.barber as { name: string } | null;
              const service = apt.service as { name: string } | null;
              return (
                <AppointmentCard
                  key={apt.id}
                  id={apt.id}
                  startsAt={apt.starts_at}
                  status={apt.status}
                  serviceName={service?.name ?? 'Servizio'}
                  barberName={barber?.name ?? 'Barbiere'}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}