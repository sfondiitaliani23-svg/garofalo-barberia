import { parseISO } from 'date-fns';
import Link from 'next/link';
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
  confirmed: 'text-gold bg-gold/10 border-gold/20',
  completed: 'text-green-400 bg-green-500/10 border-green-500/20',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
  no_show: 'text-white/40 bg-white/5 border-white/10',
};

interface AppointmentCardProps {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  serviceName: string;
  barberName: string;
  showActions?: boolean;
}

// Genera un riferimento d'ordine unico deterministico a partire dall'ID dell'appuntamento
function generateOrderCode(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const positive = Math.abs(hash);
  return `T${(positive % 9000000000) + 1000000000}`;
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
  const orderCode = generateOrderCode(id);

  // Formatta la data in stile Treatwell "24 giugno, 19:00"
  const formattedDate = formatShopDateTimeLong(parseISO(startsAt));

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all hover:border-white/15">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          {/* Data e Ora in grigio/oro */}
          <p className="text-xs font-semibold text-white/50 tracking-wide uppercase">
            {formattedDate}
          </p>

          {/* Nome Servizio in grassetto grande */}
          <h3 className="text-lg font-bold text-white tracking-wide">
            {serviceName}
          </h3>

          {/* Dettagli Barberia e Barbieri */}
          <p className="text-sm text-white/60">
            Barberia Garofalo — <span className="text-gold font-medium">{barberName}</span>
          </p>

          {/* Riferimento Ordine in stile Treatwell */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5 text-xs text-white/40">
            <span>Riferimento ordine:</span>
            <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white/70 border border-white/10">
              {orderCode}
            </span>
          </div>
        </div>

        {/* Badge di Stato in alto a destra */}
        <div className="self-start">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Azioni Future (Modifica/Cancellazione) */}
      {canShowActions && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <AppointmentActions appointmentId={id} startsAt={startsAt} />
        </div>
      )}

      {/* Azioni Past / Completed in stile Treatwell (Lascia Recensione + Prenota di Nuovo) */}
      {status === 'completed' && (
        <div className="mt-5 border-t border-white/5 pt-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/recensioni/nuova"
            className="text-xs font-bold text-gold hover:text-gold-light transition-colors underline decoration-gold/30 underline-offset-4"
          >
            Lascia una recensione (accumula 10 punti)
          </Link>
          <Link
            href={`/prenota?service=${encodeURIComponent(serviceName)}`}
            className="inline-flex items-center justify-center rounded-lg border border-gold hover:bg-gold/15 text-gold font-semibold text-xs px-4 py-2.5 transition-all uppercase tracking-wider"
          >
            Prenota di nuovo
          </Link>
        </div>
      )}

      {/* Se cancellato o no-show, consentiamo comunque di prenotare di nuovo */}
      {(status === 'cancelled' || status === 'no_show') && (
        <div className="mt-5 border-t border-white/5 pt-4 flex justify-end">
          <Link
            href="/prenota"
            className="inline-flex items-center justify-center rounded-lg border border-gold hover:bg-gold/15 text-gold font-semibold text-xs px-4 py-2.5 transition-all uppercase tracking-wider"
          >
            Prenota di nuovo
          </Link>
        </div>
      )}
    </div>
  );
}