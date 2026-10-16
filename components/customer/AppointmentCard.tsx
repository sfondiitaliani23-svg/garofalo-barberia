import { parseISO } from 'date-fns';
import { DateTear } from '@/components/customer/DateTear';
import Link from 'next/link';
import { AppointmentActions } from '@/components/customer/AppointmentActions';
import { L, localHref, type Lang } from '@/lib/i18n';
import { displayBarberName, displayServiceName, fmtDateTimeLong, statusLabel } from '@/lib/i18n/content-customer';
import type { AppointmentStatus } from '@/types/database';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  confirmed: 'text-gold border-gold',
  completed: 'text-green-400 border-green-500/60',
  cancelled: 'text-red-400 border-red-500/60',
  no_show: 'text-[#bda980] border-[#bda980]/40',
};

interface AppointmentCardProps {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  serviceName: string;
  barberName: string;
  showActions?: boolean;
  lang?: Lang;
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
  lang = 'it',
}: AppointmentCardProps) {
  const isFuture = new Date(startsAt) > new Date();
  const canShowActions = showActions && status === 'confirmed' && isFuture;
  const orderCode = generateOrderCode(id);

  // Formatta la data in stile Treatwell "24 giugno, 19:00"
  const formattedDate = fmtDateTimeLong(lang, parseISO(startsAt));

  return (
    <div className="border border-gold/45 bg-black/30 transition-colors hover:border-gold/70">
      <div className="flex items-stretch">
        <DateTear startsAt={startsAt} lang={lang} muted={status !== 'confirmed'} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 border-l-2 border-dashed border-[#0a0807] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#bda980]">{formattedDate}</p>
            <h3 className="text-lg font-semibold tracking-wide text-white">{displayServiceName(lang, serviceName)}</h3>
            <p className="text-sm text-[#bda980]">
              Barberia Garofalo — <span className="font-semibold text-gold">{displayBarberName(lang, barberName)}</span>
            </p>
            <p className="pt-1 text-[11px] text-[#bda980]/80">
              {L(lang, 'Riferimento ordine:', 'Order reference:')}{' '}
              <span className="font-mono border border-dashed border-gold/30 px-2 py-0.5 text-white/70">{orderCode}</span>
            </p>
          </div>
          <span className={`inline-block shrink-0 self-start border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] sm:self-center ${STATUS_COLORS[status]}`}>
            {statusLabel(lang, status)}
          </span>
        </div>
      </div>

      {/* Azioni Future (Modifica/Cancellazione) */}
      {canShowActions && (
        <div className="border-t border-dashed border-gold/30 p-4">
          <AppointmentActions appointmentId={id} startsAt={startsAt} />
        </div>
      )}

      {/* Azioni Past / Completed in stile Treatwell (Lascia Recensione + Prenota di Nuovo) */}
      {status === 'completed' && (
        <div className="border-t border-dashed border-gold/30 p-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={localHref(lang, '/recensioni/nuova')}
            className="text-xs font-bold text-gold hover:text-gold-light transition-colors underline decoration-gold/30 underline-offset-4"
          >
            {L(lang, 'Lascia una recensione (accumula 10 punti)', 'Leave a review (earn 10 points)')}
          </Link>
          <Link
            href={localHref(lang, `/prenota?service=${encodeURIComponent(serviceName)}`)}
            className="inline-flex items-center justify-center border border-gold hover:bg-gold hover:text-[#0a0807] text-gold font-bold text-xs px-4 py-2.5 transition-all uppercase tracking-[0.18em]"
          >
            {L(lang, 'Prenota di nuovo', 'Book again')}
          </Link>
        </div>
      )}

      {/* Se cancellato o no-show, consentiamo comunque di prenotare di nuovo */}
      {(status === 'cancelled' || status === 'no_show') && (
        <div className="border-t border-dashed border-gold/30 p-4 flex justify-end">
          <Link
            href={localHref(lang, '/prenota')}
            className="inline-flex items-center justify-center border border-gold hover:bg-gold hover:text-[#0a0807] text-gold font-bold text-xs px-4 py-2.5 transition-all uppercase tracking-[0.18em]"
          >
            {L(lang, 'Prenota di nuovo', 'Book again')}
          </Link>
        </div>
      )}
    </div>
  );
}