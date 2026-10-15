'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { Profile } from '@/types/database';
import { deleteAdminCustomer, updateAdminCustomer } from '@/lib/actions/admin';

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl outline-none">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/55 hover:text-white" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const field = 'w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50';

export function EditCustomerDialog({ customer, onClose }: { customer: Profile; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState(customer.full_name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [hair, setHair] = useState(customer.hair_preferences ?? '');
  const [notes, setNotes] = useState(customer.personal_notes ?? '');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    start(async () => {
      try {
        const r = await updateAdminCustomer(customer.id, { fullName, phone, hairPreferences: hair, personalNotes: notes });
        if (!r.ok) return setError(r.error ?? 'Non sono riuscito a salvare.');
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Non sono riuscito a salvare.');
      }
    });
  };

  return (
    <Shell title="Modifica cliente" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className={label} htmlFor="cust-name">Nome e cognome</label>
          <input id="cust-name" className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className={label} htmlFor="cust-phone">Telefono</label>
          <input id="cust-phone" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={25} />
        </div>
        <div>
          <label className={label} htmlFor="cust-email">Email (non modificabile)</label>
          <input id="cust-email" className={`${field} opacity-60`} value={customer.email ?? ''} readOnly disabled />
          <p className="mt-1 text-[11px] text-white/40">È l&apos;email con cui il cliente accede.</p>
        </div>
        <div>
          <label className={label} htmlFor="cust-hair">Preferenze</label>
          <textarea id="cust-hair" className={field} rows={2} value={hair} onChange={(e) => setHair(e.target.value)} maxLength={1000} />
        </div>
        <div>
          <label className={label} htmlFor="cust-notes">Note</label>
          <textarea id="cust-notes" className={field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-white/15 px-5 text-sm text-white/75 hover:text-white">Annulla</button>
          <button type="submit" disabled={pending} className="h-10 rounded-full bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-60">
            {pending ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </form>
    </Shell>
  );
}

export function DeleteCustomerDialog({ customer, hasUpcoming, onClose }: { customer: Profile; hasUpcoming: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const remove = () => {
    setError('');
    start(async () => {
      try {
        const r = await deleteAdminCustomer(customer.id);
        if (!r.ok) return setError(r.error ?? 'Non sono riuscito a eliminare.');
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Non sono riuscito a eliminare.');
      }
    });
  };

  return (
    <Shell title="Elimina cliente" onClose={onClose}>
      <p className="text-sm text-white/80">
        Vuoi eliminare <strong className="text-white">{customer.full_name || customer.email || 'questo cliente'}</strong>?
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/60">
        <li>L&apos;account e il profilo vengono cancellati. Non si può tornare indietro.</li>
        <li>Le foto della sua galleria vengono tolte.</li>
        <li>Le sue prenotazioni restano nel calendario e nello storico, con nome e telefono.</li>
      </ul>
      {hasUpcoming && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Attenzione: questo cliente ha un appuntamento in programma. Resta in calendario.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 rounded-full border border-white/15 px-5 text-sm text-white/75 hover:text-white">Annulla</button>
        <button type="button" onClick={remove} disabled={pending} className="h-10 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60">
          {pending ? 'Elimino…' : 'Elimina'}
        </button>
      </div>
    </Shell>
  );
}
