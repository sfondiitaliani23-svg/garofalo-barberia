'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import { saveAdminPromotion, deleteAdminPromotion } from '@/lib/actions/admin';
import { formatDiscountLabel, isPromotionActive } from '@/lib/utils/promotions';
import { cn } from '@/lib/utils';
import type { DiscountType, Promotion, Service } from '@/types/database';

interface AdminPromotionsManagerProps {
  promotions: Promotion[];
  services: Pick<Service, 'id' | 'name'>[];
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function promotionStatus(promo: Promotion) {
  if (!promo.is_active) return { label: 'Disattiva', className: 'text-white/40 bg-white/5' };
  if (!isPromotionActive(promo)) {
    if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
      return { label: 'Programmata', className: 'text-blue-300 bg-blue-500/15' };
    }
    return { label: 'Scaduta', className: 'text-orange-300 bg-orange-500/15' };
  }
  return { label: 'Attiva', className: 'text-emerald-300 bg-emerald-500/15' };
}

export function AdminPromotionsManager({ promotions, services }: AdminPromotionsManagerProps) {
  const [items, setItems] = useState(promotions);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(promotions);
  }, [promotions]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  function openCreate() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCode('');
    setDiscountType('percent');
    setDiscountValue('10');
    setServiceId('');
    setStartsAt('');
    setEndsAt('');
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(promo: Promotion) {
    setEditing(promo);
    setTitle(promo.title);
    setDescription(promo.description ?? '');
    setCode(promo.code ?? '');
    setDiscountType(promo.discount_type);
    setDiscountValue(
      promo.discount_type === 'fixed'
        ? (promo.discount_value / 100).toString()
        : String(promo.discount_value)
    );
    setServiceId(promo.service_id ?? '');
    setStartsAt(toDatetimeLocal(promo.starts_at));
    setEndsAt(toDatetimeLocal(promo.ends_at));
    setIsActive(promo.is_active);
    setModalOpen(true);
  }

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      toast.error('Inserisci il titolo della promozione');
      return;
    }

    const value = parseFloat(discountValue.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) {
      toast.error('Inserisci un valore sconto valido');
      return;
    }

    const payload = {
      id: editing?.id,
      title,
      description,
      code: code || undefined,
      discountType,
      discountValue: discountType === 'fixed' ? Math.round(value * 100) : Math.round(value),
      serviceId: serviceId || null,
      startsAt: fromDatetimeLocal(startsAt),
      endsAt: fromDatetimeLocal(endsAt),
      isActive,
    };

    startTransition(async () => {
      const result = await saveAdminPromotion(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const optimistic: Promotion = {
        id: editing?.id ?? `temp-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || null,
        code: code.trim() || null,
        discount_type: discountType,
        discount_value: payload.discountValue,
        service_id: serviceId || null,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        is_active: isActive,
        created_at: editing?.created_at ?? new Date().toISOString(),
      };

      setItems((prev) =>
        editing
          ? prev.map((promo) => (promo.id === editing.id ? optimistic : promo))
          : [...prev, optimistic]
      );
      toast.success(editing ? 'Promozione modificata' : 'Promozione creata');
      setModalOpen(false);
    });
  }, [
    code,
    description,
    discountType,
    discountValue,
    editing,
    endsAt,
    isActive,
    serviceId,
    startTransition,
    startsAt,
    title,
  ]);

  useAdminSaveRegistration(
    modalOpen ? { isDirty: true, isSaving: pending, save: handleSave } : null
  );

  function handleDelete(promo: Promotion) {
    const confirmed = window.confirm(
      `Eliminare "${promo.title}"?\n\nSe è stata usata in prenotazioni verrà disattivata invece di essere rimossa.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteAdminPromotion(promo.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setItems((prev) =>
        result.deactivated
          ? prev.map((entry) => (entry.id === promo.id ? { ...entry, is_active: false } : entry))
          : prev.filter((entry) => entry.id !== promo.id)
      );
      toast.success(
        result.deactivated
          ? 'Promozione disattivata (usata in prenotazioni)'
          : 'Promozione eliminata'
      );
    });
  }

  const activePromos = items.filter((p) => p.is_active);
  const inactivePromos = items.filter((p) => !p.is_active);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-white/50">
          Crea promozioni, codici sconto e offerte per i tuoi clienti
        </p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuova promozione
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {activePromos.map((p) => (
          <PromotionRow
            key={p.id}
            promo={p}
            pending={pending}
            onEdit={() => openEdit(p)}
            onDelete={() => handleDelete(p)}
          />
        ))}
        {activePromos.length === 0 && (
          <p className="text-white/50">Nessuna promozione attiva. Creane una nuova.</p>
        )}
      </div>

      {inactivePromos.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
            Promozioni disattivate
          </h2>
          <div className="space-y-2 opacity-70">
            {inactivePromos.map((p) => (
              <PromotionRow
                key={p.id}
                promo={p}
                pending={pending}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
                inactive
              />
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
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto admin-modal-scroll rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-gold">
                {editing ? 'Modifica promozione' : 'Nuova promozione'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="promo-title">Titolo *</Label>
                <Input
                  id="promo-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Sconto primavera"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="promo-description">Descrizione (opzionale)</Label>
                <textarea
                  id="promo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                  placeholder="Dettagli visibili ai clienti"
                />
              </div>
              <div>
                <Label htmlFor="promo-code">Codice promozionale (opzionale)</Label>
                <Input
                  id="promo-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Es. PRIMAVERA20"
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="promo-type">Tipo sconto *</Label>
                  <select
                    id="promo-type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
                  >
                    <option value="percent">Percentuale (%)</option>
                    <option value="fixed">Importo fisso (€)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="promo-value">
                    {discountType === 'percent' ? 'Percentuale *' : 'Importo (€) *'}
                  </Label>
                  <Input
                    id="promo-value"
                    type="number"
                    min="0"
                    step={discountType === 'percent' ? '1' : '0.5'}
                    max={discountType === 'percent' ? '100' : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '20' : '5'}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="promo-service">Servizio (opzionale)</Label>
                <select
                  id="promo-service"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
                >
                  <option value="">Tutti i servizi</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="promo-start">Inizio (opzionale)</Label>
                  <Input
                    id="promo-start"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="promo-end">Fine (opzionale)</Label>
                  <Input
                    id="promo-end"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-white/20"
                />
                Promozione attiva
              </label>
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
                {pending ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea promozione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromotionRow({
  promo,
  pending,
  onEdit,
  onDelete,
  inactive = false,
}: {
  promo: Promotion;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  inactive?: boolean;
}) {
  const status = promotionStatus(promo);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-gold/15 p-2 text-gold">
          <Tag size={16} />
        </div>
        <div>
          <p className="font-medium">
            {promo.title}
            {inactive && <span className="ml-2 text-xs text-white/40">(disattivata)</span>}
          </p>
          <p className="text-xs text-white/40">
            {formatDiscountLabel(promo.discount_type, promo.discount_value)}
            {promo.code && ` · Codice: ${promo.code}`}
            {promo.service?.name ? ` · ${promo.service.name}` : ' · Tutti i servizi'}
          </p>
          {promo.description && (
            <p className="mt-1 text-xs text-white/50">{promo.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.className)}>
          {status.label}
        </span>
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