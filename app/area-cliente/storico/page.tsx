import { PageHeader } from '@/components/customer/PageHeader';
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
      <nav className="mb-5 text-[11px] uppercase tracking-[0.25em] text-[#bda980]">
        <Link href="/area-cliente/dashboard" className="transition-colors hover:text-gold">
          {L(lang, 'Il mio profilo', 'My profile')}
        </Link>
        <span className="mx-2 text-gold/50">/</span>
        <span className="text-gold">{L(lang, 'Prenotazioni', 'Bookings')}</span>
      </nav>
      <PageHeader eyebrow={L(lang, 'Le tue visite', 'Your visits')} title={L(lang, 'Storico', 'History')} subtitle={L(lang, 'Tutte le tue prenotazioni, passate e future.', 'All your bookings, past and upcoming.')} />

      {/* Sezione Prossime Prenotazioni */}
      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-gold">
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
          <p className="text-sm text-[#bda980] py-4 border-t border-dashed border-gold/30">
            {L(lang, 'Non hai prenotazioni in programma al momento.', 'You have no upcoming bookings at the moment.')}
          </p>
        )}
      </section>

      {/* Sezione Prenotazioni Precedenti */}
      <section>
        <h2 className="mb-4 font-display text-2xl text-gold">
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
          <p className="text-sm text-[#bda980] py-4 border-t border-dashed border-gold/30">
            {L(lang, 'Non hai prenotazioni passate nel tuo storico.', 'You have no past bookings in your history.')}
          </p>
        )}
      </section>
    </div>
  );
}