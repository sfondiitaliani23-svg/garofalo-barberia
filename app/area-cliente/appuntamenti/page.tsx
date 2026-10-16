import { PageHeader } from '@/components/customer/PageHeader';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getSession } from '@/lib/auth';
import { claimGuestAppointments } from '@/lib/auth/ensure-profile';
import { AppointmentCard } from '@/components/customer/AppointmentCard';
import { groupComboAppointments } from '@/lib/utils/group-appointments';
import { getCustomerLang } from '../_lang';
import { L } from '@/lib/i18n';

export async function generateMetadata() {
  const lang = await getCustomerLang();
  return { title: L(lang, 'I miei appuntamenti', 'My appointments') };
}

export default async function CustomerAppointmentsPage() {
  const lang = await getCustomerLang();
  // Collega le prenotazioni fatte senza account (stessa email verificata), anche per chi era già dentro.
  const user = await getSession();
  if (user) await claimGuestAppointments(user);
  const profile = await getProfile();
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div>
        <h1 className="font-display text-3xl uppercase">{L(lang, 'Appuntamenti', 'Appointments')}</h1>
        <p className="mt-4 text-[#bda980]">{L(lang, 'Database non ancora configurato.', 'Database not configured yet.')}</p>
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
      <PageHeader
        eyebrow={L(lang, 'Il tuo calendario', 'Your calendar')}
        title={L(lang, 'Appuntamenti', 'Appointments')}
        subtitle={lang === 'en'
          ? 'Edit or cancel up to 30 minutes before the appointment time'
          : <>Modifica o disdici fino a 30 minuti prima dell&apos;orario</>}
      />

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-2xl text-gold">{L(lang, 'In programma', 'Upcoming')}</h2>
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
                  lang={lang}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-gold/80">{L(lang, 'Storico', 'History')}</h2>
        <div className="space-y-3">
          {past.length === 0 && upcoming.length === 0 ? (
            <p className="text-white/50">{L(lang, 'Nessun appuntamento ancora.', 'No appointments yet.')}</p>
          ) : past.length === 0 ? (
            <p className="text-white/50">{L(lang, 'Nessun appuntamento passato.', 'No past appointments.')}</p>
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
                  lang={lang}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}