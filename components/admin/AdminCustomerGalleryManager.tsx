'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Calendar, Mail, Phone, Image as ImageIcon } from 'lucide-react';
import type { Profile } from '@/types/database';
import { addCustomerPhoto, deleteCustomerPhoto } from '@/lib/actions/customer-gallery';
import { toast } from 'sonner';

interface AdminCustomerGalleryManagerProps {
  customer: Profile;
  initialPhotos: any[];
}

export function AdminCustomerGalleryManager({ customer, initialPhotos }: AdminCustomerGalleryManagerProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl.trim()) return;

    setLoading(true);
    try {
      const newPhoto = await addCustomerPhoto(customer.id, photoUrl.trim(), caption.trim());
      setPhotos([newPhoto, ...photos]);
      setPhotoUrl('');
      setCaption('');
      toast.success('Foto aggiunta con successo alla galleria!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Errore durante l\'inserimento della foto.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm('Sei sicuro di voler eliminare questa foto dalla galleria del cliente?')) {
      return;
    }

    try {
      await deleteCustomerPhoto(photoId, customer.id);
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Foto eliminata con successo.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Errore durante l\'eliminazione della foto.');
    }
  }

  return (
    <div className="space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/clienti"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#111] text-white/70 transition hover:bg-white/5 hover:text-white"
            aria-label="Torna alla lista clienti"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display text-2xl uppercase text-gold">Galleria Cliente</h1>
            <p className="mt-1 text-sm text-white/50">
              Gestisci le foto dei tagli di {customer.full_name || 'questo cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Client Summary Card */}
      <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-6 shadow-xl">
        <h2 className="font-semibold text-white text-base mb-4">Informazioni Cliente</h2>
        <div className="grid gap-4 sm:grid-cols-3 text-sm text-white/70">
          <div className="flex items-center gap-2.5">
            <Mail size={16} className="text-gold" />
            <span className="truncate">{customer.email || 'Nessuna email'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone size={16} className="text-gold" />
            <span>{customer.phone || 'Nessun telefono'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-gold" />
            <span>
              Registrato il:{' '}
              {new Date(customer.created_at).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Add New Photo Form */}
      <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-6 shadow-xl">
        <h2 className="font-semibold text-gold text-base mb-4 uppercase tracking-wider">Aggiungi Nuova Foto</h2>
        <form onSubmit={handleAddPhoto} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="photo_url" className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-1.5">
                URL Immagine
              </label>
              <input
                id="photo_url"
                type="url"
                required
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://esempio.com/foto.jpg"
                className="w-full rounded-lg border border-white/10 bg-[#161616] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
            <div>
              <label htmlFor="caption" className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-1.5">
                Didascalia (Opzionale)
              </label>
              <input
                id="caption"
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Es. Taglio sfumato medio con riga"
                className="w-full rounded-lg border border-white/10 bg-[#161616] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
          </div>

          {/* Image preview logic */}
          {photoUrl.trim() && (
            <div className="mt-4 p-3 rounded-lg border border-white/5 bg-[#161616] max-w-sm">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-bold">Anteprima Immagine:</p>
              <div className="relative aspect-square w-full rounded overflow-hidden bg-black/40">
                <img
                  src={photoUrl}
                  alt="Anteprima di caricamento"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593642532842-98d0fd5ebc1a?q=80&w=300';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !photoUrl.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gold hover:bg-gold-light px-5 py-2.5 text-sm font-bold text-black shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              {loading ? 'Salvataggio...' : 'Aggiungi alla galleria'}
            </button>
          </div>
        </form>
      </div>

      {/* Gallery Grid */}
      <div className="space-y-4">
        <h2 className="font-semibold text-white text-base uppercase tracking-wider flex items-center gap-2">
          <ImageIcon size={18} className="text-gold" />
          Foto in Galleria ({photos.length})
        </h2>

        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
            Nessuna foto presente in questa galleria. Utilizza il form sopra per caricarne una.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e] shadow-lg transition-all duration-300 hover:border-gold/30"
              >
                {/* Photo container */}
                <div className="relative aspect-square w-full overflow-hidden bg-black/20">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Foto taglio'}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  {/* Delete button (hover overlay) */}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-600/90 text-white shadow-md transition hover:bg-red-600 hover:scale-105"
                    title="Elimina foto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Details Footer */}
                <div className="p-4 space-y-1 bg-gradient-to-t from-black/80 to-[#0e0e0e]">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                    Caricata il:{' '}
                    {new Date(photo.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm font-medium text-white/80 line-clamp-2">
                    {photo.caption || <span className="text-white/30 italic">Nessuna didascalia</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
