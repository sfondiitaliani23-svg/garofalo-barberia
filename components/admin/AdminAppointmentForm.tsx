'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { X, Pencil, XCircle } from 'lucide-react';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthDatePicker } from '@/components/booking/MonthDatePicker';
import {
  createAdminAppointment,
  updateAdminAppointment,
  adminCancelAppointment,
  updateAppointmentStatus,
} from '@/lib/actions/admin';
import { getAvailableDates, getAvailableSlots } from '@/lib/actions/availability';
import { InactiveTimeSlotGrid } from '@/components/booking/InactiveTimeSlotGrid';
import { getDisplaySlotsForDate } from '@/lib/utils/display-slots';
import { formatPrice, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';
import type { CalendarAppointment } from '@/lib/utils/week-calendar';

interface AdminAppointmentFormProps {
  barbers: Barber[];
  services: Service[];
  barberId: string;
  appointment?: CalendarAppointment | null;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminAppointmentForm({
  barbers,
  services,
  barberId: defaultBarberId,
  appointment,
  initialDate,
  initialTime,
  onClose,
  onSaved,
}: AdminAppointmentFormProps) {
  const isEdit = Boolean(appointment);
  const [barberId, setBarberId] = useState(defaultBarberId);
  const selectedBarber = barbers.find((b) => b.id === barberId);
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? services[0]?.id ?? '');
  const selectedService = services.find((s) => s.id === serviceId);
  const [date, setDate] = useState(
    appointment
      ? format(parseISO(appointment.starts_at), 'yyyy-MM-dd')
      : initialDate ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [time, setTime] = useState(
    appointment
      ? format(parseISO(appointment.starts_at), 'HH:mm')
      : initialTime ?? '09:00'
  );
  const [customerName, setCustomerName] = useState(appointment?.customer_name ?? '');
  const [customerPhone, setCustomerPhone] = useState(appointment?.customer_phone ?? '');
  const [customDuration, setCustomDuration] = useState<number>(() => {
    if (appointment) {
      const starts = parseISO(appointment.starts_at);
      const ends = parseISO(appointment.ends_at);
      return differenceInMinutes(ends, starts);
    }
    const service = services[0];
    return service?.duration_minutes ?? 30;
  });

  useEffect(() => {
    if (!isEdit && selectedService) {
      setCustomDuration(selectedService.duration_minutes);
    }
  }, [serviceId, selectedService, isEdit]);
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [slots, setSlots] = useState<string[]>([]);
  const [notificationTime, setNotificationTime] = useState(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(now);
  });
  const [slotsUnavailable, setSlotsUnavailable] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);



  const loadSlots = useCallback(async () => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    const { slots: s, unavailable } = await getAvailableSlots(
      barberId,
      date,
      customDuration,
      appointment?.id ?? null,
      true
    );
    setSlots(s);
    setSlotsUnavailable(Boolean(unavailable));
    setLoadingSlots(false);
  }, [barberId, date, selectedService, appointment?.id, customDuration]);

  const loadDates = useCallback(async () => {
    if (!selectedService) return;
    setLoadingDates(true);
    const dates = await getAvailableDates(
      customDuration,
      barberId,
      appointment?.id ?? null
    );

    const extraDates = new Set(dates);
    if (appointment) {
      extraDates.add(format(parseISO(appointment.starts_at), 'yyyy-MM-dd'));
    }
    if (initialDate) {
      extraDates.add(initialDate);
    }

    setAvailableDates(Array.from(extraDates).sort());
    setLoadingDates(false);
  }, [appointment, barberId, initialDate, selectedService, customDuration]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  useEffect(() => {
    if (!isEdit || !appointment || !date) return;
    const appointmentDate = format(parseISO(appointment.starts_at), 'yyyy-MM-dd');
    if (date !== appointmentDate) return;
    setSlots((current) => (current.includes(time) ? current : [time, ...current].sort()));
  }, [appointment, date, isEdit, time]);

  function buildInput() {
    return {
      serviceId,
      barberId,
      date,
      time,
      customerName,
      customerPhone,
      notes,
      customDurationMinutes: customDuration,
      recurrenceWeeks: isRecurring ? recurrenceWeeks : 1,
    };
  }

  const handleSendAnticipateNotification = () => {
    if (!appointment) return;
    const phone = appointment.customer_phone.trim();
    if (!phone) {
      toast.error('Il cliente non ha un numero di telefono associato.');
      return;
    }

    let formattedPhone = phone.replace(/\s+/g, '').replace(/[-+]/g, '');
    if (!formattedPhone.startsWith('39') && formattedPhone.length === 10) {
      formattedPhone = '39' + formattedPhone;
    }

    const name = appointment.customer_name;
    const originalTime = format(parseISO(appointment.starts_at), 'HH:mm');
    const msg = `Ciao ${name}! Ti scriviamo da Garofalo Barberia. Volevamo avvisarti che si è liberato un posto prima, all'incirca per le ${notificationTime}. Se ti fa comodo anticipare il tuo appuntamento delle ${originalTime}, rispondi a questo messaggio! Grazie.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast.success('Apertura WhatsApp in corso...');
  };

  const handleSave = useCallback(() => {
    if (!customerName.trim() || !serviceId || !time) {
      toast.error('Compila nome, servizio e orario');
      return;
    }

    startTransition(async () => {
      const input = buildInput();
      const result = isEdit
        ? await updateAdminAppointment(appointment!.id, input)
        : await createAdminAppointment(input);

      if (!result.ok) {
        toast.error(result.error);
        if (result.error?.includes('occupato')) loadSlots();
        return;
      }

      if (!isEdit && 'isRecurring' in result && result.isRecurring) {
        const succ = (result as any).successCount || 0;
        const fail = (result as any).failedCount || 0;
        if (fail > 0) {
          toast.warning(`Prenotate ${succ} settimane su ${succ + fail}. Alcune date erano già occupate.`);
        } else {
          toast.success(`Prenotate con successo tutte le ${succ} settimane!`);
        }
      } else {
        toast.success(isEdit ? 'Prenotazione modificata' : 'Prenotazione creata');
      }
      onSaved();
      onClose();
    });
  }, [
    appointment,
    barberId,
    customerName,
    customerPhone,
    date,
    isEdit,
    loadSlots,
    notes,
    onClose,
    onSaved,
    serviceId,
    startTransition,
    time,
    isRecurring,
    recurrenceWeeks,
    customDuration,
  ]);

  useAdminSaveRegistration({ isDirty: true, isSaving: pending, save: handleSave });

  function handleCancel() {
    if (!appointment) return;
    if (!window.confirm('Disdire questa prenotazione?')) return;

    startTransition(async () => {
      const result = await adminCancelAppointment(appointment.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Prenotazione disdetta');
      onSaved();
      onClose();
    });
  }

  function handleComplete() {
    if (!appointment) return;

    startTransition(async () => {
      const result = await updateAppointmentStatus(appointment.id, 'completed');
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Segnato come completato');
      onSaved();
      onClose();
    });
  }

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/15 bg-[#111] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-appointment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 id="admin-appointment-title" className="font-display text-xl uppercase text-gold">
            {isEdit ? 'Modifica prenotazione' : 'Nuova prenotazione'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <Label htmlFor="admin-name">Nome cliente *</Label>
            <Input
              id="admin-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Mario Rossi"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-phone">Telefono (opzionale)</Label>
            <Input
              id="admin-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Se non disponibile, lascia vuoto"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Servizio *</Label>
            <div className="admin-modal-scroll mt-2 grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setTime('');
                  }}
                  className={cn(
                    'rounded-lg border p-3 text-left transition hover:border-gold/50',
                    serviceId === s.id ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                  )}
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gold">
                    {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="admin-barber">Barbiere</Label>
            {isEdit ? (
              <p className="mt-1 rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white">
                {selectedBarber?.name ?? '—'}
              </p>
            ) : (
              <select
                id="admin-barber"
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <Label>Data *</Label>
            <div className="mt-2">
              <MonthDatePicker
                dates={availableDates}
                selectedDate={date}
                onSelectDate={(nextDate) => {
                  setDate(nextDate);
                  setTime('');
                }}
                loading={loadingDates}
              />
            </div>
          </div>
          <div>
            <Label>Orario *</Label>
            {loadingSlots ? (
              <p className="mt-2 text-sm text-white/50">Caricamento orari...</p>
            ) : slotsUnavailable ? (
              <div className="mt-2">
                <InactiveTimeSlotGrid slots={getDisplaySlotsForDate(date)} className="grid-cols-4" />
              </div>
            ) : slots.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">Nessun orario libero in questa data.</p>
            ) : (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={cn(
                      'rounded-lg border py-2 text-sm font-medium transition',
                      time === t ? 'border-gold bg-gold text-black' : 'border-white/15 bg-[#1a1a1a] hover:border-gold/50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="admin-duration">Durata personalizzata (minuti) *</Label>
            <Input
              id="admin-duration"
              type="number"
              min={5}
              max={240}
              step={5}
              value={customDuration}
              onChange={(e) => setCustomDuration(Number(e.target.value))}
              placeholder="Usa durata standard del servizio"
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-white/40">
              Durata standard per {selectedService?.name}: {selectedService?.duration_minutes} min. Modificala per liberare lo slot.
            </p>
          </div>
          <div>
            <Label htmlFor="admin-notes">Note</Label>
            <textarea
              id="admin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Es. cliente in salone, prima volta..."
              className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
            />
          </div>

          {!isEdit && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-white/20 bg-black text-gold focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                <span className="text-sm font-medium text-white/90">Prenotazione ricorrente</span>
              </label>

              {isRecurring && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="recurrence-weeks" className="text-xs text-white/60">
                    Ripeti ogni settimana per:
                  </Label>
                  <select
                    id="recurrence-weeks"
                    value={recurrenceWeeks}
                    onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                    className="block w-full rounded-md border border-white/15 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
                  >
                    <option value={2}>2 settimane (2 appuntamenti)</option>
                    <option value={4}>4 settimane (4 appuntamenti)</option>
                    <option value={6}>6 settimane (6 appuntamenti)</option>
                    <option value={8}>8 settimane (8 appuntamenti)</option>
                    <option value={12}>12 settimane (12 appuntamenti)</option>
                  </select>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Gli appuntamenti verranno creati lo stesso giorno della settimana alla stessa ora. Se un orario è occupato in una settimana specifica, quella settimana verrà saltata.
                  </p>
                </div>
              )}
            </div>
          )}

          {isEdit && appointment && (
            <>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-3 mt-4">
                <h4 className="text-sm font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                  Avviso per anticipo orario
                </h4>
                <p className="text-xs text-white/60">
                  Invia un messaggio precompilato su WhatsApp a questo cliente informandolo che si è liberato uno slot a causa di una disdetta o di un servizio concluso prima.
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label htmlFor="notification-free-time" className="text-[10px] uppercase text-white/50">Orario Libero</Label>
                    <Input
                      id="notification-free-time"
                      type="time"
                      value={notificationTime}
                      onChange={(e) => setNotificationTime(e.target.value)}
                      className="mt-1 bg-[#161616] text-xs h-9 border-white/10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendAnticipateNotification}
                    className="bg-gold hover:bg-gold-light text-black font-semibold text-xs h-9 border-none px-4 rounded-md"
                  >
                    Avvisa su WhatsApp
                  </Button>
                </div>
              </div>

              <p className="text-center text-xs text-white/40">
                Attuale: {format(parseISO(appointment.starts_at), "EEEE d MMMM 'alle' HH:mm", { locale: it })}
              </p>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                isEdit
                  ? 'border border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                  : 'bg-gold text-black hover:bg-gold-light'
              )}
            >
              <Pencil size={16} />
              {pending ? 'Salvataggio...' : isEdit ? 'Modifica prenotazione' : 'Crea prenotazione'}
            </button>
            {isEdit && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-500/60 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Disdici prenotazione
                </button>
                <Button type="button" variant="outline" onClick={handleComplete} disabled={pending} className="w-full">
                  Segna completato
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}