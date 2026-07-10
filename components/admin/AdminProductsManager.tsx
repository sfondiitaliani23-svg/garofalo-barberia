'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Package, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import {
  saveAdminProduct,
  deleteAdminProduct,
  setProductStock,
} from '@/lib/actions/admin';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Product, ProductCategory } from '@/types/database';

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'perfume', label: 'Profumo' },
  { value: 'cosmetic', label: 'Cosmetico' },
  { value: 'accessory', label: 'Accessorio' },
  { value: 'other', label: 'Altro' },
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  perfume: 'Profumo',
  cosmetic: 'Cosmetico',
  accessory: 'Accessorio',
  other: 'Altro',
};

const STOCK_SYNC_DELAY_MS = 280;

interface AdminProductsManagerProps {
  products: Product[];
}

function buildProductFromForm(
  form: {
    name: string;
    brand: string;
    category: ProductCategory;
    sku: string;
    stock: string;
    minStock: string;
    price: string;
    imageUrl: string;
    description: string;
  },
  id: string,
  sortOrder: number
): Product {
  const stockQty = parseInt(form.stock, 10);
  const minStockQty = parseInt(form.minStock, 10);
  const priceEuros = form.price ? parseFloat(form.price.replace(',', '.')) : null;
  const now = new Date().toISOString();

  return {
    id,
    name: form.name.trim(),
    brand: form.brand.trim() || null,
    category: form.category,
    sku: form.sku.trim().toUpperCase() || null,
    stock_quantity: stockQty,
    min_stock_level: minStockQty,
    price_cents:
      priceEuros != null && priceEuros > 0 ? Math.round(priceEuros * 100) : null,
    image_url: form.imageUrl.trim() || null,
    description: form.description.trim() || null,
    is_active: true,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
}

export function AdminProductsManager({ products }: AdminProductsManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(products);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('perfume');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('2');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [pendingStockCount, setPendingStockCount] = useState(0);

  const stockTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingStock = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setItems(products);
  }, [products]);

  useEffect(() => {
    return () => {
      stockTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const lowStockProducts = items.filter(
    (p) => p.is_active && p.stock_quantity <= p.min_stock_level
  );

  function openCreate() {
    setEditing(null);
    setName('');
    setBrand('Mood');
    setCategory('perfume');
    setSku('');
    setStock('0');
    setMinStock('2');
    setPrice('');
    setImageUrl('');
    setDescription('');
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setBrand(product.brand ?? '');
    setCategory(product.category);
    setSku(product.sku ?? '');
    setStock(String(product.stock_quantity));
    setMinStock(String(product.min_stock_level));
    setPrice(product.price_cents ? (product.price_cents / 100).toString() : '');
    setImageUrl(product.image_url ?? '');
    setDescription(product.description ?? '');
    setModalOpen(true);
  }

  function getFormState() {
    return { name, brand, category, sku, stock, minStock, price, imageUrl, description };
  }

  const handleSave = useCallback(() => {
    const stockQty = parseInt(stock, 10);
    const minStockQty = parseInt(minStock, 10);
    const priceEuros = price ? parseFloat(price.replace(',', '.')) : null;

    if (!name.trim()) {
      toast.error('Inserisci il nome del prodotto');
      return;
    }
    if (Number.isNaN(stockQty) || stockQty < 0) {
      toast.error('Inserisci una quantità valida');
      return;
    }
    if (Number.isNaN(minStockQty) || minStockQty < 0) {
      toast.error('Inserisci una soglia minima valida');
      return;
    }
    if (priceEuros != null && (Number.isNaN(priceEuros) || priceEuros < 0)) {
      toast.error('Inserisci un prezzo valido');
      return;
    }

    const isEditing = !!editing;
    const tempId = editing?.id ?? `temp-${Date.now()}`;
    const sortOrder = editing?.sort_order ?? items.length + 1;
    const optimistic = buildProductFromForm(getFormState(), tempId, sortOrder);
    const previousItems = items;

    setItems((prev) =>
      isEditing
        ? prev.map((p) => (p.id === editing.id ? optimistic : p))
        : [...prev, optimistic]
    );
    setModalOpen(false);
    setSaving(true);

    void saveAdminProduct({
      id: editing?.id,
      name,
      brand,
      category,
      sku,
      stockQuantity: stockQty,
      minStockLevel: minStockQty,
      priceEuros,
      imageUrl,
      description,
      isActive: true,
      sortOrder,
    }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }

      if (result.product) {
        setItems((prev) =>
          isEditing
            ? prev.map((p) => (p.id === editing.id ? result.product! : p))
            : prev.map((p) => (p.id === tempId ? result.product! : p))
        );
      }

      toast.success(isEditing ? 'Prodotto modificato' : 'Prodotto creato');
    });
  }, [brand, category, description, editing, imageUrl, items, minStock, name, price, sku, stock]);

  function handleDelete(product: Product) {
    const confirmed = window.confirm(`Eliminare "${product.name}" dall'inventario?`);
    if (!confirmed) return;

    const previousItems = items;
    setItems((prev) => prev.filter((p) => p.id !== product.id));
    setDeletingId(product.id);

    void deleteAdminProduct(product.id).then((result) => {
      setDeletingId(null);
      if (!result.ok) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }
      toast.success('Prodotto eliminato');
    });
  }

  function syncStock(productId: string) {
    const targetQty = pendingStock.current.get(productId);
    if (targetQty === undefined) return;
    pendingStock.current.delete(productId);
    setPendingStockCount(pendingStock.current.size);

    void setProductStock(productId, targetQty).then((result) => {
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      if (result.stockQuantity !== targetQty) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, stock_quantity: result.stockQuantity! } : p
          )
        );
      }
    });
  }

  function handleStockAdjust(product: Product, delta: number) {
    if (product.id.startsWith('temp-')) return;

    let nextQty = product.stock_quantity;
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== product.id) return p;
        nextQty = Math.max(0, p.stock_quantity + delta);
        pendingStock.current.set(p.id, nextQty);
        return { ...p, stock_quantity: nextQty };
      })
    );
    setPendingStockCount(pendingStock.current.size);

    const existing = stockTimers.current.get(product.id);
    if (existing) clearTimeout(existing);

    stockTimers.current.set(
      product.id,
      setTimeout(() => {
        stockTimers.current.delete(product.id);
        syncStock(product.id);
      }, STOCK_SYNC_DELAY_MS)
    );
  }

  const flushPendingStock = useCallback(() => {
    const productIds = Array.from(pendingStock.current.keys());
    stockTimers.current.forEach((timer) => clearTimeout(timer));
    stockTimers.current.clear();
    productIds.forEach((productId) => syncStock(productId));
    toast.success('Scorte aggiornate');
  }, []);

  const handleSaveAll = useCallback(() => {
    if (modalOpen) {
      handleSave();
      return;
    }
    flushPendingStock();
  }, [flushPendingStock, handleSave, modalOpen]);

  useAdminSaveRegistration(
    modalOpen || pendingStockCount > 0
      ? {
          isDirty: true,
          isSaving: saving,
          save: handleSaveAll,
        }
      : null
  );

  const activeProducts = items.filter((p) => p.is_active);
  const inactiveProducts = items.filter((p) => !p.is_active);

  return (
    <div>
      {lowStockProducts.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-300" />
          <div>
            <p className="text-sm font-medium text-orange-200">Scorte basse</p>
            <p className="mt-1 text-xs text-orange-200/70">
              {lowStockProducts.map((p) => `${p.name} (${p.stock_quantity})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-white/50">Gestisci profumi Mood e altri prodotti in negozio</p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuovo prodotto
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {activeProducts.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            rowBusy={deletingId === p.id}
            onEdit={() => openEdit(p)}
            onDelete={() => handleDelete(p)}
            onAdjustStock={handleStockAdjust}
          />
        ))}
        {activeProducts.length === 0 && (
          <p className="text-white/50">Nessun prodotto in inventario. Aggiungine uno nuovo.</p>
        )}
      </div>

      {inactiveProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
            Prodotti disattivati
          </h2>
          <div className="space-y-2 opacity-70">
            {inactiveProducts.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                rowBusy={deletingId === p.id}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
                onAdjustStock={handleStockAdjust}
                inactive
              />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-gold">
                {editing ? 'Modifica prodotto' : 'Nuovo prodotto'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="product-name">Nome *</Label>
                <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Mood Velvet" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-brand">Brand</Label>
                  <Input id="product-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Mood" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="product-category">Categoria *</Label>
                  <select
                    id="product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="mt-1 flex h-11 w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 text-sm text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-sku">SKU</Label>
                  <Input id="product-sku" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="MOOD-VELVET" className="mt-1 font-mono uppercase" />
                </div>
                <div>
                  <Label htmlFor="product-price">Prezzo (€)</Label>
                  <Input id="product-price" type="number" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-stock">Quantità *</Label>
                  <Input id="product-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="product-min-stock">Soglia minima *</Label>
                  <Input id="product-min-stock" type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="product-image">URL immagine</Label>
                <Input id="product-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/assets/..." className="mt-1" />
              </div>
              <div>
                <Label htmlFor="product-description">Descrizione</Label>
                <textarea
                  id="product-description"
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
                disabled={saving}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                  editing
                    ? 'border border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                    : 'bg-gold text-black hover:bg-gold-light'
                )}
              >
                <Pencil size={16} />
                {editing ? 'Salva modifiche' : 'Crea prodotto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  rowBusy,
  onEdit,
  onDelete,
  onAdjustStock,
  inactive = false,
}: {
  product: Product;
  rowBusy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdjustStock: (product: Product, delta: number) => void;
  inactive?: boolean;
}) {
  const isLowStock = product.is_active && product.stock_quantity <= product.min_stock_level;
  const isTemp = product.id.startsWith('temp-');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-gold/15 p-2 text-gold">
          <Package size={16} />
        </div>
        <div>
          <p className="font-medium">
            {product.name}
            {product.brand && <span className="ml-2 text-xs text-white/40">{product.brand}</span>}
            {inactive && <span className="ml-2 text-xs text-white/40">(disattivato)</span>}
            {isTemp && <span className="ml-2 text-xs text-gold/70">(salvataggio...)</span>}
          </p>
          <p className="text-xs text-white/40">
            {CATEGORY_LABELS[product.category]}
            {product.sku && ` · ${product.sku}`}
            {product.price_cents != null && ` · ${formatPrice(product.price_cents)}`}
          </p>
          {product.description && (
            <p className="mt-1 max-w-md text-xs text-white/50 line-clamp-1">{product.description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAdjustStock(product, -1)}
            disabled={isTemp || product.stock_quantity <= 0}
            className="rounded-lg border border-white/15 bg-[#1a1a1a] p-1.5 text-white/60 hover:text-white disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <span
            className={cn(
              'min-w-[2.5rem] text-center text-lg font-bold transition-transform duration-150',
              isLowStock ? 'text-orange-300' : 'text-gold'
            )}
          >
            {product.stock_quantity}
          </span>
          <button
            type="button"
            onClick={() => onAdjustStock(product, 1)}
            disabled={isTemp}
            className="rounded-lg border border-white/15 bg-[#1a1a1a] p-1.5 text-white/60 hover:text-white disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
        {isLowStock && (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-300">
            Scorte basse
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          disabled={rowBusy || isTemp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/25 disabled:opacity-50"
        >
          <Pencil size={14} />
          Modifica
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={rowBusy || isTemp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          <Trash2 size={14} />
          Elimina
        </button>
      </div>
    </div>
  );
}