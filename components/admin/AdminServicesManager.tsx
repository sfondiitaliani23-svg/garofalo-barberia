'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import { saveAdminService, deleteAdminService } from '@/lib/actions/admin';
import { formatPrice, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Service, ServiceCategory } from '@/types/database';

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'taglio', label: 'Taglio' },
  { value: 'barba', label: 'Barba' },
  { value: 'styling', label: 'Styling' },
  { value: 'baby', label: 'Baby' },
];

interface AdminServicesManagerProps {
  services: Service[];
}

export function AdminServicesManager({ services }: AdminServicesManagerProps) {
  const [items, setItems] = useState(services);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(services);
  }, [services]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('taglio');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  function openCreate() {
    setEditing(null);
    setName('');
    setCategory('taglio');
    setPrice('');
    setDuration('30');
    setDescription('');
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setName(service.name);
    setCategory(service.category);
    setPrice((service.price_cents / 100).toString());
    setDuration(String(service.duration_minutes));
    setDescription(service.description ?? '');
    setModalOpen(true);
  }

  const handleSave = useCallback(() => {
    const priceEuros = parseFloat(price.replace(',', '.'));
    const durationMinutes = parseInt(duration, 10);

    if (!name.trim()) {
      toast.error('Inserisci il nome del servizio');
      return;
    }
    if (Number.isNaN(priceEuros) || priceEuros <= 0) {
      toast.error('Inserisci un prezzo valido');
      return;
    }
    if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      toast.error('Inserisci una durata valida');
      return;
    }

    startTransition(async () => {
      const result = await saveAdminService({
        id: editing?.id,
        name,
        category,
        priceEuros,
        durationMinutes,
        description,
        isActive: true,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const priceCents = Math.round(priceEuros * 100);
      const optimistic: Service = {
        id: editing?.id ?? `temp-${Date.now()}`,
        name: name.trim(),
        category,
        price_cents: priceCents,
        duration_minutes: durationMinutes,
        description: description.trim() || null,
        is_active: true,
        sort_order: editing?.sort_order ?? items.length + 1,
      };

      setItems((prev) =>
        editing
          ? prev.map((service) => (service.id === editing.id ? optimistic : service))
          : [...prev, optimistic]
      );
      toast.success(editing ? 'Servizio modificato' : 'Servizio creato');
      setModalOpen(false);
    });
  }, [category, description, duration, editing, items.length, name, price, startTransition]);

  useAdminSaveRegistration(
    modalOpen ? { isDirty: true, isSaving: pending, save: handleSave } : null
  );

  function handleDelete(service: Service) {
    const confirmed = window.confirm(
      `Eliminare "${service.name}"?\n\nSe ha prenotazioni attive verrà disattivato invece di essere rimosso.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteAdminService(service.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setItems((prev) =>
        result.deactivated
          ? prev.map((entry) => (entry.id === service.id ? { ...entry, is_active: false } : entry))
          : prev.filter((entry) => entry.id !== service.id)
      );
      toast.success(
        result.deactivated
          ? 'Servizio disattivato (ha prenotazioni attive)'
          : 'Servizio eliminato'
      );
    });
  }

  const activeServices = items.filter((s) => s.is_active);
  const inactiveServices = items.filter((s) => !s.is_active);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-white/50">Crea, modifica o elimina i servizi del listino</p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuovo servizio
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {activeServices.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            pending={pending}
            onEdit={() => openEdit(s)}
            onDelete={() => handleDelete(s)}
          />
        ))}
        {activeServices.length === 0 && (
          <p className="text-white/50">Nessun servizio attivo. Creane uno nuovo.</p>
        )}
      </div>

      {inactiveServices.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
            Servizi disattivati
          </h2>
          <div className="space-y-2 opacity-70">
            {inactiveServices.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                pending={pending}
                onEdit={() => openEdit(s)}
                onDelete={() => handleDelete(s)}
                inactive
              />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-gold">
                {editing ? 'Modifica servizio' : 'Nuovo servizio'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="service-name">Nome *</Label>
                <Input
                  id="service-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Taglio e shampoo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="service-category">Categoria *</Label>
                <select
                  id="service-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-price">Prezzo (€) *</Label>
                  <Input
                    id="service-price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="17"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="service-duration">Durata (min) *</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min="5"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="service-description">Descrizione (opzionale)</Label>
                <textarea
                  id="service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                  editing
                    ? 'border border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                    : 'bg-gold text-black hover:bg-gold-light'
                )}
              >
                <Pencil size={16} />
                {pending ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea servizio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  pending,
  onEdit,
  onDelete,
  inactive = false,
}: {
  service: Service;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  inactive?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3">
      <div>
        <p className="font-medium">
          {service.name}
          {inactive && <span className="ml-2 text-xs text-white/40">(disattivato)</span>}
        </p>
        <p className="text-xs text-white/40">
          {service.category} · {formatDuration(service.duration_minutes)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold text-gold">{formatPrice(service.price_cents)}</p>
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/25 disabled:opacity-50"
        >
          <Pencil size={14} />
          Modifica
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          <Trash2 size={14} />
          Elimina
        </button>
      </div>
    </div>
  );
}