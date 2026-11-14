// Accesso con Google, strada di riserva (14/11/2026): quando il pulsante di Google non si apre
// (browser che blocca i cookie di terze parti, app integrate), si va su Google e si torna su /auth/google
// del sito con un id_token. Così Google mostra «barberiagarofalo.it» e non l'indirizzo di Supabase.
// Il ritorno https://barberiagarofalo.it/auth/google va autorizzato nel client OAuth di Google.
import { GOOGLE_CLIENT_ID } from '@/lib/auth/google-client';

const KEY = 'gb-google-redirect';

function hex(buf: ArrayBuffer | Uint8Array) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function startGoogleRedirect(next: string, lang: 'it' | 'en' = 'it') {
  const raw = hex(crypto.getRandomValues(new Uint8Array(16)));
  const state = hex(crypto.getRandomValues(new Uint8Array(16)));
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ raw, state, next }));
  } catch {
    /* senza archivio il ritorno non si può verificare: la pagina di ritorno lo dice */
  }
  const nonce = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google`,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
    state,
    prompt: 'select_account',
    hl: lang,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}

/** Legge il ritorno da Google. null = dati mancanti o non validi. */
export function readGoogleReturn(hash: string): { idToken: string; raw: string; next: string } | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const idToken = h.get('id_token');
  let saved: { raw?: string; state?: string; next?: string } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    sessionStorage.removeItem(KEY);
  } catch {
    saved = null;
  }
  if (!idToken || !saved?.raw || !saved.state || saved.state !== h.get('state')) return null;
  return { idToken, raw: saved.raw, next: saved.next || '/area-cliente/dashboard' };
}
