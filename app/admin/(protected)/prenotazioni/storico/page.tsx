import { UpcomingAppointmentsList } from '@/components/admin/UpcomingAppointmentsList';
import { getUpcomingAdminAppointments } from '@/lib/actions/admin';
import { getBarbers, getServices } from '@/lib/actions/bookings';
import type { CalendarAppointment } from '@/lib/utils/week-calendar';

export const metadata = { title: 'Storico Prenotazioni Admin' };

export default async function AdminStoricoPrenotazioniPage() {
  // Caricamento rapido e snello: le prossime prenotazioni sono immediatamente pronte
  const [upcoming, barbers, services] = await Promise.all([
    getUpcomingAdminAppointments(400),
    getBarbers(),
    getServices(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Storico & Prossime Prenotazioni</h1>
      <p className="mt-1 text-white/50">
        Gestisci le prossime prenotazioni da oggi in poi o consulta lo storico passato completo
      </p>

      <div className="mt-8">
        <UpcomingAppointmentsList
          upcomingAppointments={upcoming as CalendarAppointment[]}
          barbers={barbers}
          services={services}
        />
      </div>
    </div>
  );
}
