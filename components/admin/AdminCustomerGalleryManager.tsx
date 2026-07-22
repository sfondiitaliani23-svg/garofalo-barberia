'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Calendar, Mail, Phone, Image as ImageIcon, Upload, Link as LinkIcon, FileImage, AlertCircle, X } from 'lucide-react';
import type { Profile } from '@/types/database';
import { addCustomerPhoto, deleteCustomerPhoto } from '@/lib/actions/customer-gallery';
import { toast } from 'sonner';

interface AdminCustomerGalleryManagerProps {
  customer: Profile;
  initialPhotos: any[];
}

// Client-side image compression helper
function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossibile creare il contesto Canvas.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function AdminCustomerGalleryManager({ customer, initialPhotos }: AdminCustomerGalleryManagerProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  
  // Tabs: 'file' (allegati multipli) oppure 'url' (link singolo)
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');

  // URL Tab state
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  
  // File Tab state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCaptions, setFileCaptions] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Gestione aggiunta tramite URL singolo
  async function handleAddPhotoUrl(e: React.FormEvent) {
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

  // Gestione selezione file
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  }

  // Rimuovi file dalla coda
  function removeFileFromQueue(index: number) {
    const fileToRemove = selectedFiles[index];
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);

    // Pulisci eventuale didascalia associata
    const newCaptions = { ...fileCaptions };
    delete newCaptions[fileToRemove.name];
    setFileCaptions(newCaptions);
  }

  // Aggiorna didascalia specifica per un file
  function handleFileCaptionChange(fileName: string, value: string) {
    setFileCaptions({
      ...fileCaptions,
      [fileName]: value
    });
  }

  // Caricamento in batch dei file selezionati
  async function handleUploadFiles() {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    
    let uploadedCount = 0;
    const uploadedPhotos: any[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });
      
      try {
        // 1. Comprimi l'immagine ed ottieni la stringa Base64
        const compressedBase64 = await compressImage(file);
        
        // 2. Salva nel database
        const fileCaption = fileCaptions[file.name] || '';
        const newPhoto = await addCustomerPhoto(customer.id, compressedBase64, fileCaption.trim());
        uploadedPhotos.push(newPhoto);
        uploadedCount++;
      } catch (err: any) {
        console.error(`Errore nel caricamento del file ${file.name}:`, err);
        toast.error(`Errore nel caricamento di ${file.name}: ${err.message || 'Errore sconosciuto'}`);
      }
    }

    if (uploadedCount > 0) {
      setPhotos([...uploadedPhotos, ...photos]);
      toast.success(`${uploadedCount} foto caricate con successo nella galleria!`);
    }
    
    // Resetta lo stato di caricamento dei file
    setSelectedFiles([]);
    setFileCaptions({});
    setLoading(false);
    setUploadProgress(null);
  }

  // Eliminazione foto
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

      {/* Add New Photos Container */}
      <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-semibold text-gold text-base uppercase tracking-wider">Aggiungi Foto</h2>
          
          {/* Toggles per il tipo di caricamento */}
          <div className="flex rounded-lg bg-[#161616] p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'file'
                  ? 'bg-gold text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Upload size={14} />
              Allega File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'url'
                  ? 'bg-gold text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LinkIcon size={14} />
              Inserisci URL
            </button>
          </div>
        </div>

        {/* Tab 1: Caricamento File */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-gold/30 rounded-xl p-8 text-center bg-[#161616]/40 cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
              <div className="h-12 w-12 rounded-full bg-gold/10 text-gold flex items-center justify-center group-hover:scale-105 transition">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Trascina qui le immagini o clicca per sfogliare
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Puoi selezionare uno o più file immagine contemporaneamente
                </p>
              </div>
            </div>

            {/* List of Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
                    File in coda ({selectedFiles.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-red-500 hover:underline"
                    disabled={loading}
                  >
                    Rimuovi tutti
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto admin-modal-scroll rounded-lg border border-white/5 bg-[#161616]/60 p-2 divide-y divide-white/5">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between gap-4 px-2 first:pt-1 last:pb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileImage size={18} className="text-gold shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white/90 truncate max-w-[200px] sm:max-w-md">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-white/40 font-bold">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <input
                          type="text"
                          placeholder="Didascalia (Opzionale)"
                          value={fileCaptions[file.name] || ''}
                          onChange={e => handleFileCaptionChange(file.name, e.target.value)}
                          className="rounded border border-white/10 bg-[#222] px-2.5 py-1 text-xs text-white placeholder:text-white/20 focus:border-gold/30 focus:outline-none"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => removeFileFromQueue(idx)}
                          className="text-white/40 hover:text-red-500 transition"
                          disabled={loading}
                          aria-label="Rimuovi file dalla coda"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Batch Upload State / Button */}
                {uploadProgress && (
                  <div className="rounded-lg border border-gold/10 bg-gold/5 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gold uppercase tracking-wider">
                      <span>Caricamento immagini in corso...</span>
                      <span>{uploadProgress.current} di {uploadProgress.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#161616] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleUploadFiles}
                    disabled={loading || selectedFiles.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold hover:bg-gold-light px-5 py-2.5 text-sm font-bold text-black shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload size={16} />
                    {loading ? 'Caricamento...' : 'Carica file selezionati'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Inserimento URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleAddPhotoUrl} className="space-y-4">
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>

            {/* Image URL preview */}
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
        )}
      </div>

      {/* Gallery Grid */}
      <div className="space-y-4">
        <h2 className="font-semibold text-white text-base uppercase tracking-wider flex items-center gap-2">
          <ImageIcon size={18} className="text-gold" />
          Foto in Galleria ({photos.length})
        </h2>

        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
            Nessuna foto presente in questa galleria. Utilizza la sezione sopra per caricarne o allegarne una.
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
