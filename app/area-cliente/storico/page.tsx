import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { AppointmentCard } from '@/components/customer/AppointmentCard';

export const metadata = { title: 'Le mie prenotazioni' };

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
  
  // Le prenotazioni precedenti includono completate, cancellate e no_show
  const past = appointments.filter(
    (apt) =>
      apt.status === 'completed' ||
      apt.status === 'cancelled' ||
      apt.status === 'no_show' ||
      (apt.status === 'confirmed' && new Date(apt.starts_at) <= new Date())
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Navigazione Briciola (Breadcrumb) stile Treatwell */}
      <nav className="text-xs text-white/40 mb-6 uppercase tracking-wider">
        <Link href="/area-cliente/dashboard" className="hover:text-gold transition-colors">
          Il mio profilo
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/70">Prenotazioni</span>
      </nav>

      {/* Sezione Prossime Prenotazioni */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white tracking-wide mb-4">
          Prossime prenotazioni
        </h2>

        {/* Banner Garofalo Rewards stile twREWARDS */}
        <div className="rounded-xl border border-gold/15 bg-gradient-to-r from-gold/5 via-gold/10 to-transparent p-6 mb-6 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(205,154,79,0.05)]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-widest bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
              Garofalo Rewards
            </span>
            <h3 className="text-base font-bold text-white pt-2">
              Più si prenota e più si risparmia!
            </h3>
            <p className="text-xs text-white/50 max-w-md">
              Prenota i tuoi trattamenti preferiti per capelli e barba, raccogli punti fedeltà ad ogni visita e ottieni sconti esclusivi.
            </p>
          </div>
          <Link
            href="/prenota"
            className="shrink-0 bg-gold hover:bg-gold-light text-black font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all shadow-lg hover:-translate-y-0.5"
          >
            Prenota ora
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-4">
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
        ) : (
          <p className="text-sm text-white/35 py-4 border-t border-white/5">
            Non hai prenotazioni in programma al momento.
          </p>
        )}
      </section>

      {/* Sezione Prenotazioni Precedenti */}
      <section>
        <h2 className="text-xl font-bold text-white tracking-wide mb-4">
          Prenotazioni precedenti
        </h2>

        {past.length > 0 ? (
          <div className="space-y-4">
            {past.map((apt) => {
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
        ) : (
          <p className="text-sm text-white/35 py-4 border-t border-white/5">
            Non hai prenotazioni passate nel tuo storico.
          </p>
        )}
      </section>
    </div>
  );
}