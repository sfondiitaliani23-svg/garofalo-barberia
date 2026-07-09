import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { AppointmentCard } from '@/components/customer/AppointmentCard';

export const metadata = { title: 'Storico prenotazioni' };

export default async function CustomerStoricoPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const appointments = supabase
    ? (await supabase
        .from('appointments')
        .select('*, barber:barbers(name), service:services(name), photos:appointment_photos(*)')
        .eq('customer_id', profile?.id ?? '')
        .order('starts_at', { ascending: false })).data ?? []
    : [];

  const upcoming = appointments.filter(
    (apt) => apt.status === 'confirmed' && new Date(apt.starts_at) > new Date()
  );
  const completed = appointments.filter((apt) => apt.status === 'completed');
  const otherPast = appointments.filter(
    (apt) =>
      apt.status !== 'completed' &&
      !(apt.status === 'confirmed' && new Date(apt.starts_at) > new Date())
  );

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Storico prenotazioni</h1>
      <p className="mt-1 text-white/50">
        Le tue prenotazioni passate e future — modifica o disdici fino a 30 minuti prima
      </p>

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">Prossimi appuntamenti</h2>
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

      {completed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">Servizi completati</h2>
          <div className="space-y-3">
            {completed.map((apt) => {
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
            })}
          </div>
        </section>
      )}

      {otherPast.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">Altre prenotazioni</h2>
          <div className="space-y-3">
            {otherPast.map((apt) => {
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
            })}
          </div>
        </section>
      )}

      {appointments.length === 0 && (
        <p className="mt-8 text-white/50">Nessuna prenotazione ancora.</p>
      )}
    </div>
  );
}