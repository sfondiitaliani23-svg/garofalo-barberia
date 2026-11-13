'use client';

import { useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { CalendarCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveUnlockedDaysAction } from '@/lib/actions/unlocked-days';
import { isValidDay } from '@/lib/utils/unlocked-days';

// Giorni sbloccati (13/11/2026): prenotabili online anche se cadono dentro ferie o chiusure.
export function UnlockedDaysCard({ initialDays }: { initialDays: string[] }) {
  const [days, setDays] = useState<string[]>(initialDays);
  const [newDay, setNewDay] = useState('');
  const [pending, startTransition] = useTransition();
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = days.filter((d) => d >= today);

  const save = (next: string[], done: string) => {
    startTransition(async () => {
      const res = await saveUnlockedDaysAction(next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDays(res.days);
      toast.success(done);
    });
  };

  const add = () => {
    if (!isValidDay(newDay)) {
      toast.error('Scegli un giorno.');
      return;
    }
    if (days.includes(newDay)) {
      toast.info('Questo giorno è già sbloccato.');
      return;
    }
    save([...days, newDay], 'Giorno sbloccato: ora si può prenotare online.');
    setNewDay('');
  };

  return (
    <section id="giorni-sbloccati" className="scroll-mt-24 rounded-xl border border-white/10 bg-[#111] p-5">
      <div className="mb-2 flex items-center gap-2">
        <CalendarCheck size={18} className="text-gold" />
        <h2 className="font-display text-xl uppercase text-gold">Giorni sbloccati</h2>
      </div>
      <p className="mb-5 text-sm text-white/60">
        Un giorno sbloccato si può prenotare online anche se cade dentro ferie o chiusure. Valgono gli orari normali di quel giorno.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#0a0a0a] p-4">
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="unlock-day">Giorno da sbloccare</Label>
          <Input id="unlock-day" type="date" min={today} value={newDay} onChange={(e) => setNewDay(e.target.value)} className="mt-1" />
        </div>
        <Button type="button" onClick={add} disabled={pending || !newDay}>
          Sblocca
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-sm text-white/45">Nessun giorno sbloccato.</p>
        ) : (
          upcoming.map((d) => (
            <div key={d} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3">
              <p className="font-medium capitalize text-white">{format(parseISO(d), 'EEEE d MMMM yyyy', { locale: it })}</p>
              <button
                type="button"
                onClick={() => save(days.filter((x) => x !== d), 'Blocco rimesso su questo giorno.')}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Rimetti il blocco
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
