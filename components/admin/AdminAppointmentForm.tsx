'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
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
  const barberId = defaultBarberId;
  const selectedBarber = barbers.find((b) => b.id === barberId);
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? services[0]?.id ?? '');
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
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [slots, setSlots] = useState<string[]>([]);
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

  const selectedService = services.find((s) => s.id === serviceId);

  const loadSlots = useCallback(async () => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    const { slots: s, error } = await getAvailableSlots(
      barberId,
      date,
      selectedService.duration_minutes,
      appointment?.id ?? null,
      true
    );
    setSlots(s);
    if (error) toast.error(error);
    setLoadingSlots(false);
  }, [barberId, date, selectedService, appointment?.id]);

  const loadDates = useCallback(async () => {
    if (!selectedService) return;
    setLoadingDates(true);
    const dates = await getAvailableDates(
      selectedService.duration_minutes,
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
  }, [appointment, barberId, initialDate, selectedService]);

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
    };
  }

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

      toast.success(isEdit ? 'Prenotazione modificata' : 'Prenotazione creata');
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
            <Label>Barbiere</Label>
            <p className="mt-1 rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white">
              {selectedBarber?.name ?? '—'}
            </p>
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

          {isEdit && appointment && (
            <p className="text-center text-xs text-white/40">
              Attuale: {format(parseISO(appointment.starts_at), "EEEE d MMMM 'alle' HH:mm", { locale: it })}
            </p>
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