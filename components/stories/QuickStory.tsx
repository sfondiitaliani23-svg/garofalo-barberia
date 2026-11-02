'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { romeToday, isStoryRatio, MAX_VIDEO_BYTES } from '@/lib/utils/stories';

/**
 * Stories veloci (02/11/2026): per admin, dipendente e tester. Al posto del pulsante dell'IA compare una fotocamera
 * (si passa dall'una all'altra scorrendo il dito sul pulsante). Tocco → scatta una foto, registra un video,
 * allega una foto, allega un video. La foto viene tagliata in verticale 9:16 (1080x1920). Il video si tiene così
 * com'è se è già verticale, entro 15 secondi e 20 MB; altrimenti si taglia al centro in 9:16 e ai primi 15 secondi
 * (720x1280, nel browser). Si conferma la liberatoria e si pubblica per 24 ore.
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


const MAX_SECONDS = 15;

type Media = { blob: Blob; url: string; kind: 'foto' | 'video'; mime: string; width: number; height: number };

/** Legge durata e misure di un video. */
function videoInfo(url: string): Promise<{ w: number; h: number; d: number }> {
  return new Promise((ok, ko) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => ok({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
    v.onerror = () => ko(new Error('video'));
    v.src = url;
  });
}

/** Sceglie il formato che il browser sa registrare: prima MP4, poi WebM. */
function recorderType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

/** Taglia il video al centro in 9:16 (720x1280) e ai primi 15 secondi, con l'audio. Lo rifà nel browser, in tempo reale. */
async function toStoryVideo(srcUrl: string, onProgress: (p: number) => void): Promise<{ blob: Blob; mime: string }> {
  const type = recorderType();
  if (!type) throw new Error('Il telefono non sa preparare il video: girane uno verticale di massimo 15 secondi.');
  const v = document.createElement('video');
  v.src = srcUrl;
  v.playsInline = true;
  v.muted = false;
  await new Promise<void>((ok, ko) => { v.onloadeddata = () => ok(); v.onerror = () => ko(new Error('video')); });
  const W = 720, H = 1280, target = W / H;
  let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
  if (sw / sh > target) { sw = Math.round(sh * target); sx = Math.round((v.videoWidth - sw) / 2); }
  else { sh = Math.round(sw / target); sy = Math.round((v.videoHeight - sh) / 2); }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const stream = c.captureStream(30);
  // Audio: dal video al registratore, senza farlo sentire dalle casse.
  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(v);
    const dest = audioCtx.createMediaStreamDestination();
    src.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch { /* senza audio */ }
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3_500_000 });
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const done = new Promise<void>((ok) => { rec.onstop = () => ok(); });
  const end = Math.min(v.duration || MAX_SECONDS, MAX_SECONDS);
  let raf = 0;
  const draw = () => {
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
    onProgress(Math.min(1, v.currentTime / end));
    if (v.currentTime >= end || v.ended) { if (rec.state === 'recording') rec.stop(); v.pause(); return; }
    raf = requestAnimationFrame(draw);
  };
  rec.start(500);
  try { await audioCtx?.resume(); } catch { /* audio non disponibile */ }
  try { await v.play(); } catch { v.muted = true; await v.play(); }
  raf = requestAnimationFrame(draw);
  await done;
  cancelAnimationFrame(raf);
  stream.getTracks().forEach((t) => t.stop());
  audioCtx?.close().catch(() => {});
  const mime = type.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
  return { blob: new Blob(parts, { type: mime }), mime };
}

