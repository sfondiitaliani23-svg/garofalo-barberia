'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { rescheduleAppointment } from '@/lib/actions/bookings';
import { getAvailableDates, getAvailableSlots } from '@/lib/actions/availability';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface RescheduleFormProps {
  appointmentId: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  currentDate: string;
  currentTime: string;
}

export function RescheduleForm({
  appointmentId,
  barberId,
  barberName,
  serviceName,
  durationMinutes,
  priceCents,
  currentDate,
  currentTime,
}: RescheduleFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState<string | null>(currentTime);
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, startTransition] = useTransition();

  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    const result = await getAvailableDates(durationMinutes, barberId, appointmentId);
    const withCurrent = result.includes(currentDate) ? result : [currentDate, ...result].sort();
    setDates(withCurrent);
    setLoadingDates(false);
  }, [durationMinutes, barberId, appointmentId, currentDate]);

  const loadSlots = useCallback(async () => {
    if (!date) return;
    setLoadingSlots(true);
    const { slots: s, error } = await getAvailableSlots(barberId, date, durationMinutes, appointmentId);
    const withCurrent = date === currentDate && !s.includes(currentTime)
      ? [currentTime, ...s].sort()
      : s;
    setSlots(withCurrent);
    if (error) toast.error(error);
    setLoadingSlots(false);
  }, [barberId, date, durationMinutes, appointmentId, currentDate, currentTime]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function handleSubmit() {
    if (!date || !time) {
      toast.error('Seleziona data e orario');
      return;
    }

    startTransition(async () => {
      const result = await rescheduleAppointment(appointmentId, date, time);
      if (!result.ok) {
        toast.error(result.error);
        if (result.error?.includes('prenotato')) loadSlots();
        return;
      }
      toast.success('Prenotazione modificata');
      router.push('/area-cliente/storico');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gold">Modifica prenotazione</CardTitle>
        <p className="text-sm text-white/50">
          Puoi cambiare data e orario fino a 30 minuti prima dell&apos;appuntamento
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 text-sm space-y-1">
          <p><strong>Servizio:</strong> {serviceName} ({formatPrice(priceCents)})</p>
          <p><strong>Barbiere:</strong> {barberName}</p>
          <p className="text-white/50">
            Attuale: {format(parseISO(currentDate), "EEEE d MMMM yyyy", { locale: it })} alle {currentTime}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gold">Nuovo giorno</h3>
          {loadingDates ? (
            <p className="text-sm text-white/50">Caricamento giorni...</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDate(d); setTime(null); }}
                  className={cn(
                    'flex-shrink-0 rounded-lg border px-4 py-3 text-center transition',
                    date === d ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                  )}
                >
                  <span className="block text-xs uppercase text-white/50">
                    {format(parseISO(d), 'EEE', { locale: it })}
                  </span>
                  <span className="block font-semibold">{format(parseISO(d), 'd MMM', { locale: it })}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gold">Nuovo orario</h3>
          {loadingSlots ? (
            <p className="text-sm text-white/50">Caricamento orari...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-white/50">Nessun orario libero per questo giorno.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={cn(
                    'rounded-lg border py-2.5 text-sm font-medium transition hover:border-gold hover:bg-gold/10',
                    time === t ? 'border-gold bg-gold text-black' : 'border-white/15 bg-[#1a1a1a]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-white/10 pt-4">
          <Button variant="outline" onClick={() => router.back()}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={pending || !time}>
            {pending ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}