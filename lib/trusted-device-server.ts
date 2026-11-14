// Lettura del cookie «dispositivo fidato» lato server (14/11/2026). Vedi lib/utils/trusted-device.ts.
import { cookies } from 'next/headers';
import { DEVICE_COOKIE, verifyDevice } from '@/lib/utils/trusted-device';

/** Chiave per firmare: la chiave di servizio Supabase (solo lato server). Vuota = funzione spenta. */
export function deviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/** true se questo browser è ricordato per questo utente. Non lancia mai errori. */
export async function isTrustedDevice(userId: string | undefined | null): Promise<boolean> {
  try {
    if (!userId) return false;
    const jar = await cookies();
    return verifyDevice(jar.get(DEVICE_COOKIE)?.value, userId, deviceKey());
  } catch {
    return false;
  }
}
