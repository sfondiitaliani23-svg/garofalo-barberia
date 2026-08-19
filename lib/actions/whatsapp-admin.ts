'use server';

import { requireAdmin } from '@/lib/auth';
import { normalizeItalianPhone } from '@/lib/utils/phone';

function getGreenApiCredentials() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  const url = process.env.GREEN_API_URL || (instanceId ? `https://${instanceId.slice(0, 4)}.api.greenapi.com` : 'https://api.green-api.com');

  if (!instanceId || !token) return null;
  return { instanceId, token, host: url.replace(/\/$/, '') };
}

export type WhatsAppState = 'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting' | 'not_configured' | 'error';

/**
 * Ottiene lo stato di connessione corrente dell'istanza Green API.
 */
export async function getWhatsAppStatusAction(): Promise<{
  ok: boolean;
  state: WhatsAppState;
  instanceId?: string;
  error?: string;
}> {
  await requireAdmin();
  const creds = getGreenApiCredentials();
  if (!creds) {
    return { ok: false, state: 'not_configured', error: 'Green API non configurato nelle variabili d\'ambiente' };
  }

  try {
    const res = await fetch(`${creds.host}/waInstance${creds.instanceId}/getStateInstance/${creds.token}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, state: 'error', error: `Errore server Green API: HTTP ${res.status}` };
    }

    const data = await res.json();
    const state: WhatsAppState = data?.stateInstance || 'notAuthorized';
    return { ok: true, state, instanceId: creds.instanceId };
  } catch (err: any) {
    return { ok: false, state: 'error', error: err?.message || 'Errore di rete con Green API' };
  }
}

/**
 * Recupera il codice QR live (in base64) per collegare WhatsApp.
 */
export async function getWhatsAppQrAction(): Promise<{
  ok: boolean;
  type?: 'qrCode' | 'alreadyAuthorized' | 'error';
  qrBase64?: string;
  error?: string;
}> {
  await requireAdmin();
  const creds = getGreenApiCredentials();
  if (!creds) {
    return { ok: false, error: 'Green API non configurato' };
  }

  try {
    const res = await fetch(`${creds.host}/waInstance${creds.instanceId}/qr/${creds.token}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, error: `Errore richiesta QR: HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data?.type === 'alreadyLogged' || data?.type === 'alreadyAuthorized') {
      return { ok: true, type: 'alreadyAuthorized' };
    }

    if (data?.type === 'qrCode' && data?.message) {
      return { ok: true, type: 'qrCode', qrBase64: data.message };
    }

    return { ok: false, error: data?.message || 'Impossibile generare il QR code al momento' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Errore durante il recupero del QR' };
  }
}

/**
 * Invia un messaggio WhatsApp di test per verificare che la connessione funzioni a dovere.
 */
export async function sendWhatsAppTestMessageAction(phoneNumber: string): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
}> {
  await requireAdmin();
  const creds = getGreenApiCredentials();
  if (!creds) {
    return { ok: false, error: 'Green API non configurato' };
  }

  const normalized = normalizeItalianPhone(phoneNumber) || phoneNumber.replace(/\D/g, '');
  if (!normalized || normalized.length < 9) {
    return { ok: false, error: 'Inserisci un numero di telefono valido' };
  }

  const testMessage =
    `💈 *Garofalo Barberia — Test Notifiche WhatsApp*\n\n` +
    `✅ Connessione stabilita con successo!\n` +
    `Il sistema di promemoria automatici per gli appuntamenti alle 22:30 è ora perfettamente operativo.`;

  try {
    const res = await fetch(`${creds.host}/waInstance${creds.instanceId}/sendMessage/${creds.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${normalized}@c.us`,
        message: testMessage,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Invio fallito: ${errText}` };
    }

    const data = await res.json();
    if (data?.idMessage) {
      return { ok: true, messageId: data.idMessage };
    }

    return { ok: false, error: 'Risposta inattesa da Green API' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Errore durante l\'invio del messaggio di test' };
  }
}

/**
 * Riavvia l'istanza Green API (utile in caso di sessione bloccata).
 */
export async function rebootWhatsAppInstanceAction(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const creds = getGreenApiCredentials();
  if (!creds) return { ok: false, error: 'Green API non configurato' };

  try {
    const res = await fetch(`${creds.host}/waInstance${creds.instanceId}/reboot/${creds.token}`, {
      method: 'GET',
    });
    if (!res.ok) return { ok: false, error: 'Errore riavvio istanza' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Errore di rete' };
  }
}
