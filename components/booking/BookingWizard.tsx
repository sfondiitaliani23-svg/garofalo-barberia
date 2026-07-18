'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAppointment } from '@/lib/actions/bookings';
import {
  getAvailableDates,
  getAvailableSlots,
  getBarbersBookingAvailability,
  type BarberBookingStatus,
} from '@/lib/actions/availability';
import { InactiveTimeSlotGrid } from '@/components/booking/InactiveTimeSlotGrid';
import { getDisplaySlotsForDate } from '@/lib/utils/display-slots';
import { resolvePromotionForBooking, validatePromotionCode } from '@/lib/actions/promotions';
import { formatPrice, formatDuration, formatBarberRole } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MonthDatePicker } from '@/components/booking/MonthDatePicker';
import { SITE_CONFIG } from '@/lib/site-config';
import { Calendar, CheckCircle2, Clock, MapPin, CreditCard, Star, ArrowRight, User } from 'lucide-react';

interface BookingWizardProps {
  services: Service[];
  barbers: Barber[];
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}

const STEPS = ['Servizio', 'Barbiere & Orario', 'Conferma'];

interface AppliedPromotion {
  title: string;
  discountCents: number;
  finalCents: number;
  code?: string;
}

interface BookingConfirmation {
  appointmentId?: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  customerName: string;
  priceCents: number;
  originalPriceCents: number;
  discountCents: number;
  promotionTitle?: string | null;
}

