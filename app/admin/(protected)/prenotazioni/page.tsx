import { parseISO } from 'date-fns';
import { WeeklyBookingCalendar } from '@/components/admin/WeeklyBookingCalendar';
import { getAdminTimeOffForWeek, getAdminWeekAppointments } from '@/lib/actions/admin';
import { getBarbers, getServices } from '@/lib/actions/bookings';
import { getWeekStart } from '@/lib/utils/week-calendar';

export const metadata = { title: 'Prenotazioni Admin' };

function resolveWeekStart(weekParam?: string): Date {
  if (!weekParam || typeof weekParam !== 'string') return getWeekStart();
  try {
    const parsed = parseISO(weekParam);
    if (Number.isNaN(parsed.getTime())) return getWeekStart();
    return getWeekStart(parsed);
  } catch {
    return getWeekStart();
  }
}

export default async function AdminPrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; barber?: string }>;
}) {
  const params = await searchParams;
  const weekStart = resolveWeekStart(params.week);
  const weekStartIso = weekStart.toISOString();

  // Esecuzione parallela altamente ottimizzata: carica solo i dati strettamente necessari per la settimana
  const [barbers, services, timeOff, appointments] = await Promise.all([
    getBarbers().catch(() => []),
    getServices().catch(() => []),
    getAdminTimeOffForWeek(weekStartIso).catch(() => []),
    getAdminWeekAppointments(weekStartIso, 'all').catch(() => []),
  ]);

  const selectedBarberId =
    params.barber === 'all' || (params.barber && barbers.some((barber) => barber.id === params.barber))
      ? params.barber
      : barbers[0]?.id;

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
          timeOff={timeOff}
          weekStartIso={weekStartIso}
          initialBarberId={selectedBarberId}
        />
      </div>
    </div>
  );
}
