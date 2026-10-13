'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import { saveAdminService, deleteAdminService } from '@/lib/actions/admin';
import { formatPrice, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isServiceAdminOnly } from '@/lib/data/services';
import type { Service, ServiceCategory } from '@/types/database';

/** Stesse foto reali del salone usate nella pagina Servizi pubblica. */
const CATEGORY_IMAGES: Record<ServiceCategory, string> = {
  taglio: '/assets/gallery/web/1000313550.webp',
  baby: '/assets/gallery/web/1000313555.webp',
  barba: '/assets/gallery/web/1000313557.webp',
  styling: '/assets/gallery/web/1000313548.webp',
};

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
  const [filter, setFilter] = useState<ServiceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

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

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: activeServices.filter((s) => s.category === c.value).length,
  }));
  const visible = filter === 'all' ? activeServices : activeServices.filter((s) => s.category === filter);

  return (
    <div>
      {/* Header con foto, versione scura (concept 01) */}
      <div className="relative isolate overflow-hidden rounded-xl border border-white/10">
        <div
          className="absolute inset-0 -z-10 bg-cover"
          style={{
            backgroundImage: `url(${CATEGORY_IMAGES.styling})`,
            backgroundPosition: 'center 40%',
            filter: 'sepia(0.5) saturate(0.7) brightness(0.35)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/55 to-black/30" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
          <div>
            <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Servizi e Prezzi
            </h1>
            <p className="mt-1 text-sm text-white/65">Crea, modifica o elimina i servizi del listino.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="admin-filter w-56">
              <Search size={14} aria-hidden />
              <span className="sr-only">Cerca un servizio</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca un servizio..." />
            </label>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nuovo servizio
            </Button>
          </div>
        </div>
      </div>

      {/* Categorie */}
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Categorie">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          onClick={() => setFilter('all')}
          className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition', filter === 'all' ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/65 hover:border-white/35')}
        >
          Tutti ({activeServices.length})
        </button>
        {categoryCounts.map((c) => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={filter === c.value}
            onClick={() => setFilter(c.value)}
            className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition', filter === c.value ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/65 hover:border-white/35')}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visible
          .filter((s) => !q || s.name.toLowerCase().includes(q))
          .map((s) => (
            <ServiceCard key={s.id} service={s} pending={pending} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s)} />
          ))}
        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-white/[0.015] p-6 text-center transition hover:border-gold hover:bg-gold/5"
        >
          <Plus size={28} className="text-gold" aria-hidden />
          <span className="font-semibold text-gold">Nuovo servizio</span>
          <span className="text-xs text-white/45">Aggiungi un nuovo servizio al listino</span>
        </button>
      </div>
      {activeServices.length === 0 && <p className="mt-4 text-white/50">Nessun servizio attivo. Creane uno nuovo.</p>}

      {inactiveServices.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">Servizi disattivati</h2>
          <div className="grid gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-4">
            {inactiveServices.map((s) => (
              <ServiceCard key={s.id} service={s} pending={pending} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s)} inactive />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl"
          >
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

function ServiceCard({
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
  const adminOnly = isServiceAdminOnly(service.name);
  const categoryLabel = CATEGORIES.find((c) => c.value === service.category)?.label ?? service.category;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e] transition hover:border-gold/40">
      <div className="relative h-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${CATEGORY_IMAGES[service.category] ?? CATEGORY_IMAGES.taglio})`,
            backgroundPosition: 'center 30%',
            filter: 'sepia(0.4) saturate(0.75) brightness(0.55)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent" aria-hidden />
        <span
          className={cn(
            'absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold',
            inactive
              ? 'border-white/20 bg-black/60 text-white/60'
              : adminOnly
              ? 'border-amber-500/40 bg-black/60 text-amber-300'
              : 'border-emerald-500/40 bg-black/60 text-emerald-300'
          )}
        >
          {inactive ? 'Disattivato' : adminOnly ? 'Solo staff' : 'Online'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-1">
        <p className="font-semibold text-white">{service.name}</p>
        <p className="mt-0.5 text-xs text-white/45">{service.description || categoryLabel}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-white/55">
            <Clock size={12} aria-hidden />
            {formatDuration(service.duration_minutes)}
          </span>
          <span className="text-lg font-bold text-gold">{formatPrice(service.price_cents)}</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gold/50 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black disabled:opacity-50"
          >
            <Pencil size={13} />
            Modifica
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-full p-2 text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            title="Elimina"
            aria-label={`Elimina ${service.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
