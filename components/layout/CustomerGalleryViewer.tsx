'use client';

import { useState } from 'react';
import { X, Calendar, MessageSquare, Maximize2, Download } from 'lucide-react';

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

interface CustomerGalleryViewerProps {
  photos: Photo[];
}

export function CustomerGalleryViewer({ photos }: CustomerGalleryViewerProps) {
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  const handleDownload = async (e: React.MouseEvent, photoUrl: string, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taglio-barberia-garofalo-${id.slice(0, 8)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(photoUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {photos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0e0e0e] p-12 text-center text-white/50">
          <p className="font-medium">Nessuna foto ancora presente nella tua galleria.</p>
          <p className="mt-1 text-sm text-white/30">L'amministratore caricherà qui le foto dei tuoi tagli migliori!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-gold/30"
            >
              {/* Photo Container */}
              <div className="relative aspect-square w-full overflow-hidden bg-black/20">
                <img
                  src={photo.photo_url}
                  alt={photo.caption || 'Foto del mio taglio'}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Hover overlay with icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-gold/90 text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Maximize2 size={16} />
                  </div>
                </div>
              </div>

              {/* Details Footer */}
              <div className="p-4 space-y-2 bg-[#0a0a0a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-gold font-bold uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>
                      {new Date(photo.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, photo.photo_url, photo.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold border border-gold/30 transition hover:bg-gold/25"
                    title="Scarica foto sul tuo dispositivo"
                  >
                    <Download size={12} />
                    <span>Scarica</span>
                  </button>
                </div>
                {photo.caption ? (
                  <p className="text-sm font-medium text-white/80 line-clamp-2">
                    {photo.caption}
                  </p>
                ) : (
                  <p className="text-xs italic text-white/30">Senza didascalia</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 p-4 transition-all duration-300"
          onClick={() => setActivePhoto(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setActivePhoto(null)}
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Chiudi ingrandimento"
          >
            <X size={20} />
          </button>

          {/* Lightbox Content Container */}
          <div
            className="relative flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={activePhoto.photo_url}
                alt={activePhoto.caption || 'Ingrandimento foto taglio'}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>

            {/* Metadata Footer */}
            <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gold font-bold uppercase tracking-wider">
                  <Calendar size={14} />
                  <span>
                    Caricata il:{' '}
                    {new Date(activePhoto.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {activePhoto.caption && (
                  <div className="flex items-start gap-2.5 pt-1">
                    <MessageSquare size={16} className="text-white/40 mt-0.5 shrink-0" />
                    <p className="text-sm text-white/90 leading-relaxed">{activePhoto.caption}</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => handleDownload(e, activePhoto.photo_url, activePhoto.id)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold text-black transition hover:bg-gold-light shrink-0 shadow-md shadow-gold/20"
              >
                <Download size={15} />
                <span>Scarica foto originale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
