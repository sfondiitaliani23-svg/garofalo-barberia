/**
 * Accesso sicuro a localStorage/sessionStorage.
 * Alcuni browser (cookie bloccati, navigazione privata, app come Instagram)
 * lanciano un errore anche solo leggendo window.localStorage: qui non
 * blocca mai il sito, al massimo il dato non viene ricordato.
 */
type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageGet(key: string, kind: Kind = 'local'): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string, kind: Kind = 'local'): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    /* memoria non disponibile: ignora */
  }
}

export function storageRemove(key: string, kind: Kind = 'local'): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* memoria non disponibile: ignora */
  }
}

/** UUID anche sui browser vecchi senza crypto.randomUUID. */
export function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* continua col fallback */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
