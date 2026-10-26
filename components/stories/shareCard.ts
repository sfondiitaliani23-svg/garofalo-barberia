'use client';

import type { StorySlide } from '@/lib/utils/stories';

const W = 1080;
const H = 1920;
const GOLD = '#cd9a4f';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function displayFont(): string {
  const probe = document.createElement('span');
  probe.className = 'font-display';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || 'Georgia, serif';
  probe.remove();
  return family;
}

/** Riduce il testo finché entra nella larghezza. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, start: number, maxWidth: number, weight = '400') {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Immagine verticale 1080x1920 del Wrapped, nero e oro, per le storie di Instagram.
 * Contiene solo le voci del riassunto (niente telefono, email o importi).
 */
export async function buildWrappedCard(slides: StorySlide[], lang: 'it' | 'en'): Promise<Blob | null> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const display = displayFont();
  const sans = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  // Sfondo
  ctx.fillStyle = '#070707';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 1100);
  glow.addColorStop(0, 'rgba(205,154,79,0.28)');
  glow.addColorStop(1, 'rgba(205,154,79,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Cornice tratteggiata (stile Insegna)
  ctx.strokeStyle = 'rgba(205,154,79,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.setLineDash([]);

  const logo = await loadImage('/assets/sostituisci-immagini/icone/barberia_garofalo.png');
  if (logo) {
    const lw = 220;
    const lh = (logo.height / logo.width) * lw;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(logo, (W - lw) / 2, 110, lw, lh);
    ctx.globalCompositeOperation = 'source-over';
  }

  const intro = slides.find((s) => s.id === 'wrapped-intro');
  const year = intro?.bigNumber ?? String(new Date().getFullYear());
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  fit(ctx, lang === 'en' ? `MY ${year}` : `IL MIO ${year}`, display, 120, W - 200);
  ctx.fillText(lang === 'en' ? `MY ${year}` : `IL MIO ${year}`, W / 2, 470);
  ctx.fillStyle = '#e8e1d3';
  ctx.font = `500 40px ${sans}`;
  ctx.fillText(lang === 'en' ? 'at Barberia Garofalo' : 'da Barberia Garofalo', W / 2, 540);

  const rows = slides.filter((s) => s.id !== 'wrapped-intro' && s.id !== 'wrapped-share').slice(0, 5);
  let y = 680;
  for (const r of rows) {
    ctx.fillStyle = 'rgba(232,225,211,0.7)';
    ctx.font = `600 34px ${sans}`;
    ctx.fillText(r.title.toUpperCase(), W / 2, y);
    ctx.fillStyle = '#ffffff';
    fit(ctx, r.bigNumber, display, 96, W - 220);
    ctx.fillText(r.bigNumber, W / 2, y + 100);
    y += 215;
  }

  ctx.fillStyle = GOLD;
  ctx.font = `600 36px ${sans}`;
  ctx.fillText('barberiagarofalo.it', W / 2, H - 120);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Condivide (telefono) o scarica (computer) l'immagine. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
