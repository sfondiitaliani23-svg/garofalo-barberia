import { createHmac, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { setCustomerSessionExpiryCookie } from '@/lib/auth/customer-session';
import { normalizeItalianPhone } from '@/lib/utils/phone';

/** Chiave segreta lato server per firmare codici e sfide. Mai inviata al browser. */
function secret() {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET;
  if (!s) throw new Error('Chiave server mancante');
  return s;
}

export function hmac(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Valore firmato per un cookie: "dati.firma". */
export function sign(payload: object) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${hmac(data)}`;
}

export function unsign<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig || !safeEqual(sig, hmac(data))) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString()) as T;
  } catch {
    return null;
  }
}

export async function adminClient() {
  const admin = await createServiceClient();
  if (!admin) throw new Error('Database non configurato');
  return admin;
}

/** Cerca l'account con questo numero di telefono nel profilo. */
export async function findUserIdByPhone(phone: string): Promise<string | null> {
  const wanted = normalizeItalianPhone(phone);
  if (!wanted) return null;
  const admin = await adminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, phone, created_at')
    .not('phone', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000);
  const hit = (data ?? []).find((p) => p.phone && normalizeItalianPhone(p.phone) === wanted);
  return hit?.id ?? null;
}

export async function getAppMetadata(userId: string) {
  const admin = await adminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return { user: data.user, meta: (data.user.app_metadata ?? {}) as Record<string, unknown> };
}

/** Aggiorna solo le chiavi indicate di app_metadata (scrivibile solo dal server). */
export async function patchAppMetadata(userId: string, patch: Record<string, unknown>) {
  const current = await getAppMetadata(userId);
  if (!current) throw new Error('Utente non trovato');
  const admin = await adminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...current.meta, ...patch },
  });
  if (error) throw error;
}

/**
 * Apre una sessione vera per l'utente indicato, dopo che il server ha già
 * verificato il codice WhatsApp o la Passkey. Usa un link di accesso
 * monouso generato e consumato subito lato server: non passa dal browser.
 */
export async function openSessionFor(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await adminClient();
  const { data: u, error: ue } = await admin.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (ue || !email) return { ok: false, error: "Questo account non ha un'email: accedi con email e password." };

  const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (le || !tokenHash) return { ok: false, error: 'Impossibile aprire la sessione. Riprova.' };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };
  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (error) return { ok: false, error: 'Impossibile aprire la sessione. Riprova.' };

  await setCustomerSessionExpiryCookie();
  return { ok: true };
}

/** Dominio e origine attesi per le Passkey, presi dalla richiesta. */
export async function relyingParty() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost').split(',')[0].trim();
  const hostname = host.split(':')[0];
  const proto = (h.get('x-forwarded-proto') ?? (hostname === 'localhost' ? 'http' : 'https')).split(',')[0].trim();
  return { rpID: hostname, origin: `${proto}://${host}`, rpName: 'Barberia Garofalo' };
}
