'use client';

import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { createAppointment } from '@/lib/actions/bookings';
import {
  getAvailableDates,
  getAvailableSlots,
  getBarbersBookingAvailability,
  type BarberBookingStatus,
  type SlotDetail,
} from '@/lib/actions/availability';
import { getBarberRank, isBarberAllowedForCut } from '@/lib/utils/barber-schedule';
import { isCutService } from '@/lib/data/services';
import { InactiveTimeSlotGrid } from '@/components/booking/InactiveTimeSlotGrid';
import { getDisplaySlotsForDate } from '@/lib/utils/display-slots';
import { resolvePromotionForBooking, validatePromotionCode } from '@/lib/actions/promotions';
import { formatPrice, formatDuration, formatBarberRole } from '@/lib/utils';
import { isValidCustomerEmail } from '@/lib/utils/customer-email';
import type { Barber, Service } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { WaitlistForm } from '@/components/booking/WaitlistForm';
import { MonthDatePicker } from '@/components/booking/MonthDatePicker';
import { SITE_CONFIG } from '@/lib/site-config';
import { useLang } from '@/components/i18n/LangProvider';
import { L, localHref } from '@/lib/i18n';
import { serviceName } from '@/lib/i18n/content-en';
import { barberRole, dfLocale, fallbackBarberLabel, translateMessage } from '@/lib/i18n/content-booking';
import { Calendar, CheckCircle2, Clock, CreditCard, Star, User, Sparkles, AlertCircle, Scissors } from 'lucide-react';

interface BookingWizardProps {
  services: Service[];
  barbers: Barber[];
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
  /** Servizi già scelti (da ?service= nel link, es. dalla guida alla scelta). */
  initialServiceIds?: string[];
  /** Barbiere già scelto (da ?barber= nel link, es. dalla pagina del team). */
  initialBarberId?: string | null;
}

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
  customerEmail: string;
  priceCents: number;
  originalPriceCents: number;
  discountCents: number;
  promotionTitle?: string | null;
}

