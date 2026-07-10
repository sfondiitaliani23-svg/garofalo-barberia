'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Megaphone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSaveRegistration } from '@/components/admin/AdminSaveContext';
import {
  saveAdminSiteContent,
  toggleSiteContentActive,
  deleteAdminSiteContent,
} from '@/lib/actions/admin';
import { cn } from '@/lib/utils';
import type { SiteContent } from '@/types/database';

const PRESETS = [
  {
    key: 'closure_banner',
    title: 'Chiusura',
    body: 'La barberia è chiusa la domenica e il lunedì.',
    label: 'Banner chiusura',
  },
  {
    key: 'announcement',
    title: 'Annuncio',
    body: 'Scrivi qui il messaggio da mostrare ai visitatori del sito.',
    label: 'Annuncio generale',
  },
] as const;

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

function contentStatus(item: SiteContent) {
  if (!item.is_active) return { label: 'Disattivo', className: 'text-white/40 bg-white/5' };

  const now = Date.now();
  if (item.starts_at && new Date(item.starts_at).getTime() > now) {
    return { label: 'Programmato', className: 'text-blue-300 bg-blue-500/15' };
  }
  if (item.ends_at && new Date(item.ends_at).getTime() < now) {
    return { label: 'Scaduto', className: 'text-orange-300 bg-orange-500/15' };
  }
  return { label: 'Attivo', className: 'text-emerald-300 bg-emerald-500/15' };
}

interface AdminContentManagerProps {
  contents: SiteContent[];
}

