'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { ensureProfileForAuthUser } from '@/lib/auth/ensure-profile';

/**
 * Crea una sessione di login QR temporanea nel database.
 */
export async function createQrSession() {
  const supabase = await createServiceClient();
  if (!supabase) return { error: 'Database non configurato' };

  const { data, error } = await supabase
    .from('qr_login_sessions')
    .insert({})
    .select('id')
    .single();

  if (error) {
    console.error('Errore durante la creazione della sessione QR:', error);
    return { error: 'Impossibile inizializzare la sessione QR' };
  }

  return { id: data.id };
}

/**
 * Controlla lo stato della sessione QR dal PC.
 */
export async function checkQrSessionStatus(sessionId: string) {
  const supabase = await createServiceClient();
  if (!supabase) return { status: 'error', error: 'Database non configurato' };

  const { data, error } = await supabase
    .from('qr_login_sessions')
    .select('status, access_token, refresh_token, expires_at')
    .eq('id', sessionId)
    .single();

  if (error) {
    return { status: 'expired' };
  }

  // Sessione scaduta: niente token, e si cancella tutto.
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabase.from('qr_login_sessions').delete().eq('id', sessionId);
    return { status: 'expired' };
  }

  // I token si consegnano UNA volta sola: appena letti, la riga viene cancellata.
  if (data.status === 'authenticated' && data.access_token) {
    await supabase.from('qr_login_sessions').delete().eq('id', sessionId);
  }

  return {
    status: data.status,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Associa i token di autenticazione del telefono alla sessione QR del PC.
 */
export async function authenticateQrSession(
  sessionId: string,
  accessToken: string,
  refreshToken: string
) {
  const supabase = await createServiceClient();
  if (!supabase) return { error: 'Database non configurato' };

  // Verifica la validità dei token dell'utente su Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { error: 'Token utente non valido o sessione scaduta.' };
  }

  // Estrapola e registra il profilo cliente nel database dei clienti (profiles)
  await ensureProfileForAuthUser(user);

  // Aggiorna lo stato della sessione QR a 'authenticated'
  const { error: updateError } = await supabase
    .from('qr_login_sessions')
    .update({
      status: 'authenticated',
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    .eq('id', sessionId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (updateError) {
    console.error('Errore durante l\'aggiornamento della sessione QR:', updateError);
    return { error: 'Errore di collegamento della sessione' };
  }

  return { ok: true };
}
