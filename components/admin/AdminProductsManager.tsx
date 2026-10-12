'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Package, Minus, AlertTriangle, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import {
  saveAdminProduct,
  deleteAdminProduct,
  setProductsStockBatch,
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
  const [items, setItems] = useState(products);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('perfume');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('2');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [stockRevision, setStockRevision] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moves, setMoves] = useState<{ productId: string; delta: number; at: Date }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      toast.error("L'immagine selezionata supera il limite di 12MB");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
        toast.success('Foto caricata con successo dalla galleria!');
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast.error('Errore nella lettura dell’immagine');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const originalStock = useRef<Map<string, number>>(
    new Map(products.map((product) => [product.id, product.stock_quantity]))
  );
  const hasLocalEdits = useRef(false);

  const stockChanges = useMemo(
    () =>
      items
        .filter((product) => {
          if (product.id.startsWith('temp-')) return false;
          if (!originalStock.current.has(product.id)) return false;
          return product.stock_quantity !== originalStock.current.get(product.id);
        })
        .map((product) => ({
          productId: product.id,
          quantity: product.stock_quantity,
        })),
    [items, stockRevision]
  );

  useEffect(() => {
    if (hasLocalEdits.current) return;
    setItems(products);
    originalStock.current = new Map(products.map((product) => [product.id, product.stock_quantity]));
  }, [products]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  const outOfStockProducts = items.filter(
    (p) => p.is_active && p.stock_quantity === 0
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

    hasLocalEdits.current = true;
    setItems((prev) =>
      isEditing
        ? prev.map((p) => (p.id === editing.id ? optimistic : p))
        : [...prev, optimistic]
    );
    setModalOpen(false);

    startTransition(async () => {
      const result = await saveAdminProduct({
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
      });

      if (!result.ok) {
        hasLocalEdits.current = true;
        setItems(previousItems);
        toast.error(result.error);
        return;
      }

      if (result.product) {
        originalStock.current.set(result.product.id, result.product.stock_quantity);
        setItems((prev) =>
          isEditing
            ? prev.map((p) => (p.id === editing.id ? result.product! : p))
            : prev.map((p) => (p.id === tempId ? result.product! : p))
        );
      }

      hasLocalEdits.current = stockChanges.length > 0;
      toast.success(isEditing ? 'Prodotto modificato' : 'Prodotto creato');
    });
  }, [brand, category, description, editing, imageUrl, items, minStock, name, price, sku, startTransition, stock, stockChanges.length]);

  function handleDelete(product: Product) {
    const confirmed = window.confirm(`Eliminare "${product.name}" dall'inventario?`);
    if (!confirmed) return;

    const previousItems = items;
    hasLocalEdits.current = true;
    setItems((prev) => prev.filter((p) => p.id !== product.id));
    setDeletingId(product.id);

    startTransition(async () => {
      const result = await deleteAdminProduct(product.id);
      setDeletingId(null);
      if (!result.ok) {
        hasLocalEdits.current = true;
        setItems(previousItems);
        toast.error(result.error);
        return;
      }

      originalStock.current.delete(product.id);
      hasLocalEdits.current = stockChanges.length > 0;
      toast.success('Prodotto eliminato');
    });
  }

  const handleStockAdjust = useCallback((productId: string, delta: number) => {
    if (productId.startsWith('temp-')) return;

    hasLocalEdits.current = true;
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, stock_quantity: Math.max(0, p.stock_quantity + delta) };
      })
    );
    setStockRevision((value) => value + 1);
  }, []);

  const flushPendingStock = useCallback(() => {
    if (stockChanges.length === 0) return;

    const previousItems = items;
    const previousOriginal = new Map(originalStock.current);
    const entries = stockChanges;

    startTransition(async () => {
      const result = await setProductsStockBatch(entries);

      if (!result.ok) {
        hasLocalEdits.current = true;
        setItems(previousItems);
        originalStock.current = previousOriginal;
        setStockRevision((value) => value + 1);
        toast.error(result.error ?? 'Errore durante il salvataggio delle scorte');
        return;
      }

      for (const { productId, stockQuantity } of result.results) {
        originalStock.current.set(productId, stockQuantity);
      }

      setItems((prev) =>
        prev.map((product) => {
          const saved = result.results.find((entry) => entry.productId === product.id);
          return saved ? { ...product, stock_quantity: saved.stockQuantity } : product;
        })
      );

      hasLocalEdits.current = false;
      setStockRevision((value) => value + 1);
      toast.success('Scorte aggiornate');
    });
  }, [items, startTransition, stockChanges]);

  const handleSaveAll = useCallback(() => {
    if (modalOpen) {
      handleSave();
      return;
    }
    flushPendingStock();
  }, [flushPendingStock, handleSave, modalOpen]);

  useAdminSaveRegistration(
    modalOpen || stockChanges.length > 0
      ? {
          isDirty: true,
          isSaving: pending,
          save: handleSaveAll,
        }
      : null
  );

  const activeProducts = items.filter((p) => p.is_active);
  const inactiveProducts = items.filter((p) => !p.is_active);
  const selected = items.find((p) => p.id === selectedId) ?? activeProducts[0] ?? items[0] ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Inventario Prodotti
          </h1>
          <p className="mt-1 text-sm text-white/50">Profumi Mood e prodotti in negozio. Le scorte si salvano con il pulsante Salva.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuovo prodotto
        </Button>
      </div>

      {outOfStockProducts.length > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-300" />
          <div>
            <p className="text-sm font-medium text-orange-200">Scorte esaurite</p>
            <p className="mt-1 text-xs text-orange-200/70">{outOfStockProducts.map((p) => p.name).join(' · ')}</p>
          </div>
        </div>
      )}

      {activeProducts.length === 0 && (
        <p className="mt-6 text-white/50">Nessun prodotto in inventario. Aggiungine uno nuovo.</p>
      )}

      {selected && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
          {/* Elenco prodotti */}
          <nav className="space-y-2" aria-label="Prodotti">
            {activeProducts.map((p) => {
              const st = stockState(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-current={selected.id === p.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition',
                    selected.id === p.id ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-[#0e0e0e] hover:border-white/25'
                  )}
                >
                  <ProductThumb product={p} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                    <span className="text-[11px] text-white/45">Stock: {p.stock_quantity}</span>
                  </span>
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', st.dot)} title={st.label} aria-label={st.label} />
                </button>
              );
            })}
          </nav>

          {/* Dettaglio esteso */}
          <ProductDetail
            product={selected}
            busy={deletingId === selected.id}
            onEdit={() => openEdit(selected)}
            onDelete={() => handleDelete(selected)}
            onAdjustStock={(id, d) => {
              handleStockAdjust(id, d);
              setMoves((prev) => [{ productId: id, delta: d, at: new Date() }, ...prev].slice(0, 50));
            }}
          />

          {/* Movimenti e riepilogo */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
              <p className="text-sm font-semibold text-white">Movimenti di questa sessione</p>
              <p className="mt-0.5 text-[11px] text-white/40">Si salvano con il pulsante Salva.</p>
              <ul className="mt-3 space-y-2">
                {moves.filter((m) => m.productId === selected.id).length === 0 ? (
                  <li className="text-xs text-white/40">Nessun movimento. Usa + e − per caricare o scaricare.</li>
                ) : (
                  moves
                    .filter((m) => m.productId === selected.id)
                    .slice(0, 8)
                    .map((m, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white/55">
                          {m.at.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={cn('font-bold tabular-nums', m.delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {m.delta > 0 ? `+${m.delta}` : m.delta}
                        </span>
                      </li>
                    ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
              <p className="text-sm font-semibold text-white">Riepilogo inventario</p>
              <ul className="mt-3 space-y-2 text-xs">
                {(['ok', 'low', 'out'] as const).map((k) => {
                  const meta = STOCK_META[k];
                  const n = activeProducts.filter((p) => stockState(p).key === k).length;
                  return (
                    <li key={k} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-white/65">
                        <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
                        {meta.label}
                      </span>
                      <span className="font-semibold text-white tabular-nums">{n}</span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-white/65">Pezzi totali in negozio</span>
                  <span className="font-semibold text-gold tabular-nums">
                    {activeProducts.reduce((sum, p) => sum + p.stock_quantity, 0)}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {inactiveProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
            Prodotti disattivati
          </h2>
          <div className="space-y-2 opacity-70">
            {inactiveProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0e0e0e] px-3 py-2">
                <span className="flex items-center gap-3">
                  <ProductThumb product={p} size="sm" />
                  <span className="text-sm text-white/70">{p.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(p)} className="rounded-md p-2 text-white/55 hover:text-gold" aria-label={`Modifica ${p.name}`}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => handleDelete(p)} disabled={deletingId === p.id} className="rounded-md p-2 text-red-400/80 hover:text-red-400" aria-label={`Elimina ${p.name}`}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto admin-modal-scroll rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl"
          >
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
                <Label htmlFor="product-image">URL Immagine / Foto Prodotto</Label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="mt-1.5 flex items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    title="Clicca per scegliere un'immagine dalla galleria del tuo dispositivo"
                    className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gold/50 bg-black/60 transition-all hover:border-gold hover:scale-105 flex items-center justify-center shadow-lg"
                  >
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="Anteprima" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 text-white text-[10px] font-semibold text-center p-1">
                          <Camera size={16} className="text-gold mb-0.5" />
                          Cambia
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/50 group-hover:text-gold transition-colors text-center p-1">
                        <Upload size={18} className="text-gold mb-0.5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gold">Carica</span>
                      </div>
                    )}
                  </div>

                  <Input
                    id="product-image"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Es. /assets/sostituisci-immagini/homepage/4-1.jpg"
                    className="flex-1"
                  />
                </div>
                {/* Selettore rapido foto ufficiali Mood */}
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Foto rapide ufficiali Mood:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setImageUrl('/assets/sostituisci-immagini/homepage/4-1.jpg')}
                      className="rounded border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/25"
                    >
                      📸 Mood Velvet
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/assets/sostituisci-immagini/homepage/4-2.jpg')}
                      className="rounded border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/25"
                    >
                      📸 Mood Fancy
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/assets/sostituisci-immagini/homepage/4-3.jpg')}
                      className="rounded border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/25"
                    >
                      📸 Mood Imperious
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/assets/sostituisci-immagini/homepage/4-4.jpg')}
                      className="rounded border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/25"
                    >
                      📸 Mood Aroma
                    </button>
                  </div>
                </div>
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
                disabled={pending}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                  editing
                    ? 'border border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                    : 'bg-gold text-black hover:bg-gold-light'
                )}
              >
                <Pencil size={16} />
                {pending ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea prodotto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type StockKey = 'ok' | 'low' | 'out';
const STOCK_META: Record<StockKey, { label: string; dot: string; badge: string }> = {
  ok: { label: 'Disponibile', dot: 'bg-emerald-400', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  low: { label: 'Scorte basse', dot: 'bg-amber-400', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  out: { label: 'Esaurito', dot: 'bg-red-400', badge: 'border-red-500/30 bg-red-500/10 text-red-300' },
};

/** Stato scorte: esaurito a 0, basso fino alla soglia minima del prodotto. */
function stockState(p: Product) {
  const key: StockKey = p.stock_quantity <= 0 ? 'out' : p.stock_quantity <= (p.min_stock_level ?? 0) ? 'low' : 'ok';
  return { key, ...STOCK_META[key] };
}

function ProductThumb({ product, size }: { product: Product; size: 'sm' | 'lg' }) {
  const cls = size === 'sm' ? 'h-10 w-10 rounded-md' : 'h-full w-full rounded-lg';
  return product.image_url ? (
    <span className={cn('relative block shrink-0 overflow-hidden border border-gold/25 bg-black', cls)}>
      <img src={product.image_url} alt={size === 'lg' ? product.name : ''} className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className={cn('flex shrink-0 items-center justify-center bg-gold/10 text-gold', cls)}>
      <Package size={size === 'sm' ? 16 : 40} aria-hidden />
    </span>
  );
}

function ProductDetail({
  product,
  busy,
  onEdit,
  onDelete,
  onAdjustStock,
}: {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdjustStock: (productId: string, delta: number) => void;
}) {
  const st = stockState(product);
  const isTemp = product.id.startsWith('temp-');
  const rows: [string, React.ReactNode][] = [
    ['Categoria', CATEGORY_LABELS[product.category]],
    ['Brand', product.brand || '—'],
    ['Codice', product.sku || '—'],
    ['Soglia scorte basse', product.min_stock_level ?? 0],
    ['Prezzo di vendita', product.price_cents != null ? formatPrice(product.price_cents) : '—'],
  ];
  return (
    <section className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-label={`Dettaglio ${product.name}`}>
      <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="aspect-square">
          <ProductThumb product={product} size="lg" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {product.name}
            </h2>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', st.badge)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />
              {st.label}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-white/80">Dettagli prodotto</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-white/45">{k}</dt>
                <dd className="text-white/85">{v}</dd>
              </div>
            ))}
            <dt className="self-center text-white/45">Stock attuale</dt>
            <dd className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAdjustStock(product.id, -1)}
                disabled={isTemp || product.stock_quantity <= 0}
                className="rounded-md border border-white/15 bg-[#1a1a1a] p-1.5 text-white/65 hover:text-white disabled:opacity-40"
                aria-label="Scarica un pezzo"
              >
                <Minus size={14} />
              </button>
              <span className={cn('min-w-[2.5rem] text-center text-lg font-bold tabular-nums', st.key === 'ok' ? 'text-gold' : st.key === 'low' ? 'text-amber-300' : 'text-red-300')}>
                {product.stock_quantity}
              </span>
              <button
                type="button"
                onClick={() => onAdjustStock(product.id, 1)}
                disabled={isTemp}
                className="rounded-md border border-white/15 bg-[#1a1a1a] p-1.5 text-white/65 hover:text-white disabled:opacity-40"
                aria-label="Carica un pezzo"
              >
                <Plus size={14} />
              </button>
            </dd>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy || isTemp}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/60 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black disabled:opacity-50"
            >
              <Pencil size={14} />
              Modifica prodotto
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy || isTemp}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Elimina
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-white/5 pt-4">
        <p className="text-sm font-semibold text-white/80">Descrizione</p>
        <p className="mt-1 text-sm leading-relaxed text-white/55">{product.description || 'Nessuna descrizione.'}</p>
      </div>
    </section>
  );
}
