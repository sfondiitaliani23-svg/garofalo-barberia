import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { AppointmentCard } from '@/components/customer/AppointmentCard';
import { groupComboAppointments } from '@/lib/utils/group-appointments';
import { getCustomerLang } from '../_lang';
import { L } from '@/lib/i18n';

export async function generateMetadata() {
  const lang = await getCustomerLang();
  return { title: L(lang, 'Le mie prenotazioni', 'My bookings') };
}

export default async function CustomerStoricoPage() {
  const lang = await getCustomerLang();
  const profile = await getProfile();
  const supabase = await createClient();
  const rawAppointments = supabase
    ? (await supabase
        .from('appointments')
        .select('*, barber:barbers(name), service:services(name), photos:appointment_photos(*)')
        .eq('customer_id', profile?.id ?? '')
        .order('starts_at', { ascending: false })).data ?? []
    : [];

  const appointments = groupComboAppointments(rawAppointments);

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
      <nav className="text-xs text-white/60 mb-6 uppercase tracking-wider">
        <Link href="/area-cliente/dashboard" className="hover:text-gold transition-colors">
          {L(lang, 'Il mio profilo', 'My profile')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/70">{L(lang, 'Prenotazioni', 'Bookings')}</span>
      </nav>

      {/* Sezione Prossime Prenotazioni */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white tracking-wide mb-4">
          {L(lang, 'Prossime prenotazioni', 'Upcoming bookings')}
        </h2>



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
                  lang={lang}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/60 py-4 border-t border-white/5">
            {L(lang, 'Non hai prenotazioni in programma al momento.', 'You have no upcoming bookings at the moment.')}
          </p>
        )}
      </section>

      {/* Sezione Prenotazioni Precedenti */}
      <section>
        <h2 className="text-xl font-bold text-white tracking-wide mb-4">
          {L(lang, 'Prenotazioni precedenti', 'Past bookings')}
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
                  lang={lang}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/60 py-4 border-t border-white/5">
            {L(lang, 'Non hai prenotazioni passate nel tuo storico.', 'You have no past bookings in your history.')}
          </p>
        )}
      </section>
    </div>
  );
}