'use client';

/**
 * Stato condiviso per l'installazione dell'app (PWA).
 * Android/Chrome/Edge: il browser manda 'beforeinstallprompt' e noi apriamo la sua finestra.
 * iPhone/iPad (Safari): quella finestra non esiste, si mostrano i due passi da fare a mano.
 */
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
let started = false;

export function startInstallListener() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Evento già catturato dallo script in <head> prima che React fosse pronto.
  const early = (window as unknown as { __gbBIP?: BIPEvent }).__gbBIP;
  if (early) deferred = early;
  window.addEventListener('gb-bip', () => {
    const e = (window as unknown as { __gbBIP?: BIPEvent }).__gbBIP;
    if (e) {
      deferred = e;
      listeners.forEach((l) => l());
    }
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Browser dentro Instagram/Facebook/TikTok: non permettono di installare. */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|Line\//i.test(navigator.userAgent);
}

export function canPromptNative() {
  return !!deferred;
}

/** Apre la finestra di installazione del browser. Torna true se l'utente accetta. */
export async function promptNativeInstall() {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  try {
    const choice = await ev.userChoice;
    listeners.forEach((l) => l());
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
}
