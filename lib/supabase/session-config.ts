/** Durata sessione cliente: 60 giorni (~2 mesi). */
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 60 * 24 * 60 * 60;

export const CUSTOMER_SESSION_UNTIL_COOKIE = 'garofalo_session_until';

export type SessionCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export function getCustomerSessionCookieOptions() {
  return {
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function getCustomerSessionExpiryDate(): Date {
  return new Date(Date.now() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000);
}

export function applyCustomerSessionCookieOptions(cookiesToSet: SessionCookie[]): SessionCookie[] {
  const defaults = getCustomerSessionCookieOptions();
  return cookiesToSet.map(({ name, value, options }) => {
    // Un cookie che Supabase sta cancellando (logout) deve restare cancellato: non gli diamo i 60 giorni.
    const removing = options?.maxAge === 0 || value === '';
    return {
      name,
      value,
      options: {
        ...options,
        ...defaults,
        maxAge: removing ? 0 : CUSTOMER_SESSION_MAX_AGE_SECONDS,
      },
    };
  });
}

export function isCustomerSessionExpired(sessionUntilValue?: string | null): boolean {
  if (!sessionUntilValue) return false;
  const expiresAt = new Date(sessionUntilValue);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() <= Date.now();
}