export function QuickStory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const pickVideoRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Media | null>(null);
  const [release, setRelease] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState<number | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (/^video\//.test(file.type)) return void onVideo(file);
    if (!/^image\//.test(file.type)) return void toast.error('Scegli una foto o un video.');
    try {
      const blob = await toStory(file);
      setRelease(false);
      setPreview({ blob, url: URL.createObjectURL(blob), kind: 'foto', mime: 'image/jpeg', width: 1080, height: 1920 });
      onClose();
    } catch {
      toast.error('Non riesco a leggere questa foto. Riprova.');
    }
  }

  async function onVideo(file: File) {
    onClose();
    const src = URL.createObjectURL(file);
    try {
      const info = await videoInfo(src);
      const okType = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
      // Già pronto: verticale, corto e leggero → si pubblica così com'è.
      if (okType && isStoryRatio(info.w, info.h) && info.d <= MAX_SECONDS + 0.5 && file.size <= MAX_VIDEO_BYTES) {
        setRelease(false);
        setPreview({ blob: file, url: src, kind: 'video', mime: file.type, width: info.w, height: info.h });
        return;
      }
      setPreparing(0);
      const out = await toStoryVideo(src, (p) => setPreparing(p));
      URL.revokeObjectURL(src);
      if (out.blob.size > MAX_VIDEO_BYTES) return void toast.error('Il video resta troppo pesante. Prova con uno più corto.');
      setRelease(false);
      setPreview({ blob: out.blob, url: URL.createObjectURL(out.blob), kind: 'video', mime: out.mime, width: 720, height: 1280 });
      if (info.d > MAX_SECONDS + 0.5) toast.message('Ho tenuto i primi 15 secondi del video.');
    } catch (err) {
      URL.revokeObjectURL(src);
      toast.error(err instanceof Error && err.message.length > 10 ? err.message : 'Non riesco a leggere questo video. Riprova.');
    } finally {
      setPreparing(null);
    }
  }

  async function publish() {
    if (!preview || busy) return;
    if (!release) return void toast.error('Conferma la liberatoria prima di pubblicare.');
    setBusy(true);
    try {
      const { createStoryUploadAction, saveStoryAction } = await import('@/lib/actions/stories');
      const up = await createStoryUploadAction({ mime: preview.mime, size: preview.blob.size, width: preview.width, height: preview.height });
      if (!up.ok) return void toast.error(up.error);
      const sb = createClient();
      if (!sb) return void toast.error('Database non configurato.');
      const { error } = await sb.storage.from('storie').uploadToSignedUrl(up.path, up.token, preview.blob, { contentType: preview.mime });
      if (error) return void toast.error('Caricamento non riuscito. Riprova.');
      const res = await saveStoryAction({ kind: preview.kind, media_path: up.path, starts_on: romeToday(), has_release: true });
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
      <input ref={recRef} type="file" accept="video/*" capture="environment" hidden onChange={onFile} />
      <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={onFile} />
      <input ref={pickVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" hidden onChange={onFile} />

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
          <button type="button" role="menuitem" className="qs-menu-item" onClick={() => recRef.current?.click()}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /><circle cx="7" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
            Registra un video
          </button>
          <button type="button" role="menuitem" className="qs-menu-item" onClick={() => pickVideoRef.current?.click()}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m10 9 5 3-5 3z" fill="currentColor" />
            </svg>
            Allega un video
          </button>
          <p className="qs-note">Video: verticali, massimo 15 secondi.</p>
        </div>
      )}

      {preparing !== null && (
        <div className="qs-sheet" role="status" aria-live="polite">
          <div className="qs-sheet-card">
            <p className="qs-note">Preparo il video in verticale… {Math.round(preparing * 100)}%</p>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(205,154,79,.2)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.round(preparing * 100)}%`, background: '#cd9a4f', transition: 'width .2s' }} />
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="qs-sheet" role="dialog" aria-modal="true" aria-label="Pubblica la storia">
          <div className="qs-sheet-card">
            {preview.kind === 'video' ? (
              <video src={preview.url} className="qs-preview" autoPlay muted loop playsInline controls aria-label="Anteprima del video" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview.url} alt="Anteprima della storia" className="qs-preview" />
            )}
            <label className="qs-check">
              <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} />
              <span>Le persone nella foto o nel video hanno firmato la liberatoria (o non ci sono persone riconoscibili).</span>
            </label>
            <p className="qs-note">Resta online 24 ore, nel cerchio «Novità».</p>
            <div className="qs-actions">
              <button type="button" className="qs-btn qs-btn--ghost" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} disabled={busy}>Annulla</button>
              <button type="button" className="qs-btn" onClick={publish} disabled={busy || !release}>{busy ? 'Pubblico…' : 'Pubblica'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
