import { cookies } from 'next/headers';
import {
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  CUSTOMER_SESSION_UNTIL_COOKIE,
  getCustomerSessionExpiryDate,
} from '@/lib/supabase/session-config';

export async function setCustomerSessionExpiryCookie() {
  const cookieStore = await cookies();
  const expiresAt = getCustomerSessionExpiryDate();

  cookieStore.set(CUSTOMER_SESSION_UNTIL_COOKIE, expiresAt.toISOString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearCustomerSessionExpiryCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_UNTIL_COOKIE);
}