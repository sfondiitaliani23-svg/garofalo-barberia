import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAppointmentForCustomer } from '@/lib/actions/bookings';
import { RescheduleForm } from '@/components/customer/RescheduleForm';
import { canManageAppointment } from '@/lib/utils/appointments';
import { getShopDateString, getShopTimeString } from '@/lib/utils/booking-datetime';
import { parseISO } from 'date-fns';

export const metadata = { title: 'Modifica prenotazione' };

export default async function ModificaAppuntamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apt = await getAppointmentForCustomer(id);

  if (!apt || apt.status !== 'confirmed') notFound();
  if (!canManageAppointment(apt.starts_at)) {
    redirect('/area-cliente/storico');
  }

  const barber = apt.barber as { name: string } | null;
  const service = apt.service as { name: string; duration_minutes: number; price_cents: number } | null;
  if (!service) notFound();

  const date = getShopDateString(parseISO(apt.starts_at));
  const time = getShopTimeString(parseISO(apt.starts_at));

  return (
    <div>
      <Link href="/area-cliente/storico" className="mb-6 inline-block text-sm text-white/50 hover:text-gold">
        ← Torna allo storico
      </Link>
      <RescheduleForm
        appointmentId={apt.id}
        barberId={apt.barber_id}
        barberName={barber?.name ?? 'Barbiere'}
        serviceName={service.name}
        durationMinutes={service.duration_minutes}
        priceCents={service.price_cents}
        currentDate={date}
        currentTime={time}
      />
    </div>
  );
}