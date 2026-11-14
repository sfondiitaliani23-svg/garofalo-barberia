'use server';

// «Ricorda questo dispositivo per 30 giorni» (14/11/2026). Solo lettura e scrittura del cookie firmato: nessun invio.
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DEVICE_COOKIE, DEVICE_DAYS, signDevice } from '@/lib/utils/trusted-device';
import { deviceKey, isTrustedDevice } from '@/lib/trusted-device-server';

/** Dopo il codice o la passkey: ricorda questo browser per 30 giorni. Serve la sessione con il secondo passaggio (aal2). */
export async function ricordaDispositivoAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: 'Non disponibile.' };
    const { data: u } = await supabase.auth.getUser();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!u?.user || aal?.currentLevel !== 'aal2') return { ok: false, error: 'Prima inserisci il codice.' };
    const key = deviceKey();
    if (!key) return { ok: false, error: 'Non disponibile.' };
    const exp = Date.now() + DEVICE_DAYS * 864e5;
    const jar = await cookies();
    jar.set(DEVICE_COOKIE, signDevice(u.user.id, exp, key), {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: DEVICE_DAYS * 86400,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Non riesco a ricordare il dispositivo.' };
  }
}

/** Dopo la password: questo browser è già ricordato per l'utente collegato? */
export async function dispositivoFidatoAction(): Promise<{ ok: true; fidato: boolean }> {
  try {
    const supabase = await createClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: null };
    return { ok: true, fidato: await isTrustedDevice(data?.user?.id) };
  } catch {
    return { ok: true, fidato: false };
  }
}
