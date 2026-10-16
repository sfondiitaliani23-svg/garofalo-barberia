'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { joinWaitlist } from '@/lib/actions/waitlist';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

interface WaitlistFormProps {
  date: string;
  barberId: string | null;
  serviceIds: string[];
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}

/** Giorno al completo: il cliente lascia i dati e riceve una email se si libera un posto. */
export function WaitlistForm({ date, barberId, serviceIds, defaultName = '', defaultPhone = '', defaultEmail = '' }: WaitlistFormProps) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-gold-light">
        {L(lang, 'Ok! Se si libera un posto per questo giorno ti scriviamo via email.', 'Done! If a spot opens up on this day, we will email you.')}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-dashed border-white/10 pt-4">
        <p className="text-xs text-white/60">{L(lang, 'Ti serve proprio questo giorno?', 'Do you need this exact day?')}</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setOpen(true)}>
          {L(lang, 'Avvisami se si libera un posto', 'Notify me if a spot opens up')}
        </Button>
      </div>
    );
  }

  const submit = () => {
    startTransition(async () => {
      const res = await joinWaitlist({ date, barberId, serviceIds, customerName: name, customerPhone: phone, customerEmail: email });
      if (res.ok) setDone(true);
      else toast.error(res.error ?? L(lang, 'Qualcosa non ha funzionato. Riprova.', 'Something went wrong. Please try again.'));
    });
  };

  return (
    <div className="mt-4 space-y-2 border-t border-dashed border-white/10 pt-4 text-left">
      <p className="text-xs text-white/60">
        {L(lang, 'Lascia i tuoi dati: se si libera un posto ti scriviamo una email. Non è una prenotazione.', 'Leave your details: if a spot opens up we will email you. This is not a booking.')}
      </p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L(lang, 'Nome', 'Name')} aria-label={L(lang, 'Nome', 'Name')} className="bg-[#1a1a1a] border-white/15" />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={L(lang, 'Telefono', 'Phone')} aria-label={L(lang, 'Telefono', 'Phone')} className="bg-[#1a1a1a] border-white/15" />
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className="bg-[#1a1a1a] border-white/15" />
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? L(lang, 'Invio…', 'Sending…') : L(lang, 'Mettimi in lista', 'Put me on the list')}
      </Button>
    </div>
  );
}
