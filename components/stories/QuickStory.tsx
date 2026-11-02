'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { romeToday } from '@/lib/utils/stories';

/**
 * Stories veloci (02/11/2026): per admin, dipendente e tester. Al posto del pulsante dell'IA compare una fotocamera
 * (si passa dall'una all'altra con il pulsantino ⇄). Tocco → «Scatta una nuova foto» / «Allega una foto».
 * La foto viene tagliata in verticale 9:16 (1080x1920), si conferma la liberatoria e si pubblica per 24 ore.
 * La fotocamera è quella del telefono: il permesso si dà una volta sola, poi il telefono lo ricorda.
 */

export const FAB_MODE_KEY = 'gb-fab-mode';

export function CameraIcon({ size = 24 }: { size?: number }) {
  // Fotocamera in stile Instagram: quadrato arrotondato, obiettivo, flash.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Taglia la foto al centro in 9:16 e la rimpicciolisce a 1080x1920 (JPEG). Toglie anche i dati nascosti (GPS). */
async function toStory(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const W = 1080, H = 1920, target = W / H;
  let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0;
  if (sw / sh > target) { sw = Math.round(sh * target); sx = Math.round((bmp.width - sw) / 2); }
  else { sh = Math.round(sw / target); sy = Math.round((bmp.height - sh) / 2); }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, W, H);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.86));
  if (!blob) throw new Error('Non riesco a preparare la foto.');
  return blob;
}

export function QuickStory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [release, setRelease] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) return void toast.error('Scegli una foto.');
    try {
      const blob = await toStory(file);
      setRelease(false);
      setPreview({ blob, url: URL.createObjectURL(blob) });
      onClose();
    } catch {
      toast.error('Non riesco a leggere questa foto. Riprova.');
    }
  }

  async function publish() {
    if (!preview || busy) return;
    if (!release) return void toast.error('Conferma la liberatoria prima di pubblicare.');
    setBusy(true);
    try {
      const { createStoryUploadAction, saveStoryAction } = await import('@/lib/actions/stories');
      const up = await createStoryUploadAction({ mime: 'image/jpeg', size: preview.blob.size, width: 1080, height: 1920 });
      if (!up.ok) return void toast.error(up.error);
      const sb = createClient();
      if (!sb) return void toast.error('Database non configurato.');
      const { error } = await sb.storage.from('storie').uploadToSignedUrl(up.path, up.token, preview.blob, { contentType: 'image/jpeg' });
      if (error) return void toast.error('Caricamento non riuscito. Riprova.');
      const res = await saveStoryAction({ kind: 'foto', media_path: up.path, starts_on: romeToday(), has_release: true });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={onFile} />

      {open && (
        <div className="qs-menu" role="menu" aria-label="Nuova storia">
          <p className="qs-menu-title">Nuova storia</p>
          <button type="button" role="menuitem" className="qs-menu-item" onClick={() => camRef.current?.click()}>
            <CameraIcon size={20} />
            Scatta una nuova foto
          </button>
          <button type="button" role="menuitem" className="qs-menu-item" onClick={() => pickRef.current?.click()}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 3-2 6 4" />
            </svg>
            Allega una foto
          </button>
        </div>
      )}

      {preview && (
        <div className="qs-sheet" role="dialog" aria-modal="true" aria-label="Pubblica la storia">
          <div className="qs-sheet-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="Anteprima della storia" className="qs-preview" />
            <label className="qs-check">
              <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} />
              <span>Le persone nella foto hanno firmato la liberatoria (o non ci sono persone riconoscibili).</span>
            </label>
            <p className="qs-note">Resta online 24 ore, nel cerchio «Novità».</p>
            <div className="qs-actions">
              <button type="button" className="qs-btn qs-btn--ghost" onClick={() => setPreview(null)} disabled={busy}>Annulla</button>
              <button type="button" className="qs-btn" onClick={publish} disabled={busy || !release}>{busy ? 'Pubblico…' : 'Pubblica'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
