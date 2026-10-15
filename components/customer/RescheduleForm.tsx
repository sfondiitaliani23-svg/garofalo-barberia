'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it, enGB } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { rescheduleAppointment } from '@/lib/actions/bookings';
import { getAvailableDates, getAvailableSlots } from '@/lib/actions/availability';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { MonthDatePicker } from '@/components/booking/MonthDatePicker';
import { isBarberAdminOnly } from '@/lib/utils/barber-schedule';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { displayBarberName, displayServiceName, translateMessage } from '@/lib/i18n/content-customer';

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
  const lang = useLang();
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
    if (!date) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    try {
      const { slots: s, error } = await getAvailableSlots(barberId, date, durationMinutes, appointmentId);
      const withCurrent = date === currentDate && !s.includes(currentTime)
        ? [currentTime, ...s].sort()
        : s;
      setSlots(withCurrent ?? []);
      if (error) toast.error(translateMessage(lang, error));
    } catch (err) {
      console.error('Errore nel recupero orari:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [barberId, date, durationMinutes, appointmentId, currentDate, currentTime, lang]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function handleSubmit() {
    if (!date || !time) {
      toast.error(L(lang, 'Seleziona data e orario', 'Please select a date and time'));
      return;
    }

    startTransition(async () => {
      const result = await rescheduleAppointment(appointmentId, date, time);
      if (!result.ok) {
        toast.error(translateMessage(lang, result.error));
        if (result.error?.includes('prenotato')) loadSlots();
        return;
      }
      toast.success(L(lang, 'Prenotazione modificata', 'Booking updated'));
      router.push('/area-cliente/storico');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gold">{L(lang, 'Modifica prenotazione', 'Edit booking')}</CardTitle>
        <p className="text-sm text-white/50">
          {lang === 'en'
            ? 'You can change the date and time up to 30 minutes before the appointment'
            : <>Puoi cambiare data e orario fino a 30 minuti prima dell&apos;appuntamento</>}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 text-sm space-y-1">
          <p><strong>{L(lang, 'Servizio:', 'Service:')}</strong> {displayServiceName(lang, serviceName)} ({formatPrice(priceCents)})</p>
          <p><strong>{L(lang, 'Barbiere:', 'Barber:')}</strong> {displayBarberName(lang, barberName)}</p>
          <p className="text-white/50">
            {L(lang, 'Attuale:', 'Current:')} {format(parseISO(currentDate), "EEEE d MMMM yyyy", { locale: lang === 'en' ? enGB : it })} {L(lang, 'alle', 'at')} {currentTime}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gold">{L(lang, 'Nuovo giorno', 'New day')}</h3>
          <MonthDatePicker
            dates={dates}
            selectedDate={date}
            loading={loadingDates}
            onSelectDate={(d) => { setDate(d); setTime(null); }}
          />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gold">{L(lang, 'Nuovo orario', 'New time')}</h3>
          {loadingSlots ? (
            <p className="text-sm text-white/50">{L(lang, 'Caricamento orari...', 'Loading times...')}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-white/50">{L(lang, 'Nessun orario disponibile per questo giorno.', 'No times available for this day.')}</p>
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
          <Button variant="outline" onClick={() => router.back()}>{L(lang, 'Annulla', 'Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={pending || !time}>
            {pending ? L(lang, 'Salvataggio...', 'Saving...') : L(lang, 'Salva modifiche', 'Save changes')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}