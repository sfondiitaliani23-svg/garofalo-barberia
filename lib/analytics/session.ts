import { safeUUID, storageGet, storageSet } from '@/lib/utils/safe-storage';

const SESSION_KEY = 'garofalo_session_id';
const DEMOGRAPHICS_KEY = 'garofalo_demographics_done';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let id = storageGet(SESSION_KEY);
  if (!id) {
    id = safeUUID();
    storageSet(SESSION_KEY, id);
  }
  return id;
}

export function hasCompletedDemographics(): boolean {
  if (typeof window === 'undefined') return true;
  return storageGet(DEMOGRAPHICS_KEY) === '1';
}

export function markDemographicsCompleted(): void {
  if (typeof window === 'undefined') return;
  storageSet(DEMOGRAPHICS_KEY, '1');
}