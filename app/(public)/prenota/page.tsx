import { BookingWizard } from '@/components/booking/BookingWizard';
import { getServices, getBarbers } from '@/lib/actions/bookings';
import { getProfile } from '@/lib/auth';

export const metadata = { title: 'Prenota Online' };
export const dynamic = 'force-dynamic';

export default async function PrenotaPage() {
  const [services, barbers, profile] = await Promise.all([
    getServices(),
    getBarbers(),
    getProfile(),
  ]);

  return (
    <section className="py-16">
      <div className="container-lux min-w-0 overflow-x-hidden">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl uppercase">Prenota il tuo appuntamento</h1>
          <p className="mt-2 text-white/60">Scegli servizio, barbiere e orario disponibile</p>
        </div>
        <BookingWizard
          services={services}
          barbers={barbers}
          defaultName={profile?.full_name ?? ''}
          defaultPhone={profile?.phone ?? ''}
          defaultEmail={profile?.email ?? ''}
        />
      </div>
    </section>
  );
}