export function BookingWizard({
  services,
  barbers,
  defaultName = '',
  defaultPhone = '',
  defaultEmail = '',
}: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsUnavailable, setSlotsUnavailable] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null);
  const [promoSource, setPromoSource] = useState<'auto' | 'code' | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [barberStatuses, setBarberStatuses] = useState<BarberBookingStatus[]>([]);
  const [loadingBarberStatuses, setLoadingBarberStatuses] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s),
    [selectedServiceIds, services]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0),
    [selectedServices]
  );

  const totalOriginalPrice = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.price_cents, 0),
    [selectedServices]
  );

  const barberStatusMap = useMemo(
    () => new Map(barberStatuses.map((status) => [status.barberId, status])),
    [barberStatuses]
  );

  const loadBarberStatuses = useCallback(async () => {
    if (selectedServices.length === 0) return;
    setLoadingBarberStatuses(true);
    const statuses = await getBarbersBookingAvailability(totalDuration);
    setBarberStatuses(statuses);
    setLoadingBarberStatuses(false);

    if (barberId && statuses.some((status) => status.barberId === barberId && !status.canBook)) {
      setBarberId(null);
      setDate(null);
      setTime(null);
    }
  }, [barberId, selectedServices.length, totalDuration]);

  const loadDates = useCallback(async () => {
    if (selectedServices.length === 0) return;
    setLoadingDates(true);
    const result = await getAvailableDates(totalDuration, barberId);
    setDates(result);
    setDate((current) => {
      if (result.length === 0) return null;
      if (current && result.includes(current)) return current;
      return result[0];
    });
    setLoadingDates(false);
  }, [selectedServices.length, totalDuration, barberId]);

  const loadSlots = useCallback(async () => {
    if (selectedServices.length === 0 || !date) return;
    setLoadingSlots(true);
    const { slots: s, unavailable } = await getAvailableSlots(
      barberId,
      date,
      totalDuration
    );
    setSlots(s);
    setSlotsUnavailable(Boolean(unavailable));
    setLoadingSlots(false);
  }, [selectedServices.length, totalDuration, barberId, date]);

  useEffect(() => {
    if (step === 2 && selectedServices.length > 0) {
      loadBarberStatuses();
    }
  }, [step, selectedServices.length, loadBarberStatuses]);

  useEffect(() => {
    if (step === 2 && selectedServices.length > 0) {
      loadDates();
    }
  }, [step, selectedServices.length, barberId, loadDates]);

  useEffect(() => {
    if (step === 2 && date && selectedServices.length > 0) loadSlots();
  }, [step, date, selectedServices.length, barberId, loadSlots]);

  const loadAutoPromotion = useCallback(async () => {
    if (selectedServiceIds.length === 0) return;
    const result = await resolvePromotionForBooking(selectedServiceIds[0]);
    if (!result.ok) return;

    if (result.promotion && result.discountCents > 0) {
      setAppliedPromotion({
        title: result.promotion.title,
        discountCents: result.discountCents,
        finalCents: totalOriginalPrice - result.discountCents,
      });
      setPromoSource('auto');
    } else {
      setAppliedPromotion(null);
      setPromoSource(null);
    }
  }, [selectedServiceIds, totalOriginalPrice]);

  useEffect(() => {
    if (step === 3 && selectedServiceIds.length > 0 && promoSource !== 'code') {
      loadAutoPromotion();
    }
  }, [step, selectedServiceIds, promoSource, loadAutoPromotion]);

  async function handleApplyPromoCode() {
    if (selectedServiceIds.length === 0 || !promoCode.trim()) {
      toast.error('Inserisci un codice promozionale');
      return;
    }

    setValidatingPromo(true);
    const result = await validatePromotionCode(promoCode, selectedServiceIds[0]);
    setValidatingPromo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (!result.promotion || result.discountCents <= 0) {
      toast.error('Codice valido ma nessuno sconto applicabile');
      return;
    }

    setAppliedPromotion({
      title: result.promotion.title,
      discountCents: result.discountCents,
      finalCents: totalOriginalPrice - result.discountCents,
      code: result.promotion.code ?? promoCode.trim().toUpperCase(),
    });
    setPromoSource('code');
    toast.success('Codice applicato');
  }

  function handleRemovePromoCode() {
    setPromoCode('');
    setPromoSource(null);
    setAppliedPromotion(null);
    if (selectedServiceIds.length > 0) loadAutoPromotion();
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    setPromoCode('');
    setAppliedPromotion(null);
    setPromoSource(null);
  }

  function selectSlot(t: string) {
    setTime(t);
    setStep(3);
  }

  function handleSubmit() {
    if (selectedServiceIds.length === 0 || !date || !time || !name.trim() || !phone.trim()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createAppointment({
          serviceIds: selectedServiceIds,
          barberId,
          date,
          time,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          notes,
          promotionCode: promoSource === 'code' ? promoCode : undefined,
        });

        if (!result?.ok) {
          if (result?.error?.includes('occupato') || result?.error?.includes('prenotato')) {
            setStep(2);
            setTime(null);
            void loadSlots();
            return;
          }

          toast.error(result?.error ?? 'Impossibile confermare la prenotazione. Riprova.');
          if (result?.error?.includes('disponibile')) {
            setStep(2);
            setTime(null);
            void loadSlots();
          }
          return;
        }

        setConfirmation({
          appointmentId: result.appointmentId,
          serviceName: result.serviceName ?? selectedServices.map((s) => s.name).join(' + '),
          barberName:
            result.barberName ??
            (barberId ? barbers.find((b) => b.id === barberId)?.name ?? 'Barbiere' : 'Primo disponibile'),
          date: date!,
          time: time!,
          customerName: name,
          priceCents: result.priceCents ?? totalOriginalPrice,
          originalPriceCents: result.originalPriceCents ?? totalOriginalPrice,
          discountCents: result.discountCents ?? 0,
          promotionTitle: result.promotionTitle,
        });
      } catch {
        toast.error('Errore di connessione durante la conferma. Ricarica la pagina e riprova.');
      }
    });
  }

  const getGoogleCalendarUrl = useCallback(() => {
    if (!confirmation) return '';
    try {
      const [year, month, day] = confirmation.date.split('-').map(Number);
      const [hour, minute] = confirmation.time.split(':').map(Number);
      
      const start = new Date(year, month - 1, day, hour, minute);
      const end = new Date(start.getTime() + totalDuration * 60 * 1000);
      
      const formatGCalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return `${y}${m}${dayStr}T${h}${min}${s}`;
      };
      
      const dates = `${formatGCalDate(start)}/${formatGCalDate(end)}`;
      const text = encodeURIComponent('Appuntamento @ Barberia Garofalo');
      const details = encodeURIComponent(
        `Dettagli prenotazione:\n💈 Servizi: ${confirmation.serviceName}\n👤 Barbiere: ${confirmation.barberName}\n⏱️ Durata: ${totalDuration} min\n💶 Prezzo: ${formatPrice(confirmation.priceCents)}\n\n📍 Indirizzo: ${SITE_CONFIG.address}`
      );
      const location = encodeURIComponent(SITE_CONFIG.address);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&ctz=Europe/Rome`;
    } catch (err) {
      console.error('Errore nella generazione del link Google Calendar', err);
      return '';
    }
  }, [confirmation, totalDuration]);

  if (confirmation) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 sm:px-0">
        <Card className="border-gold/30 bg-[#161616] text-white">
          <CardContent className="p-6 sm:p-8 space-y-0">
            {/* Header / Stato */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4 animate-pulse">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-3">
                Prenotazione confermata
              </p>
              <h2 className="text-2xl font-display uppercase font-bold text-gold tracking-wide">
                {SITE_CONFIG.name}
              </h2>
              <p className="text-xs text-white/40 mt-1 font-mono">
                {confirmation.appointmentId ? `Rif: #${confirmation.appointmentId.replace('appointment_', '').substring(0, 10).toUpperCase()}` : 'Confermato'}
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-gold" />
                  <span>
                    {format(parseISO(confirmation.date), "EEEE d MMMM yyyy", { locale: it })} alle {confirmation.time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-gold" />
                  <span>{formatDuration(totalDuration)}</span>
                </div>
              </div>
            </div>

            {/* Azioni Principali: Google Calendar */}
            <div className="py-6 border-b border-white/10">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-gold/50 text-gold hover:bg-gold hover:text-black flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-semibold transition-all shadow-md cursor-pointer text-center"
              >
                <Calendar className="h-5 w-5 shrink-0" />
                Aggiungi a Google Calendar
              </a>
            </div>

            {/* Dettagli della prenotazione */}
            <div className="py-6 border-b border-white/10">
              <h3 className="text-base font-bold uppercase tracking-wider text-gold mb-4">
                Dettagli della prenotazione
              </h3>
              <div className="space-y-4">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-semibold text-white text-base">{service.name}</h4>
                      <div className="flex items-center gap-1.5 text-sm text-white/50 mt-1">
                        <User className="h-3.5 w-3.5 text-gold/70" />
                        <span>Con {confirmation.barberName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(service.duration_minutes)}</span>
                      </div>
                    </div>
                    <span className="font-bold text-white text-base shrink-0">
                      {formatPrice(service.price_cents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totale */}
            <div className="py-6 border-b border-white/10 space-y-2">
              {confirmation.discountCents > 0 ? (
                <>
                  <div className="flex justify-between text-sm text-white/60">
                    <span>Prezzo originale</span>
                    <span className="line-through">{formatPrice(confirmation.originalPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-400 font-medium">
                    <span>Sconto {confirmation.promotionTitle ? `(${confirmation.promotionTitle})` : ''}</span>
                    <span>-{formatPrice(confirmation.discountCents)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between items-center text-lg font-bold text-white pt-1">
                <span>Totale</span>
                <span className="text-gold text-2xl font-extrabold">{formatPrice(confirmation.priceCents)}</span>
              </div>
            </div>

            {/* Metodo di Pagamento */}
            <div className="py-6 border-b border-white/10">
              <div className="flex items-start gap-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <CreditCard className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gold uppercase tracking-wider font-bold">Metodo di pagamento</p>
                  <p className="text-sm font-semibold text-white mt-0.5">Paga direttamente in salone</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    Nessun pagamento anticipato. Salderai il conto in sede dopo il servizio (contanti, bancomat o carta).
                  </p>
                </div>
              </div>
            </div>

            {/* Recensioni */}
            <div className="py-6 text-center border-b border-white/10">
              <a
                href={SITE_CONFIG.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-gold hover:text-gold/80 hover:underline transition-all py-1 font-semibold text-sm"
              >
                <Star className="h-5 w-5 fill-gold text-gold shrink-0" />
                Lasciaci una recensione su Google
              </a>
            </div>

            {/* Bottone Home */}
            <div className="pt-6">
              <Button className="w-full cursor-pointer py-6 font-bold" onClick={() => router.push('/')}>
                Torna alla home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                active ? 'bg-gold text-black' : done ? 'bg-gold/30 text-white' : 'bg-[#303030] text-white/50'
              )}>{n}</span>
              <span className={cn('hidden sm:inline', active ? 'text-gold' : 'text-white/50')}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 text-white/20">—</span>}
            </div>
          );
        })}
      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Prenotazione online</CardTitle>
          <p className="text-sm text-white/50">Scegli servizio, barbiere e orario — conferma automatica</p>
        </CardHeader>
        <CardContent className="min-w-0 space-y-6 overflow-x-hidden px-4 sm:px-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-4 text-left transition hover:border-gold',
                        isSelected ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                      )}
                    >
                      <div>
                        <p className="font-medium text-white">{s.name}</p>
                        <p className="text-sm text-gold">{formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}</p>
                      </div>
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all',
                        isSelected ? 'border-gold bg-gold text-black' : 'border-white/30'
                      )}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedServices.length > 0 && (
                <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/50">Servizi selezionati ({selectedServices.length})</p>
                    <p className="font-medium text-gold mt-0.5">
                      {selectedServices.map(s => s.name).join(' + ')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-sm text-white/50">Totale stimato</p>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {formatDuration(totalDuration)} · {formatPrice(totalOriginalPrice)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedServices.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gold">Con chi vuoi prenotare?</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {loadingBarberStatuses && (
                    <p className="text-sm text-white/50 sm:col-span-2">Verifica disponibilità team...</p>
                  )}
                  {barbers.map((b) => {
                    const status = barberStatusMap.get(b.id);
                    const unavailable = status ? !status.canBook : false;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => {
                          if (unavailable) return;
                          setBarberId(b.id);
                          setTime(null);
                        }}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition',
                          unavailable && 'cursor-not-allowed opacity-55',
                          !unavailable && barberId === b.id
                            ? 'border-gold bg-gold/10'
                            : 'border-white/15 bg-[#1a1a1a]',
                          !unavailable && barberId !== b.id && 'hover:border-gold/50'
                        )}
                      >
                        <div>
                          <p className="font-medium text-white">{b.name}</p>
                          <p className={cn('text-sm', unavailable ? 'text-white/45' : 'text-gold')}>
                            {unavailable ? status?.reason ?? 'In ferie o non disponibile' : formatBarberRole(b.role)}
                          </p>
                        </div>
                        {b.image_url && (
                          <Image
                            src={b.image_url}
                            alt={b.name}
                            width={60}
                            height={78}
                            className="h-[68px] w-[52px] rounded object-cover object-top"
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => { setBarberId(null); setTime(null); }}
                    className={cn(
                      'rounded-lg border p-4 text-left transition sm:col-span-2',
                      barberId === null ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                    )}
                  >
                    <p className="font-medium text-white">Nessuna preferenza</p>
                    <p className="text-sm text-white/50">Il primo barbiere disponibile</p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gold">Scegli il giorno</h3>
                <MonthDatePicker
                  dates={dates}
                  selectedDate={date}
                  loading={loadingDates}
                  onSelectDate={(d) => { setDate(d); setTime(null); }}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gold">Orari disponibili</h3>
                {loadingSlots ? (
                  <p className="text-sm text-white/50">Caricamento orari...</p>
                ) : slotsUnavailable && date ? (
                  <InactiveTimeSlotGrid slots={getDisplaySlotsForDate(date)} />
                ) : slots.length === 0 ? (
                  <p className="text-sm text-white/50">Nessun orario libero per questo giorno. Scegli un altro giorno.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {slots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => selectSlot(t)}
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
            </div>
          )}

          {step === 3 && selectedServices.length > 0 && date && time && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 text-sm space-y-1">
                <p><strong>Servizi selezionati:</strong> {selectedServices.map(s => s.name).join(' + ')}</p>
                <p><strong>Durata totale:</strong> {formatDuration(totalDuration)}</p>
                {appliedPromotion && appliedPromotion.discountCents > 0 ? (
                  <>
                    <p>
                      <strong>Prezzo complessivo:</strong>{' '}
                      <span className="line-through text-white/40">{formatPrice(totalOriginalPrice)}</span>{' '}
                      <span className="text-gold font-semibold">{formatPrice(appliedPromotion.finalCents)}</span>
                    </p>
                    <p className="text-emerald-400/90 text-xs">
                      Sconto {formatPrice(appliedPromotion.discountCents)} — {appliedPromotion.title}
                      {appliedPromotion.code ? ` (${appliedPromotion.code})` : ''}
                    </p>
                  </>
                ) : (
                  <p><strong>Prezzo complessivo:</strong> {formatPrice(totalOriginalPrice)}</p>
                )}
                <p><strong>Data:</strong> {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })} alle {time}</p>
                <p><strong>Barbiere:</strong> {barberId ? barbers.find((b) => b.id === barberId)?.name : 'Primo disponibile'}</p>
              </div>
              <div>
                <Label htmlFor="promo-code">Codice promozionale (opzionale)</Label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="promo-code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Es. PRIMAVERA20"
                    className="font-mono uppercase bg-[#1a1a1a] border-white/15"
                    disabled={promoSource === 'code'}
                  />
                  {promoSource === 'code' ? (
                    <Button type="button" variant="outline" onClick={handleRemovePromoCode} className="w-full shrink-0 sm:w-auto">
                      Rimuovi
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromoCode}
                      disabled={validatingPromo}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      {validatingPromo ? '...' : 'Applica'}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="name">Nome e cognome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" className="mt-1 bg-[#1a1a1a] border-white/15" />
              </div>
              <div>
                <Label htmlFor="phone">Telefono *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="320 188 6277" className="mt-1 bg-[#1a1a1a] border-white/15" />
                <p className="mt-1 text-xs text-white/45">Per il promemoria WhatsApp 6 ore prima dell&apos;appuntamento</p>
              </div>
              <div>
                <Label htmlFor="email">Email (opzionale)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua@email.com"
                  autoComplete="email"
                  className="mt-1 bg-[#1a1a1a] border-white/15"
                />
                <p className="mt-1 text-xs text-white/45">Per ricevere anche il promemoria via email</p>
              </div>
              <div>
                <Label htmlFor="notes">Note (opzionale)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Es. primo taglio bimbo 4 anni"
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              'grid gap-3 border-t border-white/10 pt-4',
              step === 3 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[auto_1fr] md:items-center'
            )}
          >
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="w-full max-w-full min-w-0 md:w-auto"
              >
                Indietro
              </Button>
            ) : (
              <div className="hidden md:block" />
            )}
            {step < 3 ? (
              <Button
                disabled={step === 1 ? selectedServiceIds.length === 0 : (step === 2 && !time)}
                onClick={() => {
                  if (step === 1) setStep(2);
                  else if (step === 2 && time) setStep(3);
                }}
                className={cn(
                  'w-full max-w-full min-w-0 md:ml-auto md:w-auto',
                  (step === 1 ? selectedServiceIds.length === 0 : (step === 2 && !time)) && 'opacity-50'
                )}
              >
                Avanti
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={pending}
                className="h-auto min-h-11 w-full max-w-full min-w-0 whitespace-normal px-4 py-2.5 text-center text-sm leading-snug"
              >
                {pending ? 'Conferma in corso...' : 'Conferma prenotazione'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}