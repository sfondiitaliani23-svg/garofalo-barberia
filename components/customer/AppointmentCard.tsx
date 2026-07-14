import { parseISO } from 'date-fns';
import { AppointmentActions } from '@/components/customer/AppointmentActions';
import { formatShopDateTimeLong } from '@/lib/utils/booking-datetime';
import type { AppointmentStatus } from '@/types/database';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Confermato',
  completed: 'Completato',
  cancelled: 'Disdetto',
  no_show: 'Non presentato',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  confirmed: 'text-gold',
  completed: 'text-green-400',
  cancelled: 'text-red-400',
  no_show: 'text-white/40',
};

interface AppointmentCardProps {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  serviceName: string;
  barberName: string;
  showActions?: boolean;
}

export function AppointmentCard({
  id,
  startsAt,
  status,
  serviceName,
  barberName,
  showActions = false,
}: AppointmentCardProps) {
  const isFuture = new Date(startsAt) > new Date();
  const canShowActions = showActions && status === 'confirmed' && isFuture;

  return (
    <div className="rounded-lg border border-white/10 bg-[#111] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{serviceName}</p>
          <p className="text-sm text-white/60">
            {formatShopDateTimeLong(parseISO(startsAt))} — {barberName}
          </p>
          <p className={`mt-1 text-xs uppercase ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </p>
        </div>
      </div>
      {canShowActions && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <AppointmentActions appointmentId={id} startsAt={startsAt} />
        </div>
      )}
    </div>
  );
}