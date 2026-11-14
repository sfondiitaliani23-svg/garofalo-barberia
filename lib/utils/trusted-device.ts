// «Ricorda questo dispositivo per 30 giorni» (14/11/2026, richiesta di Eliseo): dopo il codice o la passkey
// il server mette un cookie firmato (httpOnly: il browser non lo legge e non lo può falsificare).
// Vale solo per lo stesso account e serve sempre anche la password. Calcoli puri, senza rete.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const DEVICE_COOKIE = 'gb_dispositivo';
export const DEVICE_DAYS = 30;

function firma(body: string, key: string): string {
  return createHmac('sha256', `gb-dispositivo|${key}`).update(body).digest('hex');
}

/** Valore del cookie: utente.scadenza(ms).firma */
export function signDevice(userId: string, exp: number, key: string): string {
  const body = `${userId}.${exp}`;
  return `${body}.${firma(body, key)}`;
}

/** true solo se il cookie è dello stesso utente, non è scaduto e la firma torna. */
export function verifyDevice(value: string | undefined | null, userId: string, key: string, now: number = Date.now()): boolean {
  if (!value || !userId || !key) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [uid, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (uid !== userId || !Number.isFinite(exp) || exp <= now) return false;
  if (!/^[a-f0-9]{64}$/.test(sig)) return false;
  const giusta = Buffer.from(firma(`${uid}.${expRaw}`, key), 'hex');
  const data = Buffer.from(sig, 'hex');
  return giusta.length === data.length && timingSafeEqual(giusta, data);
}
