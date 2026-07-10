export const COOKIE_CONSENT_KEY = 'garofalo_cookie_consent';

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  preferences: boolean;
  decidedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.preferences !== 'boolean') {
      return null;
    }
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function hasCookieConsentDecision(): boolean {
  return getCookieConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics ?? false;
}

export function hasPreferencesConsent(): boolean {
  return getCookieConsent()?.preferences ?? false;
}

export function saveCookieConsent(analytics: boolean, preferences: boolean): void {
  if (typeof window === 'undefined') return;

  const consent: CookieConsent = {
    necessary: true,
    analytics,
    preferences,
    decidedAt: new Date().toISOString(),
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('garofalo:cookie-consent', { detail: consent }));
}