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
import { resolvePromotionForBooking, validatePromotionCode } from '@/lib/actions/promotions';
import { formatPrice, formatDuration, formatBarberRole } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MonthDatePicker } from '@/components/booking/MonthDatePicker';

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
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
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

  const selectedService = services.find((s) => s.id === serviceId);

  const barberStatusMap = useMemo(
    () => new Map(barberStatuses.map((status) => [status.barberId, status])),
    [barberStatuses]
  );

  const loadBarberStatuses = useCallback(async () => {
    if (!selectedService) return;
    setLoadingBarberStatuses(true);
    const statuses = await getBarbersBookingAvailability(selectedService.duration_minutes);
    setBarberStatuses(statuses);
    setLoadingBarberStatuses(false);

    if (barberId && statuses.some((status) => status.barberId === barberId && !status.canBook)) {
      setBarberId(null);
      setDate(null);
      setTime(null);
      toast.error('Il barbiere selezionato non è prenotabile in questo periodo (ferie o assenza).');
    }
  }, [barberId, selectedService]);

  const loadDates = useCallback(async () => {
    if (!selectedService) return;
    setLoadingDates(true);
    const result = await getAvailableDates(selectedService.duration_minutes, barberId);
    setDates(result);
    setDate((current) => {
      if (result.length === 0) return null;
      if (current && result.includes(current)) return current;
      return result[0];
    });
    setLoadingDates(false);
  }, [selectedService, barberId]);

  const loadSlots = useCallback(async () => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    const { slots: s, error } = await getAvailableSlots(barberId, date, selectedService.duration_minutes);
    setSlots(s);
    if (error) toast.error(error);
    setLoadingSlots(false);
  }, [selectedService, barberId, date]);

  useEffect(() => {
    if (step === 2 && selectedService) {
      loadBarberStatuses();
    }
  }, [step, selectedService, loadBarberStatuses]);

  useEffect(() => {
    if (step === 2 && selectedService) {
      loadDates();
    }
  }, [step, selectedService, barberId, loadDates]);

  useEffect(() => {
    if (step === 2 && date && selectedService) loadSlots();
  }, [step, date, selectedService, barberId, loadSlots]);

  const loadAutoPromotion = useCallback(async () => {
    if (!serviceId) return;
    const result = await resolvePromotionForBooking(serviceId);
    if (!result.ok) return;

    if (result.promotion && result.discountCents > 0) {
      setAppliedPromotion({
        title: result.promotion.title,
        discountCents: result.discountCents,
        finalCents: result.finalCents,
      });
      setPromoSource('auto');
    } else {
      setAppliedPromotion(null);
      setPromoSource(null);
    }
  }, [serviceId]);

  useEffect(() => {
    if (step === 3 && serviceId && promoSource !== 'code') {
      loadAutoPromotion();
    }
  }, [step, serviceId, promoSource, loadAutoPromotion]);

  async function handleApplyPromoCode() {
    if (!serviceId || !promoCode.trim()) {
      toast.error('Inserisci un codice promozionale');
      return;
    }

    setValidatingPromo(true);
    const result = await validatePromotionCode(promoCode, serviceId);
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
      finalCents: result.finalCents,
      code: result.promotion.code ?? promoCode.trim().toUpperCase(),
    });
    setPromoSource('code');
    toast.success('Codice applicato');
  }

  function handleRemovePromoCode() {
    setPromoCode('');
    setPromoSource(null);
    setAppliedPromotion(null);
    if (serviceId) loadAutoPromotion();
  }

  function selectService(id: string) {
    setServiceId(id);
    setPromoCode('');
    setAppliedPromotion(null);
    setPromoSource(null);
    setStep(2);
  }

  function selectSlot(t: string) {
    setTime(t);
    setStep(3);
  }

  function handleSubmit() {
    if (!serviceId || !date || !time || !name.trim() || !phone.trim()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createAppointment({
          serviceId,
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
          toast.error(result?.error ?? 'Impossibile confermare la prenotazione. Riprova.');
          if (result?.error?.includes('prenotato') || result?.error?.includes('disponibile')) {
            setStep(2);
            void loadSlots();
          }
          return;
        }

        setConfirmation({
          serviceName: result.serviceName ?? selectedService?.name ?? 'Servizio',
          barberName:
            result.barberName ??
            (barberId ? barbers.find((b) => b.id === barberId)?.name ?? 'Barbiere' : 'Primo disponibile'),
          date: date!,
          time: time!,
          customerName: name,
          priceCents: result.priceCents ?? selectedService?.price_cents ?? 0,
          originalPriceCents: result.originalPriceCents ?? selectedService?.price_cents ?? 0,
          discountCents: result.discountCents ?? 0,
          promotionTitle: result.promotionTitle,
        });
      } catch {
        toast.error('Errore di connessione durante la conferma. Ricarica la pagina e riprova.');
      }
    });
  };

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => router.push('/'), 5000);
    return () => clearTimeout(timer);
  }, [confirmation, router]);

  if (confirmation) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-gold">Prenotazione confermata</CardTitle>
            <p className="text-sm text-white/50">
              Ti invieremo un promemoria 6 ore prima via WhatsApp ed email (se indicata). A breve torni alla home.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm space-y-2">
              <p><strong>Servizio:</strong> {confirmation.serviceName}</p>
              {confirmation.discountCents > 0 ? (
                <>
                  <p><strong>Prezzo:</strong> <span className="line-through text-white/40">{formatPrice(confirmation.originalPriceCents)}</span> {formatPrice(confirmation.priceCents)}</p>
                  <p><strong>Sconto:</strong> -{formatPrice(confirmation.discountCents)}{confirmation.promotionTitle ? ` (${confirmation.promotionTitle})` : ''}</p>
                </>
              ) : (
                <p><strong>Prezzo:</strong> {formatPrice(confirmation.priceCents)}</p>
              )}
              <p><strong>Data:</strong> {format(parseISO(confirmation.date), "EEEE d MMMM yyyy", { locale: it })} alle {confirmation.time}</p>
              <p><strong>Barbiere:</strong> {confirmation.barberName}</p>
              <p><strong>Nome:</strong> {confirmation.customerName}</p>
            </div>
            <Button className="w-full" onClick={() => router.push('/')}>
              Torna alla home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
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

      <Card>
        <CardHeader>
          <CardTitle>Prenotazione online</CardTitle>
          <p className="text-sm text-white/50">Scegli servizio, barbiere e orario — conferma automatica</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectService(s.id)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition hover:border-gold',
                    serviceId === s.id ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                  )}
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gold">{formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && selectedService && (
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
                          <p className="font-medium">{b.name}</p>
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
                    <p className="font-medium">Nessuna preferenza</p>
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

          {step === 3 && selectedService && date && time && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 text-sm space-y-1">
                <p><strong>Servizio:</strong> {selectedService.name}</p>
                {appliedPromotion && appliedPromotion.discountCents > 0 ? (
                  <>
                    <p>
                      <strong>Prezzo:</strong>{' '}
                      <span className="line-through text-white/40">{formatPrice(selectedService.price_cents)}</span>{' '}
                      <span className="text-gold">{formatPrice(appliedPromotion.finalCents)}</span>
                    </p>
                    <p className="text-emerald-400/90">
                      Sconto {formatPrice(appliedPromotion.discountCents)} — {appliedPromotion.title}
                      {appliedPromotion.code ? ` (${appliedPromotion.code})` : ''}
                    </p>
                  </>
                ) : (
                  <p><strong>Prezzo:</strong> {formatPrice(selectedService.price_cents)}</p>
                )}
                <p><strong>Data:</strong> {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })} alle {time}</p>
                <p><strong>Barbiere:</strong> {barberId ? barbers.find((b) => b.id === barberId)?.name : 'Primo disponibile'}</p>
              </div>
              <div>
                <Label htmlFor="promo-code">Codice promozionale (opzionale)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="promo-code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Es. PRIMAVERA20"
                    className="font-mono uppercase"
                    disabled={promoSource === 'code'}
                  />
                  {promoSource === 'code' ? (
                    <Button type="button" variant="outline" onClick={handleRemovePromoCode}>
                      Rimuovi
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={handleApplyPromoCode} disabled={validatingPromo}>
                      {validatingPromo ? '...' : 'Applica'}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="name">Nome e cognome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">Telefono *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="320 188 6277" className="mt-1" />
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
                  className="mt-1"
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

          <div className="flex justify-between border-t border-white/10 pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Indietro</Button>
            ) : <div />}
            {step < 3 ? (
              <Button disabled={step === 2 && !time} onClick={() => time && setStep(3)} className={step === 2 && !time ? 'opacity-50' : ''}>
                Avanti
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={pending}>
                {pending ? 'Conferma in corso...' : 'Conferma prenotazione'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}