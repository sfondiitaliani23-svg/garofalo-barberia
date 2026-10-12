import { storageGet, storageSet } from '@/lib/utils/safe-storage';

/** Errori tipici di una scheda aperta durante un nuovo deploy. */
export function isStaleDeployError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  const text = `${e?.name ?? ''} ${e?.message ?? ''}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Failed to find Server Action|importing a module script failed/i.test(text);
}

/** Ricarica la pagina al massimo una volta ogni 30 secondi. Torna true se ricarica. */
export function reloadOnce(): boolean {
  if (typeof window === 'undefined') return false;
  const last = Number(storageGet('gb_auto_reload', 'session') ?? 0);
  if (Date.now() - last < 30_000) return false;
  storageSet('gb_auto_reload', String(Date.now()), 'session');
  window.location.reload();
  return true;
}
