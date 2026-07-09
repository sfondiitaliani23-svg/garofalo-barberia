'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { X, Pencil, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createAdminAppointment,
  updateAdminAppointment,
  adminCancelAppointment,
  updateAppointmentStatus,
} from '@/lib/actions/admin';
import { getAvailableSlots } from '@/lib/actions/availability';
import { formatPrice } from '@/lib/utils';
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
  const [barberId, setBarberId] = useState(appointment?.barber_id ?? defaultBarberId);
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
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, startTransition] = useTransition();

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
    const withCurrent =
      isEdit && date === format(parseISO(appointment!.starts_at), 'yyyy-MM-dd') && !s.includes(time)
        ? [time, ...s].sort()
        : s;
    setSlots(withCurrent);
    if (error) toast.error(error);
    setLoadingSlots(false);
  }, [barberId, date, selectedService, appointment, isEdit, time]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

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

  function handleSave() {
    if (!customerName.trim() || !customerPhone.trim() || !serviceId || !time) {
      toast.error('Compila tutti i campi obbligatori');
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
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase text-gold">
            {isEdit ? 'Modifica prenotazione' : 'Nuova prenotazione'}
          </h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
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
            <Label htmlFor="admin-phone">Telefono *</Label>
            <Input
              id="admin-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="320 123 4567"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-service">Servizio *</Label>
            <select
              id="admin-service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatPrice(s.price_cents)} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="admin-barber">Barbiere *</Label>
            <select
              id="admin-barber"
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="admin-date">Data *</Label>
            <Input
              id="admin-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
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
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
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

        {isEdit && appointment && (
          <p className="mt-3 text-center text-xs text-white/40">
            Attuale: {format(parseISO(appointment.starts_at), "EEEE d MMMM 'alle' HH:mm", { locale: it })}
          </p>
        )}
      </div>
    </div>
  );
}