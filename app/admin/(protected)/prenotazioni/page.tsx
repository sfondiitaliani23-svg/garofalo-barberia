import { parseISO } from 'date-fns';
import { WeeklyBookingCalendar } from '@/components/admin/WeeklyBookingCalendar';
import { getAdminWeekAppointments } from '@/lib/actions/admin';
import { getBarbers, getServices } from '@/lib/actions/bookings';
import { getWeekStart } from '@/lib/utils/week-calendar';

export const metadata = { title: 'Prenotazioni Admin' };

export default async function AdminPrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; barber?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.week ? getWeekStart(parseISO(params.week)) : getWeekStart();

  const [barbers, services] = await Promise.all([getBarbers(), getServices()]);
  const selectedBarberId =
    params.barber && barbers.some((barber) => barber.id === params.barber)
      ? params.barber
      : barbers[0]?.id;

  const appointments = selectedBarberId
    ? await getAdminWeekAppointments(weekStart.toISOString(), selectedBarberId)
    : [];

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Prenotazioni</h1>
      <p className="mt-1 text-white/50">
        Calendario settimanale — crea, modifica o disdici appuntamenti per clienti in salone
      </p>

      <div className="mt-8">
        <WeeklyBookingCalendar
          barbers={barbers}
          services={services}
          appointments={appointments}
          weekStartIso={weekStart.toISOString()}
          initialBarberId={selectedBarberId}
        />
      </div>
    </div>
  );
}