export function BookingWizard({
  services: rawServices,
  barbers: rawBarbers,
  defaultName = '',
  defaultPhone = '',
  defaultEmail = '',
  initialServiceIds = [],
  initialBarberId = null,
}: BookingWizardProps) {
  const router = useRouter();
  const lang = useLang();
  const locale = dfLocale(lang);
  const STEPS = [L(lang, 'Servizio', 'Service'), L(lang, 'Barbiere & Orario', 'Barber & Time'), L(lang, 'Conferma', 'Confirm')];
  const svcName = (name: string) => serviceName(lang, name);
  const svcNames = (names: string) => names.split(' + ').map(svcName).join(' + ');
  const [step, setStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialServiceIds);

  // Tutti i servizi del listino (Taglio, Baby, Barba, Styling)
  const services = rawServices;

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s),
    [selectedServiceIds, services]
  );

  // Verifica se la selezione attuale include un servizio di taglio (Taglio e shampoo o Taglio baby)
  const hasCutService = useMemo(
    () => selectedServices.some((s) => isCutService(s.name) || isCutService(s.category)),
    [selectedServices]
  );

  // I tagli online solo con Luigi; barba e styling con tutti.
  const barbers = useMemo(() => {
    return rawBarbers
      .filter((b) => !hasCutService || isBarberAllowedForCut(b.name))
      .sort((a, b) => {
      const rankA = getBarberRank(a.name);
      const rankB = getBarberRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [rawBarbers, hasCutService]);

  // Primo barbiere pubblico disponibile
  const defaultBarber = useMemo(() => {
    return barbers[0] ?? null;
  }, [barbers]);

  const [barberId, setBarberId] = useState<string | null>(() =>
    initialBarberId && barbers.some((b) => b.id === initialBarberId) ? initialBarberId : null
  );

  // Se cambiano i servizi e il barbiere selezionato non è più valido (es. selezionato taglio con altro operatore)
  useEffect(() => {
    if (hasCutService && barberId && !barbers.some((b) => b.id === barberId)) {
      setBarberId(defaultBarber?.id ?? null);
    }
  }, [hasCutService, barberId, barbers, defaultBarber]);

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsDetail, setSlotsDetail] = useState<SlotDetail[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<{ barberId: string; barberName: string; slots: string[] }[]>([]);
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
  const currentSlotRequestRef = useRef(0);
  const [barberStatuses, setBarberStatuses] = useState<BarberBookingStatus[]>([]);
  const [loadingBarberStatuses, setLoadingBarberStatuses] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

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
    try {
      const statuses = await getBarbersBookingAvailability(totalDuration, false, hasCutService);
      setBarberStatuses(statuses);
    } catch (e) {
      console.error('Errore nel caricamento disponibilità barbieri:', e);
    } finally {
      setLoadingBarberStatuses(false);
    }
  }, [selectedServices.length, totalDuration, hasCutService]);

  const loadDates = useCallback(async () => {
    if (selectedServices.length === 0) {
      setLoadingDates(false);
      return;
    }
    setLoadingDates(true);
    try {
      const result = await getAvailableDates(totalDuration, barberId, undefined, false, hasCutService);
      setDates(result);
      setDate((current) => {
        // Se il cliente aveva già scelto un giorno, lo teniamo anche quando il nuovo
        // barbiere è al completo: così vede l'avviso e i colleghi liberi quel giorno.
        if (current) return current;
        if (result.length === 0) return null;
        return result[0];
      });
    } catch (e) {
      console.error('Errore nel caricamento date disponibili:', e);
      setDates([]);
      setDate(null);
    } finally {
      setLoadingDates(false);
    }
  }, [selectedServices.length, totalDuration, barberId, hasCutService]);

  const loadSlots = useCallback(async () => {
    if (selectedServices.length === 0 || !date) {
      setLoadingSlots(false);
      setSlots([]);
      setSlotsDetail([]);
      return;
    }
    const requestId = ++currentSlotRequestRef.current;
    setLoadingSlots(true);
    try {
      const res = await getAvailableSlots(
        barberId,
        date,
        totalDuration,
        undefined,
        false,
        hasCutService
      );
      if (requestId === currentSlotRequestRef.current) {
        setSlots(res?.slots ?? []);
        setSlotsDetail(res?.slotsDetail ?? []);
        setFallbackNotice(res?.fallbackNotice ?? null);
        setAlternatives(res?.alternatives ?? []);
        setSlotsUnavailable(Boolean(res?.unavailable));
      }
    } catch (err) {
      console.error('Errore nel caricamento degli orari disponibili:', err);
      if (requestId === currentSlotRequestRef.current) {
        setSlots([]);
        setSlotsDetail([]);
        setFallbackNotice(null);
        setSlotsUnavailable(false);
      }
    } finally {
      if (requestId === currentSlotRequestRef.current) {
        setLoadingSlots(false);
      }
    }
  }, [selectedServices.length, totalDuration, barberId, date, hasCutService]);

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
    if (step === 2 && date && selectedServices.length > 0) {
      loadSlots();
    } else if (!date) {
      setLoadingSlots(false);
      setSlots([]);
    }
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
      toast.error(L(lang, 'Inserisci un codice promozionale', 'Please enter a promo code'));
      return;
    }

    setValidatingPromo(true);
    const result = await validatePromotionCode(promoCode, selectedServiceIds[0]);
    setValidatingPromo(false);

    if (!result.ok) {
      toast.error(translateMessage(lang, result.error));
      return;
    }

    if (!result.promotion || result.discountCents <= 0) {
      toast.error(L(lang, 'Codice valido ma nessuno sconto applicabile', 'Valid code, but no discount applies'));
      return;
    }

    setAppliedPromotion({
      title: result.promotion.title,
      discountCents: result.discountCents,
      finalCents: totalOriginalPrice - result.discountCents,
      code: result.promotion.code ?? promoCode.trim().toUpperCase(),
    });
    setPromoSource('code');
    toast.success(L(lang, 'Codice applicato', 'Code applied'));
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
  }

  // Dettagli dell'operatore assegnato per lo slot selezionato
  const selectedSlotInfo = useMemo(() => {
    if (!time) return null;
    return slotsDetail.find((s) => s.time === time) ?? null;
  }, [slotsDetail, time]);

  const assignedBarberName = useMemo(() => {
    if (selectedSlotInfo) return selectedSlotInfo.barberName;
    if (barberId) {
      const b = barbers.find((item) => item.id === barberId);
      if (b) return b.name;
    }
    return defaultBarber?.name ?? fallbackBarberLabel(lang);
  }, [selectedSlotInfo, barberId, barbers, defaultBarber, lang]);

  function handleSubmit() {
    if (selectedServiceIds.length === 0 || !date || !time || !name.trim() || !phone.trim()) {
      toast.error(L(lang, 'Compila tutti i campi obbligatori', 'Please fill in all required fields'));
      return;
    }
    if (!isValidCustomerEmail(email)) {
      toast.error(L(lang, 'Inserisci un’email valida: è obbligatoria per ricevere la conferma della prenotazione.', 'Please enter a valid email address: we need it to send your booking confirmation.'));
      return;
    }

    const effectiveBarberId = selectedSlotInfo?.barberId ?? barberId ?? defaultBarber?.id ?? null;

    startTransition(async () => {
      try {
        const result = await createAppointment({
          serviceIds: selectedServiceIds,
          barberId: effectiveBarberId,
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

          toast.error(translateMessage(lang, result?.error ?? 'Impossibile confermare la prenotazione. Riprova.'));
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
          barberName: result.barberName ?? assignedBarberName,
          date: date!,
          time: time!,
          customerName: name,
          customerEmail: email.trim(),
          priceCents: result.priceCents ?? totalOriginalPrice,
          originalPriceCents: result.originalPriceCents ?? totalOriginalPrice,
          discountCents: result.discountCents ?? 0,
          promotionTitle: result.promotionTitle,
        });
      } catch {
        toast.error(L(lang, 'Errore di connessione durante la conferma. Ricarica la pagina e riprova.', 'Connection error while confirming. Please reload the page and try again.'));
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
      const text = encodeURIComponent(L(lang, 'Appuntamento @ Barberia Garofalo', 'Appointment @ Barberia Garofalo'));
      const details = encodeURIComponent(
        L(
          lang,
          `Dettagli prenotazione:\nServizi: ${confirmation.serviceName}\nBarbiere: ${confirmation.barberName}\nDurata: ${totalDuration} min\nPrezzo: ${formatPrice(confirmation.priceCents)}\n\nIndirizzo: ${SITE_CONFIG.address}`,
          `Booking details:\nServices: ${svcNames(confirmation.serviceName)}\nBarber: ${confirmation.barberName}\nDuration: ${totalDuration} min\nPrice: ${formatPrice(confirmation.priceCents)}\n\nAddress: ${SITE_CONFIG.address}`
        )
      );
      const location = encodeURIComponent(SITE_CONFIG.address);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&ctz=Europe/Rome`;
    } catch (err) {
      console.error('Errore nella generazione del link Google Calendar', err);
      return '';
    }
  }, [confirmation, totalDuration, lang]);

  if (confirmation) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 sm:px-0">
        <Card className="rounded-none border-gold/55 bg-[#161616] text-white">
          <CardContent className="p-6 sm:p-8 space-y-0">
            {/* Header / Stato */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4 animate-pulse">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-3">
                {L(lang, 'Prenotazione confermata', 'Booking confirmed')}
              </p>
              <h2 className="text-2xl font-display uppercase font-bold text-gold tracking-wide">
                {SITE_CONFIG.name}
              </h2>
              <p className="text-xs text-white/60 mt-1 font-mono">
                {confirmation.appointmentId ? `${L(lang, 'Rif', 'Ref')}: #${confirmation.appointmentId.replace('appointment_', '').substring(0, 10).toUpperCase()}` : L(lang, 'Confermato', 'Confirmed')}
              </p>
              <p className="mt-3 max-w-md text-sm text-white/70">
                {L(lang, 'La conferma è in arrivo su', 'Your confirmation is on its way to')} {confirmation.customerEmail}
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-gold" />
                  <span>
                    {format(parseISO(confirmation.date), "EEEE d MMMM yyyy", { locale })} {L(lang, 'alle', 'at')} {confirmation.time}
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
                {L(lang, 'Aggiungi a Google Calendar', 'Add to Google Calendar')}
              </a>
            </div>

            {/* Dettagli della prenotazione */}
            <div className="py-6 border-b border-white/10">
              <h3 className="text-base font-bold uppercase tracking-wider text-gold mb-4">
                {L(lang, 'Dettagli della prenotazione', 'Booking details')}
              </h3>
              <div className="space-y-4">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-semibold text-white text-base">{svcName(service.name)}</h4>
                      <div className="flex items-center gap-1.5 text-sm text-white/70 mt-1">
                        <User className="h-3.5 w-3.5 text-gold" />
                        <span>{L(lang, 'Operatore', 'Barber')}: <strong className="text-white">{confirmation.barberName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/60 mt-0.5">
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
                    <span>{L(lang, 'Prezzo originale', 'Original price')}</span>
                    <span className="line-through">{formatPrice(confirmation.originalPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-400 font-medium">
                    <span>{L(lang, 'Sconto', 'Discount')} {confirmation.promotionTitle ? `(${confirmation.promotionTitle})` : ''}</span>
                    <span>-{formatPrice(confirmation.discountCents)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between items-center text-lg font-bold text-white pt-1">
                <span>{L(lang, 'Totale', 'Total')}</span>
                <span className="text-gold text-2xl font-extrabold">{formatPrice(confirmation.priceCents)}</span>
              </div>
            </div>

            {/* Metodo di Pagamento */}
            <div className="py-6 border-b border-white/10">
              <div className="flex items-start gap-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <CreditCard className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gold uppercase tracking-wider font-bold">{L(lang, 'Metodo di pagamento', 'Payment method')}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{L(lang, 'Paga direttamente in salone', 'Pay directly at the barbershop')}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    {L(lang, 'Nessun pagamento anticipato. Salderai il conto in sede dopo il servizio (contanti, bancomat o carta).', 'No advance payment. You pay at the barbershop after your service (cash, debit card or credit card).')}
                  </p>
                </div>
              </div>
            </div>

            {/* Recensioni */}
            <div className="py-6 text-center border-b border-white/10">
              <a
                href={SITE_CONFIG.googleReviewUrl}
                {...(SITE_CONFIG.googleReviewUrl.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex items-center justify-center gap-2 text-gold hover:text-gold/80 hover:underline transition-all py-1 font-semibold text-sm"
              >
                <Star className="h-5 w-5 fill-gold text-gold shrink-0" />
                {SITE_CONFIG.googleReviewUrl.includes('google') || SITE_CONFIG.googleReviewUrl.includes('g.page') ? L(lang, 'Lasciaci una recensione su Google', 'Leave us a review on Google') : L(lang, 'Lasciaci una recensione', 'Leave us a review')}
              </a>
            </div>

            {/* Bottone Home */}
            <div className="pt-6">
              <Button className="w-full cursor-pointer py-6 font-bold" onClick={() => router.push(localHref(lang, '/'))}>
                {L(lang, 'Torna alla home', 'Back to home')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2.5">
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 border-gold font-display text-sm',
                active ? 'bg-gold text-black' : done ? 'bg-gold/30 text-white' : 'bg-black text-gold'
              )}>{['I', 'II', 'III'][i]}</span>
              <span className={cn('hidden text-xs uppercase tracking-[0.18em] sm:inline', active ? 'text-white' : 'text-white/50')}>{label}</span>
              {i < STEPS.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-8 border-t-2 border-dotted border-gold/40 sm:block" />}
            </div>
          );
        })}
      </div>

      <Card className="w-full min-w-0 overflow-hidden rounded-none border-gold/55 bg-black/40 p-1.5">
        <div className="border border-gold/30 bg-gradient-to-b from-[#18130e] to-[#0c0a08]">
        <CardHeader className="border-gold/20 px-4 sm:px-6">
          <h2 className="font-display text-2xl uppercase tracking-wide text-gold">{L(lang, 'Prenotazione online', 'Online booking')}</h2>
          <p className="text-sm text-white/50">{L(lang, 'Scegli servizio, barbiere e orario — conferma automatica', 'Choose your service, barber and time — instant confirmation')}</p>
        </CardHeader>
        <CardContent className="min-w-0 space-y-6 overflow-x-hidden px-4 sm:px-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="divide-y divide-dashed divide-gold/35 border-y border-dashed border-gold/35">
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex w-full items-center gap-3 px-2 py-4 text-left transition hover:bg-gold/10 sm:gap-4 sm:px-3',
                        isSelected && 'bg-gold/10'
                      )}
                    >
                      <span className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center border-2 border-gold transition-all',
                        isSelected ? 'bg-gold text-black' : 'bg-transparent'
                      )}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 font-semibold tracking-wide text-white sm:flex-none sm:text-lg">{svcName(s.name)}</span>
                      <span aria-hidden className="mx-1 hidden h-px flex-1 border-b-2 border-dotted border-white/25 sm:block" />
                      <span className="shrink-0 text-xs text-white/60">{formatDuration(s.duration_minutes)}</span>
                      <span className="min-w-[3.5rem] shrink-0 text-right font-display text-xl text-gold">{formatPrice(s.price_cents)}</span>
                    </button>
                  );
                })}
              </div>

              {selectedServices.length > 0 && (
                <div className="border border-gold/30 bg-black/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/50">{L(lang, 'Servizi selezionati', 'Selected services')} ({selectedServices.length})</p>
                    <p className="font-medium text-gold mt-0.5">
                      {selectedServices.map(s => svcName(s.name)).join(' + ')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-sm text-white/50">{L(lang, 'Totale stimato', 'Estimated total')}</p>
                    <p className="mt-0.5 font-display text-xl text-gold">
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
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                    {L(lang, 'Con chi vuoi prenotare?', 'Who would you like to book with?')}
                  </h3>
                  {defaultBarber && (
                    <span className="text-xs text-white/60">
                      {L(lang, 'Seleziona il tuo barbiere', 'Choose your barber')}
                    </span>
                  )}
                </div>

                <p className="mb-3 text-xs text-white/60">
                  {lang === 'en'
                    ? <>Choose the barber you prefer, or &quot;No preference&quot; for the first free time.</>
                    : <>Scegli il barbiere che preferisci, oppure &quot;Nessuna preferenza&quot; per il primo orario libero.</>}
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {loadingBarberStatuses && (
                    <p className="col-span-full text-sm text-white/50">{L(lang, 'Verifica disponibilità team...', 'Checking team availability...')}</p>
                  )}
                  {barbers.map((b) => {
                    const isSelected = barberId === b.id;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setBarberId(b.id);
                          setTime(null);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 border-2 p-4 text-center transition',
                          isSelected
                            ? 'border-gold bg-gold/15 shadow-[0_0_18px_rgba(205,154,79,0.18)]'
                            : 'border-gold/30 bg-black/25 hover:border-gold'
                        )}
                      >
                        {b.image_url ? (
                          <Image
                            src={b.image_url}
                            alt={b.name}
                            width={74}
                            height={74}
                            className="h-[74px] w-[74px] rounded-full border-[3px] border-double border-gold object-cover object-top"
                          />
                        ) : (
                          <span className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-double border-gold bg-[#120e0a] font-display text-2xl text-gold">
                            {b.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                          </span>
                        )}
                        <p className="text-[15px] font-semibold text-white">{b.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-gold/80">
                          {barberRole(lang, formatBarberRole(b.role))}
                        </p>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={barberId === null}
                    onClick={() => {
                      setBarberId(null);
                      setTime(null);
                    }}
                    className={cn(
                      'col-span-2 border-2 p-4 text-center transition sm:col-span-3',
                      barberId === null ? 'border-gold bg-gold/15' : 'border-gold/30 bg-black/25 hover:border-gold'
                    )}
                  >
                    <p className="font-semibold text-white">{L(lang, 'Nessuna preferenza (Primo disponibile)', 'No preference (first available)')}</p>
                    <p className="text-sm text-white/60">{L(lang, 'Assegnazione automatica tra gli orari liberi di Luigi, Vittorio e Francesco', 'Automatically assigned from the free times of Luigi, Vittorio and Francesco')}</p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">{L(lang, 'Scegli il giorno', 'Choose a day')}</h3>
                <MonthDatePicker
                  dates={dates}
                  selectedDate={date}
                  loading={loadingDates}
                  onSelectDate={(d) => { setDate(d); setTime(null); }}
                />
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{L(lang, 'Orari disponibili', 'Available times')}</h3>
                  {date && (
                    <span className="text-xs text-white/50">
                      {format(parseISO(date), "EEEE d MMMM", { locale })}
                    </span>
                  )}
                </div>

                {/* Banner di avviso fallback se Luigi è al completo */}
                {fallbackNotice && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-300">{L(lang, 'Luigi non è disponibile in questa data', 'Luigi is not available on this date')}</p>
                      <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                        {lang === 'en'
                          ? <>We are showing the free times with the barbershop&apos;s experienced team members (<strong>Francesco</strong> and <strong>Vittorio</strong>).</>
                          : <>Ti proponiamo gli orari liberi con i collaboratori esperti del salone (<strong>Francesco</strong> e <strong>Vittorio</strong>).</>}
                      </p>
                    </div>
                  </div>
                )}

                {loadingSlots ? (
                  <p className="text-sm text-white/50">{L(lang, 'Caricamento orari...', 'Loading times...')}</p>
                ) : slotsUnavailable && date ? (
                  <InactiveTimeSlotGrid slots={getDisplaySlotsForDate(date)} />
                ) : slots.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 text-center">
                    <p className="text-sm text-white/70">
                      {barberId
                        ? L(
                            lang,
                            `${barbers.find((b) => b.id === barberId)?.name.split(' ')[0] ?? 'Il barbiere scelto'} è al completo in questo giorno.`,
                            `${barbers.find((b) => b.id === barberId)?.name.split(' ')[0] ?? 'The barber you chose'} is fully booked on this day.`
                          )
                        : L(lang, 'Nessun orario disponibile per questo giorno.', 'No times available on this day.')}
                    </p>
                    {alternatives.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-white/50">{L(lang, 'Liberi lo stesso giorno:', 'Free on the same day:')}</p>
                        {alternatives.map((a) => (
                          <button
                            key={a.barberId}
                            type="button"
                            onClick={() => {
                              setBarberId(a.barberId);
                              setTime(null);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5 text-left text-sm transition hover:bg-gold/10"
                          >
                            <span className="font-semibold text-white">{a.barberName}</span>
                            <span className="text-xs text-gold-light">
                              {a.slots.slice(0, 4).join(' · ')}
                              {a.slots.length > 4 ? ' …' : ''} → {L(lang, 'Scegli', 'Choose')}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/60 mt-1">{L(lang, 'Seleziona un\'altra data dal calendario in alto.', 'Please pick another date from the calendar above.')}</p>
                    )}
                    {date ? (
                      <WaitlistForm
                        date={date}
                        barberId={barberId}
                        serviceIds={selectedServices.map((sv) => sv.id)}
                        defaultName={name}
                        defaultPhone={phone}
                        defaultEmail={email}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {slots.map((t) => {
                        const detail = slotsDetail.find((s) => s.time === t);
                        const isSelected = time === t;
                        const isFallback = detail?.isFallback;

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => selectSlot(t)}
                            className={cn(
                              'flex flex-col items-center justify-center border-2 py-2.5 px-2 text-center transition hover:border-gold hover:bg-gold/10',
                              isSelected ? 'border-gold bg-gold text-black font-bold shadow-md' : 'border-gold/30 bg-black/25'
                            )}
                          >
                            <span className={cn('text-[15px] font-semibold tracking-wide', isSelected ? 'text-black' : 'text-white')}>
                              {t}
                            </span>
                            {detail?.barberName && (
                              <span
                                className={cn(
                                  'text-[10px] mt-0.5 truncate max-w-full block',
                                  isSelected
                                    ? 'text-black/80 font-medium'
                                    : isFallback
                                    ? 'text-amber-400/90 font-medium'
                                    : 'text-white/60'
                                )}
                              >
                                {detail.barberName.split(' ')[0]}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Riepilogo immediato slot selezionato */}
                    {time && (
                      <div className="rounded-lg border border-gold/30 bg-gold/10 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                            <Scissors className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-xs text-white/60">{L(lang, 'Orario e Operatore selezionati:', 'Selected time and barber:')}</p>
                            <p className="text-sm font-bold text-white">
                              {time} — {L(lang, 'Con', 'With')} <span className="text-gold">{assignedBarberName}</span>
                              {selectedSlotInfo?.isFallback && (
                                <span className="ml-2 inline-block rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                                  {L(lang, 'Collaboratore', 'Team member')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setStep(3)}
                          className="w-full sm:w-auto font-bold shrink-0"
                        >
                          {L(lang, 'Continua alla conferma', 'Continue to confirmation')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && selectedServices.length > 0 && date && time && (
            <div className="space-y-4">
              <div className="relative bg-[#f3e6c8] p-5 text-sm text-[#1a1410] shadow-[0_14px_34px_rgba(0,0,0,0.55)] sm:p-6">
                <p className="text-center font-display text-xl tracking-[0.12em]">GAROFALO</p>
                <p className="mt-0.5 text-center text-[10px] uppercase tracking-[0.35em] text-[#6b5a3e]">{L(lang, 'Barberia · Foggia', 'Barbershop · Foggia')}</p>
                <div className="my-4 border-t-2 border-dashed border-[#1a1410]" />
                <div className="space-y-2">
                  <p><strong>{L(lang, 'Servizi selezionati', 'Selected services')}:</strong> {selectedServices.map(s => svcName(s.name)).join(' + ')}</p>
                  <p><strong>{L(lang, 'Durata totale', 'Total duration')}:</strong> {formatDuration(totalDuration)}</p>
                  <p><strong>{L(lang, 'Data', 'Date')}:</strong> {format(parseISO(date), "EEEE d MMMM yyyy", { locale })} {L(lang, 'alle', 'at')} {time}</p>
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span><strong>{L(lang, 'Operatore', 'Barber')}:</strong> {assignedBarberName}</span>
                    {selectedSlotInfo?.isFallback ? (
                      <span className="inline-block bg-[#1a1410]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                        {L(lang, 'Collaboratore', 'Team member')}
                      </span>
                    ) : (
                      <span className="inline-block bg-[#1a1410]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                        {L(lang, 'Titolare', 'Owner')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="my-4 border-t-2 border-[#1a1410]" />
                {appliedPromotion && appliedPromotion.discountCents > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.25em]">{L(lang, 'Prezzo complessivo', 'Total price')}</span>
                      <span className="text-[#1a1410]/55 line-through">{formatPrice(totalOriginalPrice)}</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      {L(lang, 'Sconto', 'Discount')} {formatPrice(appliedPromotion.discountCents)} — {appliedPromotion.title}
                      {appliedPromotion.code ? ` (${appliedPromotion.code})` : ''}
                    </p>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.25em]">{L(lang, 'Totale', 'Total')}</span>
                      <span className="font-display text-3xl text-[#a3251f]">{formatPrice(appliedPromotion.finalCents)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.25em]">{L(lang, 'Prezzo complessivo', 'Total price')}</span>
                    <span className="font-display text-3xl text-[#a3251f]">{formatPrice(totalOriginalPrice)}</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-[#6b5a3e]">{L(lang, 'Si paga in negozio dopo il servizio.', 'You pay at the barbershop after your service.')}</p>
              </div>

              <div>
                <Label htmlFor="promo-code">{L(lang, 'Codice promozionale (opzionale)', 'Promo code (optional)')}</Label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="promo-code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={L(lang, 'Es. PRIMAVERA20', 'e.g. PRIMAVERA20')}
                    className="font-mono uppercase bg-[#1a1a1a] border-white/15"
                    disabled={promoSource === 'code'}
                  />
                  {promoSource === 'code' ? (
                    <Button type="button" variant="outline" onClick={handleRemovePromoCode} className="w-full shrink-0 sm:w-auto">
                      {L(lang, 'Rimuovi', 'Remove')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromoCode}
                      disabled={validatingPromo}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      {validatingPromo ? '...' : L(lang, 'Applica', 'Apply')}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="name">{L(lang, 'Nome e cognome *', 'Full name *')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={L(lang, 'Mario Rossi', 'John Smith')} className="mt-1 bg-[#1a1a1a] border-white/15" />
              </div>
              <div>
                <Label htmlFor="phone">{L(lang, 'Telefono *', 'Phone *')}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="320 188 6277" className="mt-1 bg-[#1a1a1a] border-white/15" />
                <p className="mt-1 text-xs text-white/60">{L(lang, 'Per il promemoria WhatsApp 6 ore prima dell\'appuntamento', 'For your WhatsApp reminder 6 hours before your appointment')}</p>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={L(lang, 'tua@email.com', 'you@email.com')}
                  autoComplete="email"
                  className="mt-1 bg-[#1a1a1a] border-white/15"
                />
                <p className="mt-1 text-xs text-white/60">{L(lang, 'Obbligatoria: qui ricevi la conferma della prenotazione', 'Required: your booking confirmation will be sent here')}</p>
              </div>
              <div>
                <Label htmlFor="notes">{L(lang, 'Note (opzionale)', 'Notes (optional)')}</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={L(lang, 'Es. primo taglio bimbo 4 anni', 'e.g. first haircut, boy aged 4')}
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              'grid gap-3 border-t border-gold/25 pt-4',
              step === 3 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[auto_1fr] md:items-center'
            )}
          >
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="w-full max-w-full min-w-0 uppercase tracking-[0.2em] md:w-auto"
              >
                {L(lang, 'Indietro', 'Back')}
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
                  'w-full max-w-full min-w-0 md:ml-auto md:w-auto font-bold uppercase tracking-[0.2em]',
                  (step === 1 ? selectedServiceIds.length === 0 : (step === 2 && !time)) && 'opacity-50'
                )}
              >
                {L(lang, 'Avanti', 'Next')}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={pending}
                className="h-auto min-h-11 w-full max-w-full min-w-0 whitespace-normal px-4 py-2.5 text-center text-sm font-bold leading-snug"
              >
                {pending ? L(lang, 'Conferma in corso...', 'Confirming...') : L(lang, 'Conferma prenotazione', 'Confirm booking')}
              </Button>
            )}
          </div>
        </CardContent>
        </div>
      </Card>
    </div>
  );
}