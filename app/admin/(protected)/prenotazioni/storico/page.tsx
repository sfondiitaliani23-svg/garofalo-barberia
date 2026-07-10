import { UpcomingAppointmentsList } from '@/components/admin/UpcomingAppointmentsList';
import { getUpcomingAdminAppointments } from '@/lib/actions/admin';
import { getBarbers, getServices } from '@/lib/actions/bookings';
import type { CalendarAppointment } from '@/lib/utils/week-calendar';

export const metadata = { title: 'Storico Prenotazioni Admin' };

export default async function AdminStoricoPrenotazioniPage() {
  const [appointments, barbers, services] = await Promise.all([
    getUpcomingAdminAppointments(),
    getBarbers(),
    getServices(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Storico Prenotazioni</h1>
      <p className="mt-1 text-white/50">
        Elenco delle prossime prenotazioni — modifica o rimuovi rapidamente senza usare il calendario
      </p>

      <div className="mt-8">
        <UpcomingAppointmentsList
          appointments={appointments as CalendarAppointment[]}
          barbers={barbers}
          services={services}
        />
      </div>
    </div>
  );
}