export function AdminContentManager({ contents }: AdminContentManagerProps) {
  const [items, setItems] = useState(contents);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteContent | null>(null);
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(contents);
  }, [contents]);

  function openCreate(preset?: (typeof PRESETS)[number]) {
    setEditing(null);
    setKey(preset?.key ?? '');
    setTitle(preset?.title ?? '');
    setBody(preset?.body ?? '');
    setIsActive(false);
    setStartsAt('');
    setEndsAt('');
    setModalOpen(true);
  }

  function openEdit(item: SiteContent) {
    setEditing(item);
    setKey(item.key);
    setTitle(item.title ?? '');
    setBody(item.body ?? '');
    setIsActive(item.is_active);
    setStartsAt(toDatetimeLocal(item.starts_at));
    setEndsAt(toDatetimeLocal(item.ends_at));
    setModalOpen(true);
  }

  const handleSave = useCallback(() => {
    const previousItems = items;
    const isEditing = !!editing;
    const tempId = editing?.id ?? `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: SiteContent = {
      id: tempId,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      title: title.trim(),
      body: body.trim(),
      is_active: isActive,
      starts_at: fromDatetimeLocal(startsAt),
      ends_at: fromDatetimeLocal(endsAt),
      updated_at: now,
    };

    setItems((prev) =>
      isEditing
        ? prev.map((item) => (item.id === editing.id ? optimistic : item))
        : [...prev, optimistic]
    );
    setModalOpen(false);
    setSaving(true);

    void saveAdminSiteContent({
      id: editing?.id,
      key,
      title,
      body,
      isActive,
      startsAt: fromDatetimeLocal(startsAt),
      endsAt: fromDatetimeLocal(endsAt),
    }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }

      if (result.content) {
        setItems((prev) =>
          isEditing
            ? prev.map((item) => (item.id === editing.id ? result.content! : item))
            : prev.map((item) => (item.id === tempId ? result.content! : item))
        );
      }

      toast.success(isEditing ? 'Contenuto aggiornato' : 'Contenuto creato');
    });
  }, [body, editing, endsAt, isActive, items, key, startsAt, title]);

  useAdminSaveRegistration(
    modalOpen ? { isDirty: true, isSaving: saving, save: handleSave } : null
  );

  function handleToggle(item: SiteContent) {
    const nextActive = !item.is_active;
    const previousItems = items;

    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, is_active: nextActive } : entry))
    );

    void toggleSiteContentActive(item.id, nextActive).then((result) => {
      if (!result.ok) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }
      if (result.content) {
        setItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? result.content! : entry))
        );
      }
      toast.success(nextActive ? 'Banner attivato' : 'Banner disattivato');
    });
  }

  function handleDelete(item: SiteContent) {
    const confirmed = window.confirm(`Eliminare "${item.title ?? item.key}"?`);
    if (!confirmed) return;

    const previousItems = items;
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setDeletingId(item.id);

    void deleteAdminSiteContent(item.id).then((result) => {
      setDeletingId(null);
      if (!result.ok) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }
      toast.success('Contenuto eliminato');
    });
  }

  const existingKeys = new Set(items.map((item) => item.key));
  const availablePresets = PRESETS.filter((preset) => !existingKeys.has(preset.key));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-white/50">
          Gestisci banner e annunci visibili sul sito pubblico
        </p>
        <Button onClick={() => openCreate()}>
          <Plus size={16} />
          Nuovo contenuto
        </Button>
      </div>

      {availablePresets.length > 0 && items.length === 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-[#111] p-4">
          <p className="text-sm text-white/60">Parti da un modello rapido:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availablePresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => openCreate(preset)}
                className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {items.map((item) => {
          const status = contentStatus(item);
          const isTemp = item.id.startsWith('temp-');

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-gold/15 p-2 text-gold">
                  <Megaphone size={16} />
                </div>
                <div>
                  <p className="font-medium">
                    {item.title || 'Senza titolo'}
                    <span className="ml-2 font-mono text-xs text-white/35">{item.key}</span>
                    {isTemp && <span className="ml-2 text-xs text-gold/70">(salvataggio...)</span>}
                  </p>
                  <p className="mt-1 max-w-xl text-sm text-white/55 line-clamp-2">{item.body}</p>
                  {(item.starts_at || item.ends_at) && (
                    <p className="mt-1 text-xs text-white/35">
                      {item.starts_at && `Da ${new Date(item.starts_at).toLocaleString('it-IT')}`}
                      {item.starts_at && item.ends_at && ' · '}
                      {item.ends_at && `Fino ${new Date(item.ends_at).toLocaleString('it-IT')}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', status.className)}>
                  {status.label}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  disabled={isTemp || deletingId === item.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                    item.is_active
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      : 'border-white/15 bg-white/5 text-white/60 hover:text-white'
                  )}
                >
                  {item.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                  {item.is_active ? 'Disattiva' : 'Attiva'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  disabled={isTemp || deletingId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/25 disabled:opacity-50"
                >
                  <Pencil size={14} />
                  Modifica
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={isTemp || deletingId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Elimina
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-white/50">
            Nessun contenuto ancora. Crea un banner chiusura o un annuncio per mostrarlo sul sito.
          </p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#111] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl uppercase text-gold">
                {editing ? 'Modifica contenuto' : 'Nuovo contenuto'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="content-key">Chiave *</Label>
                <Input
                  id="content-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="closure_banner"
                  disabled={!!editing}
                  className="mt-1 font-mono lowercase"
                />
                <p className="mt-1 text-xs text-white/40">Identificativo univoco, es. closure_banner</p>
              </div>
              <div>
                <Label htmlFor="content-title">Titolo *</Label>
                <Input
                  id="content-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Chiusura estiva"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="content-body">Messaggio *</Label>
                <textarea
                  id="content-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Testo mostrato nel banner del sito"
                  className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="content-starts">Visibile da</Label>
                  <Input
                    id="content-starts"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="content-ends">Visibile fino</Label>
                  <Input
                    id="content-ends"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-gold"
                />
                <span className="text-sm text-white/80">Mostra subito sul sito</span>
              </label>
            </div>

            <div className="mt-6 flex gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
              >
                <Pencil size={16} />
                {editing ? 'Salva modifiche' : 'Crea contenuto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}