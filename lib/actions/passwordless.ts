'use server';

import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { renderEmailTemplate } from '@/lib/utils/email-templates';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { sendCustomerWhatsAppReminder } from '@/lib/utils/reminders';
import {
  findUserIdByPhone,
  getAppMetadata,
  hmac,
  openSessionFor,
  patchAppMetadata,
  relyingParty,
  safeEqual,
  sign,
  unsign,
} from '@/lib/auth/passwordless';

type Result = { ok: true; message?: string } | { ok: false; error: string };

/* ────────────────────────────── WhatsApp OTP ────────────────────────────── */

const OTP_TTL_MS = 5 * 60_000;
const OTP_RESEND_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;

interface StoredOtp {
  h: string; // hash del codice
  exp: number; // scadenza
  att: number; // tentativi falliti
  sent: number; // ultimo invio
}

const GENERIC_SENT =
  'Se il numero è collegato a un account, riceverai un codice su WhatsApp o, se WhatsApp non è disponibile, via email.';

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Piano B gratuito: stesso codice via email all'indirizzo dell'account. */
async function sendCodeByEmail(email: string | undefined, code: string) {
  if (!email || !resendClient) return false;
  const payload = buildTransactionalEmail({
    to: email,
    subject: `Il tuo codice di accesso: ${code}`,
    html: renderEmailTemplate({
      preheader: `Codice di accesso ${code}, valido 5 minuti`,
      badge: 'Accesso',
      eyebrow: 'Area cliente',
      title: 'Il tuo codice di accesso',
      intro: 'Usa questo codice per entrare nella tua area cliente. Scade tra 5 minuti. Se non hai chiesto tu il codice, ignora questa email.',
      detailRows: [{ label: 'Codice', value: code, highlight: true }],
    }),
    text: `Il tuo codice di accesso a Garofalo Barberia è ${code}. Scade tra 5 minuti.`,
  });
  if (!payload) return false;
  try {
    const { error } = await resendClient.emails.send(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function requestWhatsAppCode(phone: string): Promise<Result> {
  try {
    const userId = await findUserIdByPhone(phone ?? '');
    // Stessa risposta se il numero non esiste: non riveliamo chi è registrato.
    if (!userId) return { ok: true, message: GENERIC_SENT };

    const current = await getAppMetadata(userId);
    const prev = current?.meta.wa_otp as StoredOtp | undefined;
    const now = Date.now();
    if (prev && now - prev.sent < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (now - prev.sent)) / 1000);
      return { ok: false, error: `Attendi ${wait} secondi prima di chiedere un nuovo codice.` };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await patchAppMetadata(userId, {
      wa_otp: { h: hmac(`${userId}:${code}`), exp: now + OTP_TTL_MS, att: 0, sent: now } satisfies StoredOtp,
    });

    const sent = await sendCustomerWhatsAppReminder(
      phone,
      `Barberia Garofalo: il tuo codice di accesso è ${code}. Scade tra 5 minuti. Non condividerlo con nessuno.`
    );
    if (!sent.ok) {
      // WhatsApp non disponibile (es. quota del piano gratuito): mandiamo lo stesso codice via email.
      const byEmail = await sendCodeByEmail(current?.user.email ?? undefined, code);
      if (!byEmail) {
        await patchAppMetadata(userId, { wa_otp: null });
        return { ok: false, error: 'Invio del codice non riuscito. Riprova tra poco o accedi con email e password.' };
      }
    }
    return { ok: true, message: GENERIC_SENT };
  } catch (e) {
    console.error('[otp] request', e);
    return { ok: false, error: 'Servizio momentaneamente non disponibile.' };
  }
}

export async function verifyWhatsAppCode(phone: string, code: string): Promise<Result> {
  try {
    const clean = (code ?? '').replace(/\D/g, '');
    if (clean.length !== 6) return { ok: false, error: 'Il codice ha 6 cifre.' };
    const userId = await findUserIdByPhone(phone ?? '');
    if (!userId) return { ok: false, error: 'Codice non valido o scaduto.' };

    const current = await getAppMetadata(userId);
    const otp = current?.meta.wa_otp as StoredOtp | null | undefined;
    if (!otp || Date.now() > otp.exp) return { ok: false, error: 'Codice scaduto. Chiedine uno nuovo.' };
    if (otp.att >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Troppi tentativi. Chiedi un nuovo codice.' };

    if (!safeEqual(otp.h, hmac(`${userId}:${clean}`))) {
      await patchAppMetadata(userId, { wa_otp: { ...otp, att: otp.att + 1 } });
      const left = OTP_MAX_ATTEMPTS - otp.att - 1;
      return { ok: false, error: left > 0 ? `Codice errato. Tentativi rimasti: ${left}.` : 'Troppi tentativi. Chiedi un nuovo codice.' };
    }

    await patchAppMetadata(userId, { wa_otp: null }); // monouso
    const session = await openSessionFor(userId);
    if (!session.ok) return session;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    console.error('[otp] verify', e);
    return { ok: false, error: 'Servizio momentaneamente non disponibile.' };
  }
}

/* ──────────────────────────────── Passkey ──────────────────────────────── */

interface StoredPasskey {
  id: string; // credential ID (base64url)
  pk: string; // chiave pubblica (base64url)
  c: number; // contatore
  t?: AuthenticatorTransportFuture[];
  n: string; // nome dispositivo
  at: number; // creata il
}

const CHALLENGE_COOKIE = 'gb_pk_chal';

async function setChallenge(kind: 'reg' | 'auth', challenge: string, userId?: string) {
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, sign({ kind, challenge, userId, exp: Date.now() + 5 * 60_000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 300,
  });
}

async function takeChallenge(kind: 'reg' | 'auth') {
  const jar = await cookies();
  const data = unsign<{ kind: string; challenge: string; userId?: string; exp: number }>(jar.get(CHALLENGE_COOKIE)?.value);
  jar.delete(CHALLENGE_COOKIE); // monouso
  if (!data || data.kind !== kind || Date.now() > data.exp) return null;
  return data;
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  return data.user?.id ?? null;
}

function passkeysOf(meta: Record<string, unknown> | undefined): StoredPasskey[] {
  return Array.isArray(meta?.passkeys) ? (meta!.passkeys as StoredPasskey[]) : [];
}

/** Passo 1 della registrazione (utente già loggato). */
export async function passkeyRegistrationOptions() {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: 'Accedi prima di attivare una Passkey.' };
  const current = await getAppMetadata(userId);
  if (!current) return { ok: false as const, error: 'Utente non trovato.' };
  const { rpID, rpName } = await relyingParty();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: current.user.email ?? current.user.phone ?? userId,
    userDisplayName: (current.user.user_metadata?.full_name as string | undefined) ?? current.user.email ?? 'Cliente',
    attestationType: 'none',
    excludeCredentials: passkeysOf(current.meta).map((p) => ({ id: p.id, transports: p.t })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  await setChallenge('reg', options.challenge, userId);
  return { ok: true as const, options };
}

/** Passo 2 della registrazione. */
export async function passkeyRegistrationVerify(response: RegistrationResponseJSON, deviceName?: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    const chal = await takeChallenge('reg');
    if (!userId || !chal || chal.userId !== userId) return { ok: false, error: 'Richiesta scaduta. Riprova.' };
    const { rpID, origin } = await relyingParty();

    const v = await verifyRegistrationResponse({
      response,
      expectedChallenge: chal.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!v.verified || !v.registrationInfo) return { ok: false, error: 'Passkey non verificata.' };

    const { credential } = v.registrationInfo;
    const current = await getAppMetadata(userId);
    const list = passkeysOf(current?.meta).filter((p) => p.id !== credential.id);
    list.push({
      id: credential.id,
      pk: Buffer.from(credential.publicKey).toString('base64url'),
      c: credential.counter,
      t: credential.transports,
      n: (deviceName || 'Dispositivo').slice(0, 60),
      at: Date.now(),
    });
    await patchAppMetadata(userId, { passkeys: list.slice(-10) });
    return { ok: true, message: 'Passkey attivata.' };
  } catch (e) {
    console.error('[passkey] register', e);
    return { ok: false, error: 'Attivazione non riuscita. Riprova.' };
  }
}

/** Passo 1 dell'accesso: nessun nome utente, il dispositivo propone la Passkey. */
export async function passkeyLoginOptions() {
  const { rpID } = await relyingParty();
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred', allowCredentials: [] });
  await setChallenge('auth', options.challenge);
  return options;
}

/** Passo 2 dell'accesso. */
export async function passkeyLoginVerify(response: AuthenticationResponseJSON): Promise<Result> {
  try {
    const chal = await takeChallenge('auth');
    if (!chal) return { ok: false, error: 'Richiesta scaduta. Riprova.' };
    const handle = response.response.userHandle;
    if (!handle) return { ok: false, error: 'Passkey non riconosciuta.' };
    const userId = Buffer.from(handle, 'base64url').toString();

    const current = await getAppMetadata(userId);
    const list = passkeysOf(current?.meta);
    const stored = list.find((p) => p.id === response.id);
    if (!current || !stored) return { ok: false, error: 'Passkey non riconosciuta. Attivala dal tuo profilo.' };

    const { rpID, origin } = await relyingParty();
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: chal.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: stored.id, publicKey: new Uint8Array(Buffer.from(stored.pk, 'base64url')), counter: stored.c, transports: stored.t },
      requireUserVerification: false,
    });
    if (!v.verified) return { ok: false, error: 'Passkey non verificata.' };

    await patchAppMetadata(userId, {
      passkeys: list.map((p) => (p.id === stored.id ? { ...p, c: v.authenticationInfo.newCounter } : p)),
    });
    const session = await openSessionFor(userId);
    if (!session.ok) return session;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    console.error('[passkey] login', e);
    return { ok: false, error: 'Accesso con Passkey non riuscito.' };
  }
}

/** Passkey dell'utente loggato, per il profilo. */
export async function myPasskeys(): Promise<{ id: string; name: string; createdAt: number }[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const current = await getAppMetadata(userId);
  return passkeysOf(current?.meta).map((p) => ({ id: p.id, name: p.n, createdAt: p.at }));
}

export async function removeMyPasskey(id: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Accedi di nuovo.' };
  const current = await getAppMetadata(userId);
  await patchAppMetadata(userId, { passkeys: passkeysOf(current?.meta).filter((p) => p.id !== id) });
  return { ok: true };
}
