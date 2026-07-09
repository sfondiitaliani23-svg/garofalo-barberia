'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, XCircle } from 'lucide-react';
import { cancelAppointment } from '@/lib/actions/bookings';
import { canManageAppointment } from '@/lib/utils/appointments';

interface AppointmentActionsProps {
  appointmentId: string;
  startsAt: string;
}

export function AppointmentActions({ appointmentId, startsAt }: AppointmentActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const manageable = canManageAppointment(startsAt);

  if (!manageable) {
    return (
      <p className="text-xs text-white/40">
        Modifica o disdetta non più disponibile (meno di 30 minuti all&apos;appuntamento)
      </p>
    );
  }

  function handleCancel() {
    const confirmed = window.confirm('Vuoi disdire questa prenotazione? L\'azione non è reversibile.');
    if (!confirmed) return;

    startTransition(async () => {
      const result = await cancelAppointment(appointmentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Prenotazione disdetta');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/area-cliente/appuntamenti/${appointmentId}/modifica`}
        className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/25"
      >
        <Pencil size={16} />
        Modifica prenotazione
      </Link>
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
      >
        <XCircle size={16} />
        {pending ? 'Disdetta in corso...' : 'Disdici prenotazione'}
      </button>
    </div>
  );
}