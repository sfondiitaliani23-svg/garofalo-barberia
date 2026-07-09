const SESSION_KEY = 'garofalo_session_id';
const DEMOGRAPHICS_KEY = 'garofalo_demographics_done';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function hasCompletedDemographics(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DEMOGRAPHICS_KEY) === '1';
}

export function markDemographicsCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMOGRAPHICS_KEY, '1');
}