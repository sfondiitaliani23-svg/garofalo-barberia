'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileFormProps {
  profile: any;
}

// Client-side avatar compression (optimized for 180x180 px to keep DB size light)
function compressAvatar(file: File, size = 180, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossibile creare il contesto Canvas.'));
          return;
        }

        // Ritaglio quadrato centrato dell'immagine originale
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gestione flusso video della fotocamera
  useEffect(() => {
    if (!showCamera) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch((err) => console.error(err));
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
        setShowCamera(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera]);

  // Calcola le iniziali per il segnaposto
  const getInitials = () => {
    if (!profile?.full_name) return '?';
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Seleziona un file immagine valido.');
        return;
      }
      try {
        const base64 = await compressAvatar(file);
        setAvatarUrl(base64);
        toast.success('Nuova immagine caricata temporaneamente. Clicca su "Salva modifiche" per confermare!');
      } catch (err: any) {
        console.error(err);
        toast.error('Errore durante la compressione dell\'immagine.');
      }
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.preventDefault();
    setAvatarUrl(''); // Una stringa vuota indica al backend di impostarlo a NULL
    toast.info('Immagine rimossa temporaneamente. Clicca su "Salva modifiche" per confermare.');
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (video) {
      try {
        const canvas = document.createElement('canvas');
        const size = 180;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Specchia il disegno sul canvas per far corrispondere all'anteprima selfie
          ctx.translate(size, 0);
          ctx.scale(-1, 1);

          // Calcola il ritaglio quadrato centrato dal video
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          const minSide = Math.min(videoWidth, videoHeight);
          const sx = (videoWidth - minSide) / 2;
          const sy = (videoHeight - minSide) / 2;

          ctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, size, size);

          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(base64);
          toast.success('Foto scattata! Clicca su "Salva modifiche" per confermare.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Errore durante lo scatto della foto.');
      }
      setShowCamera(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);

    // Se l'avatar è stato modificato, lo aggiungiamo a mano al formData
    if (avatarUrl !== profile?.avatar_url) {
      formData.set('avatar_url', avatarUrl ?? '');
    }

    startTransition(async () => {
      try {
        await updateProfile(formData);
      } catch (err: any) {
        toast.error('Errore durante il salvataggio delle modifiche.');
      }
    });
  };

  return (
    <>
      <form action={updateProfile} onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Sezione Avatar Uploader */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 border-b border-white/10 pb-6">
          <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-gold/30 hover:border-gold transition-all duration-300 shadow-lg shadow-black/45 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1c140c] to-[#0c0a06] flex items-center justify-center text-gold font-display text-2xl font-bold">
                {getInitials()}
              </div>
            )}
            {/* Overlay di modifica al passaggio del mouse */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-white transition-opacity duration-300 cursor-pointer"
              disabled={pending}
            >
              <Camera size={18} className="text-gold" />
              <span>SFOGLIA</span>
            </button>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2">
            <p className="text-sm font-semibold text-white">Immagine del profilo</p>
            <p className="text-xs text-white/40 max-w-xs text-center sm:text-left leading-relaxed">
              Scegli se scattare una foto al volo con la tua fotocamera o caricarne una dal tuo dispositivo.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-gold font-semibold hover:underline bg-transparent border-none cursor-pointer"
                disabled={pending}
              >
                Sfoglia galleria
              </button>
              <span className="text-white/20 text-xs">•</span>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="inline-flex items-center gap-1 text-xs text-gold font-semibold hover:underline bg-transparent border-none cursor-pointer"
                disabled={pending}
              >
                Scatta foto
              </button>
              {avatarUrl !== null && avatarUrl !== '' && (
                <>
                  <span className="text-white/20 text-xs">•</span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                    disabled={pending}
                  >
                    <Trash2 size={12} />
                    Rimuovi foto
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={pending}
            />
            {/* Campo nascosto che invierà l'avatar */}
            <input type="hidden" name="avatar_url" value={avatarUrl ?? profile?.avatar_url ?? ''} />
          </div>
        </div>

        {/* Campi Form standard */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome e cognome *</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name ?? ''}
              className="mt-1"
              required
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile?.phone ?? ''}
              className="mt-1"
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="hair_preferences">Preferenze di taglio (opzionale)</Label>
            <textarea
              id="hair_preferences"
              name="hair_preferences"
              defaultValue={profile?.hair_preferences ?? ''}
              rows={3}
              className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white focus:border-gold/50 focus:outline-none"
              placeholder="Es. sfumato alto, ciuffo lungo, riga a sinistra..."
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="personal_notes">Note personali (visibili solo a te)</Label>
            <textarea
              id="personal_notes"
              name="personal_notes"
              defaultValue={profile?.personal_notes ?? ''}
              rows={3}
              className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white focus:border-gold/50 focus:outline-none"
              placeholder="Aggiungi dettagli o note personali..."
              disabled={pending}
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="bg-gold text-black hover:bg-gold-light font-bold min-w-[140px]"
          >
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Salvataggio...
              </>
            ) : (
              'Salva modifiche'
            )}
          </Button>
        </div>
      </form>

      {/* Modal Fotocamera per scatto foto */}
      {showCamera && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 cursor-pointer"
          onClick={() => setShowCamera(false)}
        >
          <div
            className="w-full max-w-md bg-[#111] border border-white/15 rounded-xl overflow-hidden flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-display text-base uppercase text-gold font-bold">Scatta Foto</h3>
              <button
                type="button"
                onClick={() => setShowCamera(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-white/5 mb-4">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]" /* Specchiato per selfie */
                playsInline
                muted
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCamera(false)}
                className="flex-1 border border-white/10 text-white/70 hover:bg-white/5 py-2.5 rounded-full font-semibold text-xs transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="flex-1 bg-gold text-black hover:bg-gold-light py-2.5 rounded-full font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Scatta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
