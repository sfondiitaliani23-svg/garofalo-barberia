'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import { saveAdminPromotion, deleteAdminPromotion } from '@/lib/actions/admin';
import { calculateDiscount, formatDiscountLabel, isPromotionActive } from '@/lib/utils/promotions';
import { formatPrice } from '@/lib/utils';
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

type PromoTab = 'all' | 'active' | 'expiring' | 'expired';
const PROMO_TABS: { id: PromoTab; label: string }[] = [
  { id: 'all', label: 'Tutte' },
  { id: 'active', label: 'Attive' },
  { id: 'expiring', label: 'In scadenza' },
  { id: 'expired', label: 'Scadute / disattive' },
];

/** Foto reali del salone per categoria (come nella pagina Servizi). */
const CATEGORY_IMAGES: Record<string, string> = {
  taglio: '/assets/gallery/1000313550.jpg',
  baby: '/assets/gallery/1000313555.jpg',
  barba: '/assets/gallery/1000313557.jpg',
  styling: '/assets/gallery/1000313548.jpg',
};
const DEFAULT_IMAGE = '/assets/gallery/1000313546.jpg';

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
  const [tab, setTab] = useState<PromoTab>('all');

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

  const now = new Date();
  const soon = (p: Promotion) =>
    isPromotionActive(p, now) && !!p.ends_at && new Date(p.ends_at).getTime() - now.getTime() <= 7 * 86_400_000;
  const groups: Record<PromoTab, Promotion[]> = {
    all: items,
    active: items.filter((p) => isPromotionActive(p, now) && !soon(p)),
    expiring: items.filter((p) => soon(p)),
    expired: items.filter((p) => !isPromotionActive(p, now)),
  };
  const visible = groups[tab];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Promozioni
          </h1>
          <p className="mt-1 text-sm text-white/50">Crea, gestisci e monitora le tue promozioni e i codici sconto.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuova promozione
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filtra promozioni">
        {PROMO_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition',
              tab === t.id ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/65 hover:border-white/35'
            )}
          >
            {t.label} ({groups[t.id].length})
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((p) => (
          <PromotionCard
            key={p.id}
            promo={p}
            expiring={soon(p)}
            pending={pending}
            onEdit={() => openEdit(p)}
            onDelete={() => handleDelete(p)}
          />
        ))}
        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-white/[0.015] p-6 text-center transition hover:border-gold hover:bg-gold/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 text-gold">
            <Plus size={22} aria-hidden />
          </span>
          <span className="font-semibold text-gold">Crea nuova promozione</span>
          <span className="text-xs text-white/45">Aggiungi una nuova offerta per i tuoi clienti</span>
        </button>
      </div>
      {visible.length === 0 && tab !== 'all' && (
        <p className="mt-4 text-sm text-white/45">Nessuna promozione in questa sezione.</p>
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

function PromotionCard({
  promo,
  expiring,
  pending,
  onEdit,
  onDelete,
}: {
  promo: Promotion;
  expiring: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const base = promotionStatus(promo);
  const status = expiring ? { label: 'In scadenza', className: 'text-amber-300 bg-amber-500/15' } : base;
  const svc = promo.service as (Service & { category?: string }) | null | undefined;
  const image = (svc?.category && CATEGORY_IMAGES[svc.category]) || DEFAULT_IMAGE;
  const price = svc?.price_cents ? calculateDiscount(svc.price_cents, promo) : null;
  const ends = promo.ends_at
    ? new Date(promo.ends_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' })
    : null;

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl border bg-[#0e0e0e] transition hover:border-gold/40', expiring ? 'border-amber-500/30' : 'border-white/10', base.label !== 'Attiva' && !expiring && 'opacity-75')}>
      <div className="relative h-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: `url(${image})`, backgroundPosition: 'center 30%', filter: 'sepia(0.4) saturate(0.75) brightness(0.55)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent" aria-hidden />
        <span className={cn('absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm', status.className)}>
          {status.label}
        </span>
        <span className="absolute left-3 top-2 rounded-md bg-gold px-2 py-0.5 text-xs font-bold text-black">
          {formatDiscountLabel(promo.discount_type, promo.discount_value)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-1">
        <p className="font-semibold text-white">{promo.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
          {promo.description || (svc?.name ? `Su ${svc.name}` : 'Valida su tutti i servizi')}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          {price ? (
            <>
              <span className="text-xl font-bold text-gold">{formatPrice(price.finalCents)}</span>
              <span className="text-xs text-white/40 line-through">{formatPrice(svc!.price_cents)}</span>
            </>
          ) : (
            <span className="text-sm text-white/60">{svc?.name ?? 'Tutti i servizi'}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-white/45">
          {promo.code && (
            <span>
              Codice <strong className="font-mono text-white/75">{promo.code}</strong>
            </span>
          )}
          <span>{ends ? `Scade il ${ends}` : 'Senza scadenza'}</span>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4">
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
            aria-label={`Elimina ${promo.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
