'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAppointment } from '@/lib/actions/bookings';
import { getAvailableSlots } from '@/lib/actions/availability';
import { formatPrice, formatDuration } from '@/lib/utils';
import type { Barber, Service } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BookingWizardProps {
  services: Service[];
  barbers: Barber[];
  defaultName?: string;
  defaultPhone?: string;
}

const STEPS = ['Servizio', 'Barbiere & Orario', 'Conferma'];

export function BookingWizard({ services, barbers, defaultName = '', defaultPhone = '' }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);

  const loadDates = useCallback(async () => {
    if (!selectedService) return;
    const result: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 1) continue;
      const ds = format(d, 'yyyy-MM-dd');
      const { slots: s } = await getAvailableSlots(barberId, ds, selectedService.duration_minutes);
      if (s.length > 0) result.push(ds);
    }
    setDates(result);
    if (result.length && !date) setDate(result[0]);
  }, [selectedService, barberId, date]);

  const loadSlots = useCallback(async () => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    const { slots: s, error } = await getAvailableSlots(barberId, date, selectedService.duration_minutes);
    setSlots(s);
    if (error) toast.error(error);
    setLoadingSlots(false);
  }, [selectedService, barberId, date]);

  useEffect(() => {
    if (step === 2 && selectedService) loadDates();
  }, [step, selectedService, barberId, loadDates]);

  useEffect(() => {
    if (step === 2 && date && selectedService) loadSlots();
  }, [step, date, selectedService, barberId, loadSlots]);

  function selectService(id: string) {
    setServiceId(id);
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
      const result = await createAppointment({
        serviceId,
        barberId,
        date,
        time,
        customerName: name,
        customerPhone: phone,
        notes,
      });

      if (!result.ok) {
        toast.error(result.error);
        if (result.error?.includes('prenotato')) {
          setStep(2);
          loadSlots();
        }
        return;
      }

      if ('fallback' in result && result.fallback) {
        toast.success('Apri WhatsApp per confermare la prenotazione');
      } else {
        toast.success('Prenotazione confermata!');
      }
      if (result.whatsappUrl) window.open(result.whatsappUrl, '_blank');
    });
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
                  {barbers.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setBarberId(b.id); setTime(null); }}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition',
                        barberId === b.id ? 'border-gold bg-gold/10' : 'border-white/15 bg-[#1a1a1a]'
                      )}
                    >
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-sm text-gold">{b.role}</p>
                      </div>
                      {b.image_url && (
                        <Image src={b.image_url} alt={b.name} width={60} height={78} className="h-[68px] w-[52px] rounded object-cover object-top" />
                      )}
                    </button>
                  ))}
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
                <p><strong>Servizio:</strong> {selectedService.name} ({formatPrice(selectedService.price_cents)})</p>
                <p><strong>Data:</strong> {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })} alle {time}</p>
                <p><strong>Barbiere:</strong> {barberId ? barbers.find((b) => b.id === barberId)?.name : 'Primo disponibile'}</p>
              </div>
              <div>
                <Label htmlFor="name">Nome e cognome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">Telefono *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="320 188 6277" className="mt-1" />
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